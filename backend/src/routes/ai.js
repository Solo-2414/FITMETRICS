import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { chatWithAssistant } from '../services/aiAssistant.js';
import { getAIConfig, assertAIConfigured } from '../services/ai/config.js';
import { adminAnswerCache, adminQuestionCacheKey } from '../services/ai/cache.js';
import { aiQuota } from '../services/ai/quota.js';

const router = Router();
router.use('/admin/ai', requireAuth, requireRole('admin'));
const limiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: () => getAIConfig().adminDailyLimit,
  handler: (_req, res) => res.status(429).json({
    error: 'AI assistant quota reached. Please try again later.',
    code: 'AI_RATE_LIMITED',
  }),
});
const MAX_HISTORY = 20;
const validateText = (value) => {
  const maxLength = getAIConfig().maxInputChars;
  if (typeof value !== 'string' || value.trim().length < 1 || value.length > maxLength) {
    throw Object.assign(new Error(`Message must be 1-${maxLength} characters.`), { statusCode: 422 });
  }
  return value.trim();
};

const loadConversation = async (id, userId) => {
  if (!id) return null;
  const { data, error } = await supabaseAdmin.from('chatbot_conversations').select('id, user_id, title, created_at, updated_at, conversation_scope').eq('id', id).eq('user_id', userId).eq('conversation_scope', 'admin').maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  return data;
};

router.get('/admin/ai/conversations', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('chatbot_conversations').select('id, title, created_at, updated_at').eq('user_id', req.user.id).order('updated_at', { ascending: false }).limit(50);
    if (error) return next(error);
    res.json({ conversations: data || [] });
  } catch (error) { next(error); }
});

router.get('/admin/ai/conversations/:id', async (req, res, next) => {
  try {
    const conversation = await loadConversation(req.params.id, req.user.id);
    const { data, error } = await supabaseAdmin.from('chatbot_messages').select('id, role, content, created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(100);
    if (error) return next(error);
    res.json({ conversation, messages: data || [] });
  } catch (error) { next(error); }
});

router.delete('/admin/ai/conversations/:id', async (req, res, next) => {
  try {
    const conversation = await loadConversation(req.params.id, req.user.id);
    const { error } = await supabaseAdmin.from('chatbot_conversations').delete().eq('id', conversation.id).eq('user_id', req.user.id);
    if (error) return next(error);
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action: 'admin_ai_conversation_deleted', entity_type: 'chatbot_conversation', entity_id: conversation.id, details: {} });
    if (auditError) return next(auditError);
    res.status(204).end();
  } catch (error) { next(error); }
});

router.post('/admin/ai/chat', limiter, async (req, res, next) => {
  try {
    const userText = validateText(req.body?.message);
    const config = assertAIConfigured();
    const usage = await aiQuota.consume({
      userId: req.user.id,
      role: 'admin',
      dailyLimit: config.adminDailyLimit,
    });
    let conversation = await loadConversation(req.body?.conversationId, req.user.id);
    if (!conversation) {
      const created = await supabaseAdmin.from('chatbot_conversations').insert({ user_id: req.user.id, title: userText.slice(0, 80), conversation_scope: 'admin' }).select('id, user_id, title, created_at, updated_at, conversation_scope').single();
      if (created.error) return next(created.error);
      conversation = created.data;
    }

    const historyResult = await supabaseAdmin.from('chatbot_messages').select('role, content').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(MAX_HISTORY);
    if (historyResult.error) return next(historyResult.error);
    const history = (historyResult.data || []).reverse();
    const savedUser = await supabaseAdmin.from('chatbot_messages').insert({ conversation_id: conversation.id, role: 'user', content: userText });
    if (savedUser.error) return next(savedUser.error);

    const cacheKey = adminQuestionCacheKey(history, userText);
    const cachedResult = adminAnswerCache.get(cacheKey);
    let result = cachedResult;
    if (!cachedResult) {
      result = await chatWithAssistant({ messages: history, userText });
      adminAnswerCache.set(cacheKey, result);
    }
    const savedAssistant = await supabaseAdmin.from('chatbot_messages').insert({ conversation_id: conversation.id, role: 'assistant', content: result.answer });
    if (savedAssistant.error) return next(savedAssistant.error);
    const updated = await supabaseAdmin.from('chatbot_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversation.id);
    if (updated.error) return next(updated.error);
    if (!cachedResult && result.tokensUsed > 0) {
      await aiQuota.addTokens({ userId: req.user.id, role: 'admin', usageDay: usage.usageDay, tokens: result.tokensUsed });
    }
    const { error: auditError } = await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action: 'admin_ai_chat_completed', entity_type: 'chatbot_conversation', entity_id: conversation.id, details: { tool_count: result.toolsUsed.length, tools: [...new Set(result.toolsUsed)] } });
    if (auditError) return next(auditError);
    res.json({ conversationId: conversation.id, answer: result.answer, toolsUsed: [...new Set(result.toolsUsed)], dataAsOf: result.dataAsOf, modelUsed: result.modelUsed });
  } catch (error) { next(error); }
});

export default router;
