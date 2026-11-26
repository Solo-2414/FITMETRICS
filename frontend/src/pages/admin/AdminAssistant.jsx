import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InlineError from "../../components/ui/InlineError";
import { Skeleton, SkeletonRegion } from "../../components/ui/Skeleton";
import { useConfirm } from "../../components/ui/toast/useConfirm";
import { useToast } from "../../components/ui/toast/useToast";
import { useMinimumLoading } from "../../hooks/useApiData";
import { api, getFriendlyError } from "../../lib/api";
import styles from "./AdminAssistant.module.css";

const suggestions = [
    "Why did revenue change this month?",
    "How many members are at risk of leaving?",
    "What are our busiest attendance periods?",
    "What if I raise the monthly plan by PHP 100?",
];

export default function AdminAssistant() {
    const [conversations, setConversations] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [quota, setQuota] = useState(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [sending, setSending] = useState(false);
    const [isNewChat, setIsNewChat] = useState(false);
    const [error, setError] = useState("");
    const threadRef = useRef(null);
    const confirm = useConfirm();
    const toast = useToast();
    const showHistorySkeleton = useMinimumLoading(loading && !historyLoaded);

    const loadHistory = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [result, quotaResult] = await Promise.all([
                api("/admin/ai/conversations"),
                api("/admin/ai/quota"),
            ]);
            setConversations(result.conversations || []);
            setQuota(quotaResult);
            if (isNewChat) return;
            if (conversationId && result.conversations?.some((item) => item.id === conversationId)) return;
            if (result.conversations?.[0]) {
                const detail = await api(`/admin/ai/conversations/${result.conversations[0].id}`);
                setConversationId(detail.conversation.id);
                setMessages((detail.messages || []).map((message) => ({ ...message, ...(message.metadata || {}) })));
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
            setHistoryLoaded(true);
        }
    }, [conversationId, isNewChat]);

    useEffect(() => {
        const timer = window.setTimeout(() => { loadHistory(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadHistory]);
    useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }); }, [messages, sending]);

    const selectConversation = async (id) => {
        setConversationId(id);
        setIsNewChat(false);
        setMessages([]);
        try {
            const result = await api(`/admin/ai/conversations/${id}`);
            setMessages((result.messages || []).map((message) => ({ ...message, ...(message.metadata || {}) })));
        } catch (err) {
            toast.error(getFriendlyError(err));
        }
    };

    const send = async (event) => {
        event?.preventDefault();
        const message = input.trim();
        if (!message || sending) return;
        setInput("");
        setSending(true);
        setError("");
        setMessages((current) => [...current, { role: "user", content: message }]);
        try {
            const result = await api("/admin/ai/chat", { method: "POST", body: { conversationId, message } });
            setConversationId(result.conversationId);
            setIsNewChat(false);
            setQuota({ remainingQuota: result.remainingQuota, dailyLimit: result.dailyLimit });
            setMessages((current) => [...current, { role: "assistant", content: result.answer, toolsUsed: result.toolsUsed, dataAsOf: result.dataAsOf, modelUsed: result.modelUsed }]);
            await loadHistory();
        } catch (err) {
            setMessages((current) => current.slice(0, -1));
            if (Number.isSafeInteger(err.remainingQuota)) {
                setQuota((current) => current ? { ...current, remainingQuota: err.remainingQuota } : current);
            }
            toast.error(getFriendlyError(err));
        } finally {
            setSending(false);
        }
    };

    const newChat = () => {
        setConversationId(null);
        setIsNewChat(true);
        setMessages([]);
        setInput("");
        setError("");
    };

    const deleteChat = async () => {
        if (!conversationId) return;
        const confirmed = await confirm({ title: "Delete conversation?", message: "This permanently removes the selected assistant conversation.", confirmLabel: "Delete", danger: true });
        if (!confirmed) return;
        try {
            await api(`/admin/ai/conversations/${conversationId}`, { method: "DELETE" });
            newChat();
        } catch (err) {
            toast.error(getFriendlyError(err));
        }
    };

    const copy = async (content) => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success("Answer copied.");
        } catch {
            toast.error("Could not copy the answer.");
        }
    };

    const activeTitle = useMemo(() => conversations.find((item) => item.id === conversationId)?.title || "New conversation", [conversations, conversationId]);

    return (
        <div className={styles.page}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
                <div>
                    <h1 className={styles.pageTitle}>AI Assistant</h1>
                    <p className={styles.pageDesc}>Ask about gym performance using the same analytics definitions as your reports.</p>
                </div>
                <div className="d-flex gap-2">
                    <button className={styles.secondaryButton} type="button" onClick={newChat}><i className="fa-solid fa-plus"></i> New chat</button>
                    <button className={styles.dangerButton} type="button" onClick={deleteChat} disabled={!conversationId}><i className="fa-regular fa-trash-can"></i> Delete</button>
                </div>
            </div>
            {error && <InlineError error={error} onRetry={loadHistory} />}
            <div className={styles.layout}>
                <aside className={styles.history}>
                    <div className={styles.sectionHeader}><span>Conversations</span><span className={styles.count}>{conversations.length}</span></div>
                    {showHistorySkeleton ? <SkeletonRegion label="Loading conversations"><div className="d-flex flex-column">{[1, 2, 3].map((item) => <div className={styles.historyItem} key={item}><Skeleton h={15} w="80%" /><Skeleton h={13} w="30%" /></div>)}</div></SkeletonRegion> : conversations.length ? conversations.map((item) => (
                        <button className={`${styles.historyItem} ${item.id === conversationId ? styles.selected : ""}`} type="button" key={item.id} onClick={() => selectConversation(item.id)}>
                            <strong>{item.title || "Untitled conversation"}</strong>
                            <small>{new Date(item.updated_at).toLocaleDateString()}</small>
                        </button>
                    )) : <p className={styles.muted}>No conversations yet.</p>}
                </aside>
                <section className={styles.chatCard} aria-label="AI assistant conversation">
                    <div className={styles.chatHeader}>
                        <div><strong>{activeTitle}</strong><small>Private admin analysis{quota ? ` · ${quota.remainingQuota} requests left today` : ""}</small></div>
                        <i className="fa-solid fa-robot" aria-hidden="true"></i>
                    </div>
                    <div className={styles.thread} ref={threadRef}>
                        {!messages.length && <div className={styles.welcome}><i className="fa-solid fa-sparkles"></i><h2>What would you like to understand?</h2><p>Numbers come from approved aggregate analytics. Avoid entering member names, contact details, or payment references.</p><div className={styles.suggestions}>{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setInput(suggestion)}>{suggestion}</button>)}</div></div>}
                        {messages.map((message, index) => <div className={`${styles.messageRow} ${message.role === "user" ? styles.userRow : ""}`} key={`${message.created_at || "local"}-${index}`}><div className={styles.message}><div className={styles.messageContent}>{message.content}</div>{message.role === "assistant" && <div className={styles.messageMeta}>{message.toolsUsed?.length ? <span>Sources: {message.toolsUsed.join(", ")}</span> : null}{message.dataAsOf ? <span>Data as of {message.dataAsOf}</span> : null}{message.modelUsed ? <span>Model: {message.modelUsed}</span> : null}<button type="button" onClick={() => copy(message.content)} aria-label="Copy answer"><i className="fa-regular fa-copy"></i></button></div>}</div></div>)}
                        {sending && <div className={styles.typing} role="status"><span></span><span></span><span></span> Assistant is checking metrics...</div>}
                    </div>
                    <form className={styles.composer} onSubmit={send}><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} placeholder="Ask a question about the gym..." aria-label="Message" /><button type="submit" disabled={!input.trim() || sending} aria-label="Send message"><i className="fa-solid fa-paper-plane"></i></button></form>
                </section>
            </div>
        </div>
    );
}
