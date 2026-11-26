import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import InlineError from "../../components/ui/InlineError";
import { Skeleton, SkeletonRegion } from "../../components/ui/Skeleton";
import { useConfirm } from "../../components/ui/toast/useConfirm";
import { toastError, useToast } from "../../components/ui/toast/useToast";
import { useMinimumLoading } from "../../hooks/useApiData";
import { api } from "../../lib/api";
import { buildBarOptions, CHART_COLORS } from "../../lib/chartDefaults";
import styles from "./AdminAssistant.module.css";

const questionGroups = [
    {
        title: "Performance",
        questions: [
            "Why did revenue change this month?",
            "What were our busiest attendance periods?",
        ],
    },
    {
        title: "Members at risk",
        questions: [
            "How many members are at risk of leaving?",
        ],
    },
    {
        title: "What-if",
        questions: [
            "What if I raise the monthly plan by PHP 100?",
        ],
    },
];

const toolLabels = {
    get_kpis_health: "Gym health KPIs",
    get_revenue_trend: "Revenue trend",
    get_attendance_peaks: "Attendance patterns",
    get_membership_distribution: "Active memberships by plan",
    get_retention: "Membership retention",
    get_churn_summary: "Anonymous churn summary",
    get_prediction_snapshots: "Prediction snapshots",
    get_expiring_memberships: "Expiring memberships",
    what_if: "What-if estimate",
};

const renderInlineText = (text) => text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
    part.startsWith("**") && part.endsWith("**")
        ? <strong key={index}>{part.slice(2, -2)}</strong>
        : part
));

const parseAnswer = (content) => {
    const paragraphs = [];
    const lists = [];
    const assumptions = [];
    let paragraph = [];
    let listItems = [];
    let readingAssumptions = false;
    const flushParagraph = () => {
        if (!paragraph.length) return;
        paragraphs.push(paragraph.join(" "));
        paragraph = [];
    };
    const flushList = () => {
        if (!listItems.length) return;
        lists.push(listItems);
        listItems = [];
    };

    content.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.trim();
        const assumptionHeading = line.match(/^assumptions?:?\s*(.*)$/i);
        if (assumptionHeading) {
            flushParagraph();
            flushList();
            readingAssumptions = true;
            if (assumptionHeading[1]) assumptions.push(assumptionHeading[1]);
            return;
        }
        const bullet = line.match(/^[-*•]\s+(.+)$/);
        if (bullet) {
            flushParagraph();
            (readingAssumptions ? assumptions : listItems).push(bullet[1]);
            return;
        }
        flushList();
        if (!line) {
            flushParagraph();
            return;
        }
        if (readingAssumptions) assumptions.push(line.replace(/^#{1,3}\s+/, ""));
        else paragraph.push(line.replace(/^#{1,3}\s+/, ""));
    });
    flushParagraph();
    flushList();
    const firstParagraph = paragraphs.shift() || "";
    const firstSentence = firstParagraph.match(/^(.+?[.!?])(?:\s+)(.+)$/);
    if (firstSentence) paragraphs.unshift(firstSentence[2]);
    return {
        finding: firstSentence ? firstSentence[1] : firstParagraph,
        paragraphs,
        lists,
        assumptions,
    };
};

const formatToolName = (name) => toolLabels[name] || name.replace(/^get_/, "").replace(/_/g, " ");

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
    }).format(date);
};

const formatManilaTime = (value) => new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
}).format(value);

const formatPeriod = (period) => {
    if (!period) return "";
    if (period.start && period.end) {
        const start = formatDate(period.start);
        const end = formatDate(period.end);
        return start === end ? start : `${start} - ${end}`;
    }
    return period.label || "";
};

const formatFigureValue = (value, unit = "") => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Not available";
    if (unit === "PHP") {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            maximumFractionDigits: 2,
        }).format(number);
    }
    const formatted = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(number);
    return unit === "%" ? `${formatted}%` : formatted;
};

function FigureChart({ figure }) {
    const chartData = useMemo(() => ({
        labels: figure.labels,
        datasets: figure.series.map((series, index) => ({
            label: series.label,
            data: series.values,
            backgroundColor: [CHART_COLORS.primary, CHART_COLORS.green, CHART_COLORS.warn][index % 3],
            borderRadius: 3,
        })),
    }), [figure]);
    const chartOptions = useMemo(
        () => buildBarOptions({ count: figure.labels.length }),
        [figure.labels.length],
    );

    return (
        <section className={styles.figurePanel} aria-label={figure.title}>
            <h4>{figure.title}</h4>
            <div className={`fm-chart-box ${styles.chartBox}`}>
                <Bar data={chartData} options={chartOptions} role="img" aria-label={`${figure.title} chart`} />
            </div>
        </section>
    );
}

function AnswerFigures({ figures }) {
    const breakdowns = figures.filter((figure) => figure.type === "breakdown");
    const metricItems = [
        ...figures.filter((figure) => figure.type === "kpis").flatMap((figure) => figure.items || []),
        ...breakdowns.flatMap((figure) => figure.items || []),
    ].slice(0, 6);
    const charts = figures.filter((figure) => figure.type === "trend" && figure.labels?.length);
    const estimates = figures.filter((figure) => figure.type === "estimate");

    if (!metricItems.length && !charts.length && !estimates.length) return null;

    return (
        <div className={styles.figureArea}>
            {metricItems.length > 0 && (
                <div className={styles.metricGrid} aria-label="Metrics from analytics">
                    {metricItems.map((item) => (
                        <div className={styles.metricTile} key={`${item.label}-${item.value}`}>
                            <span>{item.label}</span>
                            <strong>{formatFigureValue(item.value, item.unit)}</strong>
                        </div>
                    ))}
                </div>
            )}
            {charts.map((figure) => <FigureChart figure={figure} key={`${figure.tool}-${figure.title}`} />)}
            {estimates.map((figure) => (
                <section className={styles.figurePanel} key={`${figure.tool}-${figure.title}`} aria-label={`${figure.title}, estimate`}>
                    <div className={styles.figureHeading}>
                        <h4>{figure.title}</h4>
                        <span className={styles.estimateLabel}>Estimate</span>
                    </div>
                    <table className={styles.estimateTable}>
                        <thead>
                            <tr><th scope="col">Low</th><th scope="col">Base</th><th scope="col">High</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{formatFigureValue(figure.range.low, figure.unit)}</td>
                                <td>{formatFigureValue(figure.range.base, figure.unit)}</td>
                                <td>{formatFigureValue(figure.range.high, figure.unit)}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            ))}
        </div>
    );
}

export default function AdminAssistant() {
    const [conversations, setConversations] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [quota, setQuota] = useState(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [loadingConversation, setLoadingConversation] = useState(false);
    const [sending, setSending] = useState(false);
    const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
    const [retryAfterCode, setRetryAfterCode] = useState("");
    const [isNewChat, setIsNewChat] = useState(false);
    const [error, setError] = useState("");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [removingChatId, setRemovingChatId] = useState(null);
    const [isAtLatest, setIsAtLatest] = useState(true);
    const threadRef = useRef(null);
    const composerInputRef = useRef(null);
    const newChatButtonRef = useRef(null);
    const localMessageSequence = useRef(0);
    const isAtLatestRef = useRef(true);
    const copyTimerRef = useRef(null);
    const confirm = useConfirm();
    const toast = useToast();
    const showHistorySkeleton = useMinimumLoading(loading && !historyLoaded);
    const isRateLimited = rateLimitSeconds > 0;

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

    useEffect(() => {
        if (!sending) {
            setElapsedSeconds(0);
            return undefined;
        }
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [sending]);

    useEffect(() => {
        if (!isRateLimited) return undefined;
        const timer = window.setInterval(() => {
            setRateLimitSeconds((remaining) => Math.max(0, remaining - 1));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [isRateLimited]);

    useEffect(() => {
        if (isAtLatestRef.current && threadRef.current) {
            threadRef.current.scrollTo({ top: threadRef.current.scrollHeight });
        }
    }, [messages, sending, loadingConversation]);

    useEffect(() => () => {
        if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    }, []);

    const onThreadScroll = () => {
        const thread = threadRef.current;
        if (!thread) return;
        const atLatest = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 48;
        isAtLatestRef.current = atLatest;
        setIsAtLatest(atLatest);
    };

    const selectConversation = async (id) => {
        setConversationId(id);
        setIsNewChat(false);
        setLoadingConversation(true);
        setHistoryOpen(false);
        isAtLatestRef.current = true;
        setIsAtLatest(true);
        try {
            const result = await api(`/admin/ai/conversations/${id}`);
            setMessages((result.messages || []).map((message) => ({ ...message, ...(message.metadata || {}) })));
        } catch (err) {
            toast.error(toastError(err));
        } finally {
            setLoadingConversation(false);
        }
    };

    const sendMessage = async (message, retryMessageId = null, clearInput = true) => {
        if (!message.trim() || sending || quota?.remainingQuota === 0 || rateLimitSeconds > 0) return;
        const localId = retryMessageId || `local-${Date.now()}-${localMessageSequence.current++}`;
        if (clearInput) setInput("");
        setSending(true);
        setError("");
        isAtLatestRef.current = true;
        setIsAtLatest(true);
        setMessages((current) => retryMessageId
            ? current.map((item) => item.localId === retryMessageId ? { ...item, delivery: "sending" } : item)
            : [...current, { role: "user", content: message.trim(), localId, delivery: "sending" }]);
        try {
            const result = await api("/admin/ai/chat", {
                method: "POST",
                body: { conversationId, message: message.trim() },
            });
            setConversationId(result.conversationId);
            setIsNewChat(false);
            setRateLimitSeconds(0);
            setRetryAfterCode("");
            setQuota({ remainingQuota: result.remainingQuota, dailyLimit: result.dailyLimit });
            setMessages((current) => [
                ...current.map((item) => item.localId === localId ? { ...item, delivery: "sent" } : item),
                {
                    role: "assistant",
                    content: result.answer,
                    toolsUsed: result.toolsUsed,
                    dataAsOf: result.dataAsOf,
                    modelUsed: result.modelUsed,
                    figures: result.figures || [],
                    arrived: true,
                },
            ]);
            setConversations((current) => {
                const existing = current.find((item) => item.id === result.conversationId);
                return [{
                    id: result.conversationId,
                    title: existing?.title || message.trim().slice(0, 80),
                    updated_at: new Date().toISOString(),
                }, ...current.filter((item) => item.id !== result.conversationId)];
            });
        } catch (err) {
            setMessages((current) => current.map((item) => item.localId === localId
                ? { ...item, delivery: "failed" }
                : item));
            if (Number.isSafeInteger(err.remainingQuota)) {
                setQuota((current) => current ? { ...current, remainingQuota: err.remainingQuota } : current);
            }
            if (err.code === "AI_RATE_LIMITED") {
                try {
                    setQuota(await api("/admin/ai/quota"));
                } catch (quotaError) {
                    toast.error(toastError(quotaError));
                }
            }
            if (Number.isSafeInteger(err.retryAfter) && err.retryAfter > 0) {
                setRateLimitSeconds(err.retryAfter);
                setRetryAfterCode(err.code || "");
            }
            toast.error(toastError(err));
        } finally {
            setSending(false);
        }
    };

    const send = (event) => {
        event.preventDefault();
        sendMessage(input);
    };

    const newChat = () => {
        setConversationId(null);
        setIsNewChat(true);
        setMessages([]);
        setInput("");
        setError("");
        isAtLatestRef.current = true;
        setIsAtLatest(true);
    };

    const deleteChat = async () => {
        if (!conversationId || sending) return;
        const targetId = conversationId;
        const confirmed = await confirm({
            title: "Delete conversation?",
            message: "This permanently removes the selected assistant conversation.",
            confirmLabel: "Delete",
            danger: true,
        });
        if (!confirmed) return;
        try {
            await api(`/admin/ai/conversations/${targetId}`, { method: "DELETE" });
            setRemovingChatId(targetId);
            window.setTimeout(() => {
                setConversations((current) => current.filter((item) => item.id !== targetId));
                setRemovingChatId(null);
            }, 180);
            newChat();
            newChatButtonRef.current?.focus();
        } catch (err) {
            toast.error(toastError(err));
        }
    };

    const copy = async (messageId, content) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(messageId);
            if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
            copyTimerRef.current = window.setTimeout(() => setCopiedMessageId(null), 1500);
            toast.success("Answer copied.");
        } catch {
            toast.error("Could not copy the answer.");
        }
    };

    const activeTitle = useMemo(
        () => conversations.find((item) => item.id === conversationId)?.title || "New conversation",
        [conversations, conversationId],
    );
    const usedQuota = quota ? Math.max(0, quota.dailyLimit - quota.remainingQuota) : 0;
    const quotaPercent = quota?.dailyLimit ? Math.min(100, (usedQuota / quota.dailyLimit) * 100) : 0;
    const quotaIsNearLimit = quotaPercent >= 80;
    const composerDisabled = sending || quota?.remainingQuota === 0 || isRateLimited;
    const rateLimitResetAt = rateLimitSeconds > 0 ? formatManilaTime(new Date(Date.now() + rateLimitSeconds * 1000)) : "";

    return (
        <div className={styles.page}>
            <div className={styles.pageHeading}>
                <div>
                    <h1 className={styles.pageTitle}>AI Assistant</h1>
                    <p className={styles.pageDesc}>Aggregate gym analysis using the same definitions as your reports.</p>
                </div>
                <div className={styles.pageActions}>
                    <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={newChat}
                        disabled={sending}
                        ref={newChatButtonRef}
                    >
                        <i className="fa-solid fa-plus" aria-hidden="true"></i> New chat
                    </button>
                    <button
                        className={styles.dangerButton}
                        type="button"
                        onClick={deleteChat}
                        disabled={!conversationId || sending}
                    >
                        <i className="fa-regular fa-trash-can" aria-hidden="true"></i> Delete
                    </button>
                </div>
            </div>

            {error && <InlineError error={error} onRetry={loadHistory} />}

            <div className={styles.layout}>
                <aside className={styles.history} aria-label="Conversation history">
                    <div className={styles.historyHeading}>
                        <span>Conversations</span>
                        <span className={styles.count}>{conversations.length}</span>
                    </div>
                    <button
                        className={styles.historyToggle}
                        type="button"
                        aria-expanded={historyOpen}
                        aria-controls="assistant-history-list"
                        onClick={() => setHistoryOpen((open) => !open)}
                    >
                        <span>Conversations <span className={styles.count}>{conversations.length}</span></span>
                        <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
                    </button>
                    <div id="assistant-history-list" className={`${styles.historyList} ${historyOpen ? "" : styles.collapsed}`}>
                        {showHistorySkeleton ? (
                            <SkeletonRegion label="Loading conversations" className={styles.historySkeleton}>
                                {[1, 2, 3].map((item) => (
                                    <div className={styles.historySkeletonItem} key={item}>
                                        <Skeleton h={14} w="78%" />
                                        <Skeleton h={11} w="34%" />
                                    </div>
                                ))}
                            </SkeletonRegion>
                        ) : conversations.length ? conversations.map((item) => (
                            <button
                                className={`${styles.historyItem} ${item.id === conversationId ? styles.selected : ""} ${item.id === removingChatId ? styles.removing : ""}`}
                                type="button"
                                key={item.id}
                                onClick={() => selectConversation(item.id)}
                                disabled={sending || loadingConversation || item.id === removingChatId}
                            >
                                <strong>{item.title || "Untitled conversation"}</strong>
                                <small>{formatDate(item.updated_at)}</small>
                            </button>
                        )) : <p className={styles.muted}>No conversations yet.</p>}
                    </div>
                </aside>

                <section className={styles.chatCard} aria-label="AI assistant conversation">
                    <div className={styles.chatHeader}>
                        <div>
                            <strong>{activeTitle}</strong>
                            <small>Private admin analysis · aggregate data only</small>
                        </div>
                        <span className={styles.headerLabel}>Analytics workspace</span>
                    </div>

                    <div
                        className={styles.thread}
                        ref={threadRef}
                        onScroll={onThreadScroll}
                        aria-live="polite"
                        aria-busy={loadingConversation}
                    >
                        {loadingConversation || (loading && !historyLoaded) ? (
                            <SkeletonRegion label="Loading conversation" className={styles.threadSkeleton}>
                                <div className={styles.questionSkeleton}><Skeleton h={12} w="55%" /></div>
                                <div className={styles.answerSkeleton}>
                                    <Skeleton h={15} w="72%" />
                                    <Skeleton h={12} w="88%" />
                                    <Skeleton h={12} w="76%" />
                                </div>
                            </SkeletonRegion>
                        ) : !messages.length ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyHeading}>
                                    <span className={styles.eyebrow}>ANALYTICS ASSISTANT</span>
                                    <h2>Start with a question</h2>
                                    <p>The assistant can read approved aggregate gym metrics. It cannot see member names, contact details, or payment references.</p>
                                </div>
                                <div className={styles.questionGroups}>
                                    {questionGroups.map((group) => (
                                        <section className={styles.questionGroup} key={group.title}>
                                            <h3>{group.title}</h3>
                                            {group.questions.map((question) => (
                                                <button
                                                    className={styles.exampleQuestion}
                                                    key={question}
                                                    type="button"
                                                    onClick={() => {
                                                        setInput(question);
                                                        composerInputRef.current?.focus();
                                                    }}
                                                >
                                                    <span>{question}</span>
                                                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                                                </button>
                                            ))}
                                        </section>
                                    ))}
                                </div>
                            </div>
                        ) : messages.map((message, index) => {
                            const messageId = message.localId || message.id || `${message.created_at || "message"}-${index}`;
                            if (message.role === "user") {
                                return (
                                    <div className={styles.questionRow} key={messageId}>
                                        <div className={styles.questionLabel}>Question</div>
                                        <p>{message.content}</p>
                                        {message.delivery === "sending" && (
                                            <span className={styles.deliveryStatus} role="status">
                                                {elapsedSeconds > 0 ? "Working" : "Sending"}
                                            </span>
                                        )}
                                        {message.delivery === "failed" && (
                                            <div className={styles.failedState}>
                                                <span><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> Not sent</span>
                                                <button
                                                    type="button"
                                                    className={styles.retryButton}
                                                    onClick={() => sendMessage(message.content, message.localId, false)}
                                                    disabled={sending || quota?.remainingQuota === 0 || isRateLimited}
                                                    aria-label="Retry sending question"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            const answer = parseAnswer(message.content || "");
                            const estimateAssumptions = (message.figures || [])
                                .filter((figure) => figure.type === "estimate" && figure.assumptions)
                                .map((figure) => figure.assumptions);
                            const assumptions = answer.assumptions.length ? answer.assumptions : estimateAssumptions;
                            const periods = [...new Set((message.figures || []).map((figure) => formatPeriod(figure.period)).filter(Boolean))];
                            return (
                                <article className={`${styles.answerBlock} ${message.arrived ? "fm-fade-in" : ""}`} key={messageId}>
                                    <div className={styles.finding}>
                                        <span className={styles.findingLabel}>Finding</span>
                                        {answer.finding
                                            ? <p>{renderInlineText(answer.finding)}</p>
                                            : <p>Analysis received.</p>}
                                    </div>
                                    {answer.paragraphs.length > 0 && (
                                        <div className={styles.supportingText}>
                                            {answer.paragraphs.map((paragraph, paragraphIndex) => (
                                                <p key={`paragraph-${paragraphIndex}`}>{renderInlineText(paragraph)}</p>
                                            ))}
                                        </div>
                                    )}
                                    {answer.lists.map((items, listIndex) => (
                                        <ul className={styles.answerList} key={`list-${listIndex}`}>
                                            {items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineText(item)}</li>)}
                                        </ul>
                                    ))}
                                    {assumptions.length > 0 && (
                                        <div className={styles.assumptions}>
                                            <strong>Assumptions</strong>
                                            <ul>{assumptions.map((item, itemIndex) => <li key={itemIndex}>{renderInlineText(item)}</li>)}</ul>
                                        </div>
                                    )}

                                    <AnswerFigures figures={message.figures || []} />

                                    <div className={styles.answerFooter}>
                                        <div className={styles.basedOn}>
                                            <strong>Based on</strong>
                                            {message.toolsUsed?.length
                                                ? <span>{message.toolsUsed.map(formatToolName).join(", ")}</span>
                                                : <span>Tool data not returned</span>}
                                            <span>Period: {periods.length ? periods.join("; ") : "not returned"}</span>
                                            {message.dataAsOf && <span>Data as of {formatDate(message.dataAsOf)}</span>}
                                        </div>
                                        <div className={styles.answerActions}>
                                            {message.modelUsed && (
                                                <details className={styles.modelDetails}>
                                                    <summary>Details</summary>
                                                    <span>Model: {message.modelUsed}</span>
                                                </details>
                                            )}
                                            <button
                                                className={styles.copyButton}
                                                type="button"
                                                onClick={() => copy(messageId, message.content)}
                                                aria-label={copiedMessageId === messageId ? "Answer copied" : "Copy answer"}
                                                title={copiedMessageId === messageId ? "Copied" : "Copy answer"}
                                            >
                                                <i className={`fa-regular ${copiedMessageId === messageId ? "fa-circle-check" : "fa-copy"}`} aria-hidden="true"></i>
                                                <span>{copiedMessageId === messageId ? "Copied" : "Copy"}</span>
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}

                        {sending && (
                            <div className={styles.progressBlock} role="status" aria-live="polite">
                                <span className={styles.progressSpinner} aria-hidden="true"></span>
                                <div>
                                    <strong>{elapsedSeconds > 0 ? "Reading analytics..." : "Sending question..."}</strong>
                                    <small>Live tool steps are not provided; used metrics appear with the answer.</small>
                                </div>
                            </div>
                        )}
                        {!isAtLatest && (
                            <button
                                className={styles.jumpButton}
                                type="button"
                                onClick={() => {
                                    threadRef.current?.scrollTo({
                                        top: threadRef.current.scrollHeight,
                                        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                                    });
                                    isAtLatestRef.current = true;
                                    setIsAtLatest(true);
                                }}
                            >
                                Jump to latest
                            </button>
                        )}
                    </div>

                    <form className={styles.composer} onSubmit={send}>
                        {quota && (
                            <div className={`${styles.quotaMeter} ${quotaIsNearLimit ? styles.quotaNearLimit : ""} ${quota.remainingQuota === 0 ? styles.quotaExhausted : ""}`}>
                                <div className={styles.quotaLabel}>
                                    <span>{usedQuota} of {quota.dailyLimit} questions today</span>
                                    <span>{quota.remainingQuota} remaining</span>
                                </div>
                                <div
                                    className={styles.quotaTrack}
                                    role="meter"
                                    aria-label="Daily assistant questions used"
                                    aria-valuemin={0}
                                    aria-valuemax={quota.dailyLimit}
                                    aria-valuenow={usedQuota}
                                >
                                    <span style={{ width: `${quotaPercent}%` }}></span>
                                </div>
                            </div>
                        )}
                        {quota?.remainingQuota === 0 && (
                            <p className={styles.quotaNotice}>Daily question limit reached. Resets at midnight (Asia/Manila).</p>
                        )}
                        {rateLimitSeconds > 0 && quota?.remainingQuota !== 0 && (
                            <p className={styles.quotaNotice}>
                                {retryAfterCode === "AI_BUSY"
                                    ? `Assistant busy. Try again at ${rateLimitResetAt} (Asia/Manila).`
                                    : `${quota ? `${quota.remainingQuota} questions remain. ` : ""}Request limit resets at ${rateLimitResetAt} (Asia/Manila).`}
                            </p>
                        )}
                        <div className={styles.composerRow}>
                            <input
                                ref={composerInputRef}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                maxLength={2000}
                                placeholder="Ask a question about gym performance..."
                                aria-label="Message"
                                aria-describedby="assistant-privacy-note assistant-quota-note"
                                disabled={composerDisabled}
                            />
                            <button type="submit" disabled={!input.trim() || composerDisabled} aria-label="Send message">
                                {sending
                                    ? <span className={styles.buttonSpinner} aria-hidden="true"></span>
                                    : <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>}
                            </button>
                        </div>
                        <p className={styles.privacyNote} id="assistant-privacy-note">Aggregate gym metrics only. Do not enter member names, contact details, or payment references.</p>
                        <span className={styles.srOnly} id="assistant-quota-note">
                            {quota?.remainingQuota === 0 ? "The daily question limit has been reached and the composer is disabled." : ""}
                        </span>
                    </form>
                </section>
            </div>
        </div>
    );
}
