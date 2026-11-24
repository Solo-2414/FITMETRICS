import { useEffect, useRef, useState } from "react";
import styles from "./AdminAnnouncements.module.css";
import { api } from "../../lib/api";
import { Skeleton, SkeletonKpiCards, SkeletonRegion } from "../../components/ui/Skeleton";
import InlineError from "../../components/ui/InlineError";
import { useToast } from "../../components/ui/toast/useToast";
import { useConfirm } from "../../components/ui/toast/useConfirm";

const formatDate = (value) => value ? new Date(value).toLocaleString() : "No date";
const audienceLabel = (value) => ({ all: "Everyone", member: "Members", clerk: "Clerks", admin: "Admins" }[value] || value);

export default function AdminAnnouncements() {
    const toast = useToast();
    const confirm = useConfirm();
    const [announcements, setAnnouncements] = useState([]);
    const [summary, setSummary] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bodyLength, setBodyLength] = useState(0);
    const formRef = useRef(null);

    const fetchAnnouncements = () => Promise.all([
        api("/admin/announcements"),
        api("/admin/announcements/summary"),
    ]);
    const load = async () => {
        setLoading(true);
        try {
            const [list, totals] = await fetchAnnouncements();
            setAnnouncements(list);
            setSummary(totals);
            setError("");
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    useEffect(() => {
        let cancelled = false;
        fetchAnnouncements().then(([list, totals]) => {
            if (!cancelled) { setAnnouncements(list); setSummary(totals); setError(""); setLoading(false); }
        }).catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
        return () => { cancelled = true; };
    }, []);

    const updateAnnouncement = async (id, updates) => {
        try {
            const updated = await api(`/admin/announcements/${id}`, { method: "PATCH", body: updates });
            setAnnouncements((items) => items.map((item) => item.id === id ? { ...item, ...updated } : item));
            await load();
        } catch (err) { setError(err.message); }
    };

    const createAnnouncement = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const sendEmail = form.get("send_email") === "on";
        if (sendEmail) {
            const count = Number(summary.active_recipients?.[form.get("audience")] ?? summary.active_recipients?.all ?? 0);
            if (!await confirm({ title: "Send announcement?", message: `This will send an email to exactly ${count} active recipient${count === 1 ? "" : "s"}. Continue?` })) return;
        }
        setSaving(true);
        try {
            const created = await api("/admin/announcements", { method: "POST", body: {
                title: form.get("title"), body: form.get("body"), audience: form.get("audience"),
                status: form.get("status"), publish_at: form.get("publish_at") || null,
                expires_at: form.get("expires_at") || null, pinned: form.get("pinned") === "on", send_email: sendEmail,
            }});
            setAnnouncements((items) => [created, ...items]);
            formRef.current?.reset();
            setBodyLength(0);
            await load();
            toast.success("Announcement created.");
        } catch (err) { toast.error(err.message); } finally { setSaving(false); }
    };

    const removeAnnouncement = async (item) => {
        if (!await confirm({ title: item.status === "draft" ? "Delete draft?" : "Archive announcement?", message: item.status === "draft" ? "Delete this draft?" : "Archive this announcement?", danger: true })) return;
        try {
            await api(`/admin/announcements/${item.id}`, { method: "DELETE" });
            await load();
            toast.success(item.status === "draft" ? "Draft deleted." : "Announcement archived.");
        } catch (err) { toast.error(err.message); }
    };

    const editText = async (item) => {
        const title = window.prompt("Announcement title", item.title);
        if (title === null) return;
        const body = window.prompt("Announcement text", item.body);
        if (body === null) return;
        await updateAnnouncement(item.id, { title, body });
    };

    return (
        <>
            {error && <InlineError error={error} onRetry={load} />}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3" data-aos="fade-down">
                <div><h1 className={styles.pageTitle}>Announcements</h1><p className={styles.pageDesc}>Post updates, holiday schedules, and gym notices for members and staff</p></div>
                <button className={styles.btnPrimary} onClick={() => document.getElementById("create-announcement")?.scrollIntoView({ behavior: "smooth" })}><i className="fa-solid fa-plus"></i> Create Announcement</button>
            </div>

            {loading ? <SkeletonKpiCards count={3} colClass="col-12 col-md-4" labels={["Published announcements", "In-app deliveries", "Read rate"]} icons={["fa-bullhorn", "fa-users", "fa-chart-line"]} /> : <div className="row g-3 mb-5 fm-fade-in" data-aos="fade-up">
                {[
                    ["Published announcements", summary.active ?? announcements.filter((item) => item.status === "published").length, "fa-bullhorn", styles.iconBoxPrimary],
                    ["In-app deliveries", summary.delivered ?? 0, "fa-users", styles.iconBoxSecondary],
                    ["Read rate", `${summary.readRate ?? 0}%`, "fa-chart-line", styles.iconBoxSuccess],
                ].map(([label, value, icon, iconStyle]) => <div className="col-12 col-md-4" key={label}><div className={styles.kpiCard}><div className={styles.kpiHeader}><span>{label}</span><div className={iconStyle}><i className={`fa-solid ${icon}`}></i></div></div><h3 className={styles.kpiValue}>{value}</h3><span className={styles.kpiSub}>Based on current announcement delivery data</span></div></div>)}
            </div>}

            <div className="row g-4">
                <div className="col-12 col-xl-8" data-aos="fade-right">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3"><div className="d-flex align-items-center gap-3"><h4 className={styles.sectionTitle}>Announcements</h4><span className={styles.countBadge}>{announcements.length} Total</span></div></div>
                    {loading ? <SkeletonRegion label="Loading announcements" className="d-flex flex-column gap-3">{Array.from({ length: 4 }, (_, index) => <div className={styles.announcementCard} key={index} aria-hidden="true"><div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2"><Skeleton w={82} h={20} r={999} /><Skeleton w={52} h={18} r={999} /></div><div className={styles.metaText}><Skeleton w="82%" h={11} /></div><Skeleton w="64%" h={18} className="mb-2" /><Skeleton w="96%" h={12} className="mb-2" /><Skeleton w="78%" h={12} /><div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mt-4 gap-3"><div className={styles.cardMetrics}><Skeleton w={86} h={11} /><span className={styles.metricSeparator}>•</span><Skeleton w={52} h={11} /><span className={styles.metricSeparator}>•</span><Skeleton w={96} h={11} /></div><div className="d-flex gap-2 flex-wrap"><Skeleton w={70} h={30} r={6} /><Skeleton w={58} h={30} r={6} /><Skeleton w={32} h={30} r={6} /></div></div></div>)}</SkeletonRegion> : announcements.length === 0 ? <div className="text-secondary py-5">No announcements yet.</div> : <div className="d-flex flex-column gap-3 fm-fade-in">
                        {announcements.map((item) => <div className={item.status === "expired" || item.status === "archived" ? styles.announcementCardInactive : styles.announcementCard} key={item.id}>
                            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2"><span className={item.status === "published" ? styles.statusPublished : styles.statusCompleted}><span className={item.status === "published" ? styles.dotGreen : styles.dotGray}></span> {item.status}</span>{item.pinned && <span className={styles.statusPinned}><i className="fa-solid fa-thumbtack"></i> Pinned</span>}</div>
                            <div className={styles.metaText}><i className="fa-regular fa-clock"></i> {audienceLabel(item.audience)} · Published {formatDate(item.publish_at)} · Expires {formatDate(item.expires_at)}</div>
                            <h3 className={styles.cardTitle}>{item.title}</h3><p className={styles.cardDesc}>{item.body}</p>
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mt-4 gap-3"><div className={styles.cardMetrics}><span><i className="fa-regular fa-bell"></i> {item.delivery?.inAppDelivered ?? 0} delivered</span><span className={styles.metricSeparator}>•</span><span>{item.delivery?.readRate ?? 0}% read</span><span className={styles.metricSeparator}>•</span><span><i className="fa-regular fa-envelope"></i> {item.delivery?.emailsSent ?? 0}/{item.email_total ?? 0} emails sent</span></div><div className="d-flex gap-2 flex-wrap">
                                {item.status === "draft" && <button className={styles.btnActionSecondary} onClick={() => updateAnnouncement(item.id, { status: "published" })}><i className="fa-solid fa-paper-plane"></i> Publish</button>}
                                {item.status !== "archived" && <button className={styles.btnActionIconOutline} onClick={() => updateAnnouncement(item.id, { pinned: !item.pinned })}><i className="fa-solid fa-thumbtack"></i> {item.pinned ? "Unpin" : "Pin"}</button>}
                                {item.status !== "archived" && <button className={styles.btnActionIcon} onClick={() => editText(item)}><i className="fa-solid fa-pen"></i></button>}
                                <button className={styles.btnActionIconDanger} onClick={() => removeAnnouncement(item)}><i className="fa-regular fa-trash-can"></i></button>
                            </div></div>
                        </div>)}
                    </div>}
                </div>

                <div className="col-12 col-xl-4" id="create-announcement" data-aos="fade-left">
                    <div className={styles.formCard}><div className="d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom border-secondary"><div><h3 className={styles.formTitle}>Create Announcement</h3><p className={styles.formDesc}>Dispatches to Member Portal & In-App Notification</p></div><div className={styles.iconBoxPrimarySmall}><i className="fa-solid fa-paper-plane"></i></div></div>
                        <form ref={formRef} onSubmit={createAnnouncement}>
                            {/* field-error: required-field indicator */}
                            <div className="mb-3"><label className={styles.formLabel}>Announcement Title <span className="text-danger">*</span></label><input className={styles.formInput} name="title" minLength="3" maxLength="120" required /></div>
                            {/* field-error: required-field indicator */}
                            <div className="mb-3"><label className={styles.formLabel}>Target Audience</label><select className={styles.formInput} name="audience" defaultValue="all"><option value="all">Everyone</option><option value="member">Members</option><option value="clerk">Clerks</option><option value="admin">Admins</option></select></div>
                            {/* field-error: required-field indicator */}
                            <div className="mb-3"><label className={styles.formLabel}>Message Text <span className="text-danger">*</span></label><textarea className={styles.formTextarea} name="body" rows="5" maxLength="500" required onChange={(event) => setBodyLength(event.target.value.length)} /><div className="d-flex justify-content-between mt-2"><span className={styles.helperText}>Plain text only</span><span className={styles.helperText}>{bodyLength}/500</span></div></div>
                            <div className="mb-3"><label className={styles.formLabel}>Publish</label><select className={styles.formInput} name="status" defaultValue="published"><option value="published">Publish now</option><option value="scheduled">Schedule</option><option value="draft">Save as draft</option></select></div>
                            <div className="mb-3"><label className={styles.formLabel}>Publish date and time (for scheduled)</label><input className={styles.formInputDate} type="datetime-local" name="publish_at" /></div>
                            <div className="mb-3"><label className={styles.formLabel}>Expiry (optional)</label><input className={styles.formInputDate} type="datetime-local" name="expires_at" /></div>
                            <div className="form-check mb-3"><input className="form-check-input" type="checkbox" name="pinned" id="announcement-pinned" /><label className="form-check-label text-secondary" htmlFor="announcement-pinned">Pin to member portal</label></div>
                            <div className="form-check mb-4"><input className="form-check-input" type="checkbox" name="send_email" id="announcement-email" /><label className="form-check-label text-secondary" htmlFor="announcement-email">Also send by email</label></div>
                            <button className={styles.btnPrimaryFull} type="submit" disabled={saving}><i className="fa-solid fa-paper-plane"></i> {saving ? "Saving..." : "Create Announcement"}</button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
