/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { SkeletonNotificationRows } from "../../components/ui/Skeleton";
import styles from "./ClerkNotifications.module.css";
import InlineError from "../../components/ui/InlineError";
import { useNavigate } from "react-router-dom";

const tabs = [
    ["all", "All Notifications"], ["membership_expiry", "Expiring Memberships"],
    ["registration", "New Registrations"], ["payment", "Payments & Renewals"], ["announcement", "Gym Notices"],
];
const relativeTime = (value) => {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};
const groupLabel = (value) => {
    const format = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(date);
    const date = new Date(value);
    const today = new Date();
    const days = Math.floor((new Date(`${format(today)}T00:00:00`) - new Date(`${format(date)}T00:00:00`)) / 86400000);
    return days === 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
};
const iconFor = (type) => type === "payment" ? "fa-money-bill" : type === "announcement" ? "fa-bullhorn" : type === "registration" ? "fa-user-plus" : "fa-bell";

export default function ClerkNotifications() {
    const [activeTab, setActiveTab] = useState("all");
    const [state, setState] = useState({ rows: [], counts: {}, hasMore: false });
    const [page, setPage] = useState(1);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const abortRef = useRef(null);
    const navigate = useNavigate();
    const load = useCallback(async (nextPage = 1, append = false) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        if (append) setLoadingMore(true); else setLoading(true);
        try {
            const result = await api(`/clerk/notifications?type=${activeTab}&page=${nextPage}&limit=20`, { signal: controller.signal });
            if (controller.signal.aborted) return;
            setState((current) => ({ ...result, rows: append ? [...current.rows, ...result.rows] : result.rows }));
            setError("");
        } catch (err) {
            if (err.name !== "AbortError") setError(err.message);
        } finally {
            if (!controller.signal.aborted) { setLoading(false); setLoadingMore(false); }
        }
    }, [activeTab]);
    useEffect(() => {
        setPage(1); load();
        const onChanged = () => load();
        window.addEventListener("fitmetrics:notifications-changed", onChanged);
        return () => { abortRef.current?.abort(); window.removeEventListener("fitmetrics:notifications-changed", onChanged); };
    }, [load]);
    const markRead = async (id) => {
        try { await api(`/clerk/notifications/${id}`, { method: "PATCH" }); setState((current) => ({ ...current, rows: current.rows.map((row) => row.id === id ? { ...row, read_at: new Date().toISOString() } : row) })); window.dispatchEvent(new Event("fitmetrics:notifications-changed")); } catch (err) { setError(err.message); }
    };
    const markAll = async () => {
        try { await api("/clerk/notifications", { method: "PATCH", body: { type: activeTab } }); setState((current) => ({ ...current, rows: current.rows.map((row) => ({ ...row, read_at: new Date().toISOString() })) })); window.dispatchEvent(new Event("fitmetrics:notifications-changed")); } catch (err) { setError(err.message); }
    };
    const grouped = useMemo(() => state.rows.reduce((groups, item) => { const key = groupLabel(item.created_at); (groups[key] ||= []).push(item); return groups; }, {}), [state.rows]);
    const unread = state.unread_by_type || {};
    return <>
        {error && <InlineError error={error} onRetry={() => load()} />}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
            <div><h1 className={styles.pageTitle}>Notifications</h1><p className={styles.pageDesc}>Important front desk reminders, member registrations, and gym updates</p></div>
            <button className={styles.btnMarkRead} disabled={!state.counts?.unread || loading} onClick={markAll}><i className="fa-solid fa-check-double"></i> Mark {activeTab === "all" ? "all" : "these"} as read</button>
        </div>
        <div className={styles.tabsContainer}><div className={styles.tabsScroll}>{tabs.map(([key, label]) => <button key={key} className={`${styles.tabBtn} ${activeTab === key ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab(key)}>{label} <span className={styles.badgeMuted}>{key === "all" ? state.counts?.unread || 0 : unread[key] || 0}</span></button>)}</div></div>
        {loading && <SkeletonNotificationRows rows={6} />}
        {!loading && Object.entries(grouped).map(([group, rows]) => <section key={group}><h3 className="text-secondary mt-4 mb-2">{group}</h3>{rows.map((item) => <div className={styles.listCard} key={item.id} style={{ opacity: item.read_at ? 0.7 : 1 }} onClick={async () => { if (!item.read_at) await markRead(item.id); navigate(item.link || "/clerk/notification"); }} role="button" tabIndex={0}><div className="d-flex align-items-start gap-3"><div className={styles.iconBoxPrimary}><i className={`fa-solid ${iconFor(item.type)}`}></i></div><div className="flex-grow-1"><h4 className={styles.cardTitle}>{item.title}</h4><p className={styles.cardDesc}>{item.message}</p><span className={styles.cardMetaText}>{relativeTime(item.created_at)}</span></div>{!item.read_at && <button className={styles.btnActionOutlineSmall} onClick={(event) => { event.stopPropagation(); markRead(item.id); }}>Mark read</button>}</div></div>)}</section>)}
        {!loading && !state.rows.length && <div className="text-center text-secondary py-5">No notifications in this category.</div>}
        {!loading && state.hasMore && <button className={styles.btnMarkRead} disabled={loadingMore} onClick={() => { const next = page + 1; setPage(next); load(next, true); }}>{loadingMore ? "Loading..." : "Load more"}</button>}
    </>
}
