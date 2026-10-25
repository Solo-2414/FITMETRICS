import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { VIDEO_CATEGORIES, durationLabel, parseDuration, parseVideoUrl } from '../lib/video.js';

const router = Router();
router.use('/admin', requireAuth, requireRole('admin'));
router.use('/member', requireAuth, requireRole('member'));

const UUID = /^[0-9a-f-]{36}$/i;
const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);
const VISIBILITIES = new Set(['public', 'hidden']);

function filters(query, onlyPublic = false) {
  const category = query.category && query.category !== 'all' ? String(query.category) : null;
  const search = query.search ? String(query.search).trim() : null;
  if (category && !VIDEO_CATEGORIES.includes(category)) throw new Error('Invalid video category.');
  return { category, search, onlyPublic };
}

function response(video) {
  const parsed = parseVideoUrl(video.video_url);
  return { ...video, provider: parsed.provider, embedUrl: parsed.embedUrl, thumbnailUrl: parsed.thumbnailUrl, durationLabel: durationLabel(video.duration_seconds) };
}

function validateBody(body, partial = false) {
  const updates = {};
  if (!partial || Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || body.title.trim().length < 3 || body.title.trim().length > 120) throw new Error('Title must be 3-120 characters.');
    updates.title = body.title.trim();
  }
  if (!partial || Object.hasOwn(body, 'category')) {
    if (!VIDEO_CATEGORIES.includes(body.category)) throw new Error('Select a valid video category.');
    updates.category = body.category;
  }
  if (!partial || Object.hasOwn(body, 'difficulty')) {
    if (body.difficulty !== null && body.difficulty !== '' && !DIFFICULTIES.has(body.difficulty)) throw new Error('Select a valid difficulty.');
    updates.difficulty = body.difficulty || null;
  }
  if (!partial || Object.hasOwn(body, 'duration')) updates.duration_seconds = parseDuration(body.duration);
  if (!partial || Object.hasOwn(body, 'video_url')) {
    const parsed = parseVideoUrl(body.video_url);
    updates.video_url = body.video_url.trim();
    updates.thumbnail_url = parsed.thumbnailUrl;
  }
  if (!partial || Object.hasOwn(body, 'visibility')) {
    if (!VISIBILITIES.has(body.visibility)) throw new Error('Select a valid visibility.');
    updates.visibility = body.visibility;
  }
  return updates;
}

async function audit(req, action, id, details) {
  const { error } = await supabaseAdmin.from('audit_log').insert({ actor_id: req.user.id, action, entity_type: 'video_tutorial', entity_id: id, details });
  if (error) throw error;
}

router.get('/admin/videos', async (req, res, next) => {
  try {
    const { category, search } = filters(req.query);
    let query = supabaseAdmin.from('video_tutorials').select('*').order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    if (req.query.visibility) {
      if (!VISIBILITIES.has(String(req.query.visibility))) throw new Error('Invalid video visibility.');
      query = query.eq('visibility', req.query.visibility);
    }
    if (search) query = query.ilike('title', `%${search}%`);
    const { data, error } = await query;
    if (error) return next(error);
    res.json((data || []).map(response));
  } catch (error) { next(error); }
});

router.post('/admin/videos', async (req, res, next) => {
  try {
    const values = validateBody(req.body || {});
    const { data, error } = await supabaseAdmin.from('video_tutorials').insert({ ...values, created_by: req.user.id }).select().single();
    if (error) return next(error);
    await audit(req, 'video_created', data.id, { title: data.title, category: data.category });
    res.status(201).json(response(data));
  } catch (error) { next(error); }
});

router.patch('/admin/videos/:id', async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'Invalid video id.' });
    const values = validateBody(req.body || {}, true);
    const { data, error } = await supabaseAdmin.from('video_tutorials').update(values).eq('id', req.params.id).select().single();
    if (error) return next(error);
    await audit(req, 'video_updated', data.id, { changes: Object.keys(values) });
    res.json(response(data));
  } catch (error) { next(error); }
});

router.delete('/admin/videos/:id', async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'Invalid video id.' });
    const { data, error } = await supabaseAdmin.from('video_tutorials').delete().eq('id', req.params.id).select('id').single();
    if (error) return next(error);
    await audit(req, 'video_deleted', data.id, {});
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/member/videos', async (req, res, next) => {
  try {
    const { category, search } = filters(req.query, true);
    let query = supabaseAdmin.from('video_tutorials').select('id, title, category, difficulty, duration_seconds, video_url, thumbnail_url, created_at').eq('visibility', 'public').order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    if (search) query = query.ilike('title', `%${search}%`);
    const { data, error } = await query;
    if (error) return next(error);
    res.json((data || []).map(response));
  } catch (error) { next(error); }
});

export default router;
