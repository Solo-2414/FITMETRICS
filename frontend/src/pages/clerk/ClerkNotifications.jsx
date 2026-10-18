import { useEffect, useMemo, useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import { api } from "../../lib/api";
import styles from "./ClerkNotifications.module.css";

const relativeTime = (value) => {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

export default function ClerkNotifications() {
    const [activeTab, setActiveTab] = useState("all");
    const [notifications, setNotifications] = useState([]);
    const [error, setError] = useState("");
    const load = () => api("/clerk/notifications").then(setNotifications).catch((err) => setError(err.message));
    useEffect(() => { load(); }, []);
    const filtered = useMemo(() => notifications.filter((item) => activeTab === "all" || (activeTab === "expiring" && item.type === "membership_expiry") || (activeTab === "payments" && item.type === "payment") || (activeTab === "notices" && item.type === "announcement") || (activeTab === "new" && item.title?.toLowerCase().includes("registered"))), [notifications, activeTab]);
    const markRead = async (id) => {
        try { await api(`/clerk/notifications/${id}`, { method: "PATCH" }); setNotifications((rows) => rows.map((row) => row.id === id ? { ...row, read_at: new Date().toISOString() } : row)); } catch (err) { setError(err.message); }
    };
    const markAll = async () => {
        try { await api("/clerk/notifications", { method: "PATCH" }); setNotifications((rows) => rows.map((row) => ({ ...row, read_at: new Date().toISOString() }))); } catch (err) { setError(err.message); }
    };
    const tabs = [["all", "All Notifications"], ["expiring", "Expiring Memberships"], ["new", "New Registrations"], ["payments", "Payments & Renewals"], ["notices", "Gym Notices"]];
    return <ClerkLayout>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
            <div><h1 className={styles.pageTitle}>Notification</h1><p className={styles.pageDesc}>Important front desk reminders, member registrations, and gym updates</p></div>
            <button className={styles.btnMarkRead} onClick={markAll}><i className="fa-solid fa-check-double"></i> Mark All as Read</button>
        </div>
        <div className={styles.tabsContainer}><div className={styles.tabsScroll}>{tabs.map(([key, label]) => <button key={key} className={`${styles.tabBtn} ${activeTab === key ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab(key)}>{label} <span className={styles.badgeMuted}>{key === "all" ? notifications.length : notifications.filter((item) => (key === "expiring" && item.type === "membership_expiry") || (key === "payments" && item.type === "payment") || (key === "notices" && item.type === "announcement")).length}</span></button>)}</div></div>
        <div className="d-flex flex-column gap-3">
            {filtered.map((item) => <div className={styles.listCard} key={item.id} style={{ opacity: item.read_at ? 0.7 : 1 }}><div className="d-flex align-items-start gap-3"><div className={styles.iconBoxPrimary}><i className="fa-regular fa-bell"></i></div><div className="flex-grow-1"><h4 className={styles.cardTitle}>{item.title}</h4><p className={styles.cardDesc}>{item.message}</p><span className={styles.cardMetaText}>{relativeTime(item.created_at)}</span></div>{!item.read_at && <button className={styles.btnActionOutlineSmall} onClick={() => markRead(item.id)}>Mark read</button>}</div></div>)}
            {!filtered.length && <div className="text-center text-secondary py-5">No notifications in this category.</div>}
        </div>
    </ClerkLayout>;
}
