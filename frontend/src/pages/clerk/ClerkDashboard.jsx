import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import { api } from "../../lib/api";
import { SkeletonKpiCards, SkeletonList, SkeletonTable } from "../../components/ui/Skeleton";
import { attendanceMethodLabel } from "../../lib/attendanceMethod";
import styles from "./ClerkDashboard.module.css";
import InlineError from "../../components/ui/InlineError";
import { useTerminalPreferences } from "../../hooks/useTerminalPreferences";

export default function ClerkDashboard() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [drawer, setDrawer] = useState(null);
    const [drawerModal, setDrawerModal] = useState("");
    const [drawerForm, setDrawerForm] = useState({ amount: "", counted_cash: "", kind: "correction", reason: "", note: "" });
    const [drawerSaving, setDrawerSaving] = useState(false);
    const [reminderState, setReminderState] = useState("");
    const navigate = useNavigate();
    const { preferences } = useTerminalPreferences();
    useEffect(() => {
        api("/clerk/dashboard")
            .then(setStats)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        api("/clerk/cash-drawer/today").then(setDrawer).catch(() => {});
    }, []);
    const updateDrawer = () => {
        setDrawerForm((form) => ({ ...form, amount: String(preferences.openingFloat || ""), counted_cash: drawer?.expectedCash == null ? "" : String(drawer.expectedCash) }));
        setDrawerModal(drawer?.session ? (drawer.session.status === "open" ? "count" : "") : "open");
    };
    const submitDrawerAction = async (event) => {
        event.preventDefault();
        setDrawerSaving(true);
        try {
            let result;
            if (drawerModal === "open") result = await api("/clerk/cash-drawer/open", { method: "POST", body: { opening_float: Number(drawerForm.amount) } });
            if (drawerModal === "count") result = await api("/clerk/cash-drawer/close", { method: "POST", body: { counted_cash: Number(drawerForm.counted_cash), note: drawerForm.note } });
            if (drawerModal === "adjust") result = await api("/clerk/cash-drawer/adjust", { method: "POST", body: { kind: drawerForm.kind, amount: Number(drawerForm.amount), reason: drawerForm.reason } });
            if (result) setDrawer(result);
            setDrawerModal("");
        } catch (err) { setError(err.message); } finally { setDrawerSaving(false); }
    };
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState !== "visible") return;
            setRefreshing(true);
            api("/clerk/dashboard").then(setStats).catch((err) => setError(err.message)).finally(() => setRefreshing(false));
        };
        const interval = window.setInterval(refresh, 30000);
        return () => window.clearInterval(interval);
    }, []);
    return (
        <ClerkLayout>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                <div>
                    <h1 className={styles.pageTitle}>Dashboard</h1>
                    <p className={styles.pageDesc}>
                        Daily gym front desk overview and quick actions
                    </p>
                </div>
                <div className={styles.timeBadge}>
                    <i className="fa-regular fa-clock text-secondary"></i>{" "}
                    Today{" "}
                    <span className={styles.shiftText}>{stats?.updatedAt ? `Updated ${new Date(stats.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
                </div>
            </div>

            {error && <InlineError error={error} onRetry={() => { setError(""); setLoading(true); api("/clerk/dashboard").then(setStats).catch((err) => setError(err.message)).finally(() => setLoading(false)); }} />}
            {refreshing && <span className="text-secondary small d-block mb-2 fm-refreshing">Refreshing dashboard...</span>}
            {loading ? <SkeletonKpiCards count={4} /> : <div className="row g-3 mb-4 fm-fade-in">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Active Members on Floor</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {stats ? stats.activeOnFloor : "-"}{" "}
                            <span className={styles.kpiValueUnit}>Members</span>
                        </h3>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBarBg}>
                                <div
                                    className={`${styles.progressBarFillPrimary} fm-grow-x`}
                                    style={{ width: `${Math.min(100, ((stats?.activeOnFloor || 0) / (stats?.capacity || 1)) * 100)}%`, "--i": 0 }}
                                ></div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className={styles.kpiSub}>
                                    Current floor occupancy
                                </span>
                                <span className={styles.kpiPositive}>
                                    {stats && stats.activeOnFloor >= stats.capacity ? "Full" : stats && stats.activeOnFloor / stats.capacity >= 0.75 ? "Busy" : stats && stats.activeOnFloor / stats.capacity >= 0.4 ? "Comfortable" : "-"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Today's Check-ins</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-solid fa-person-walking-arrow-right"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {stats ? stats.checkIns : "-"}{" "}
                            <span className={styles.kpiValueUnit}>Visits</span>
                        </h3>
                        <div className="d-flex align-items-center gap-2 mt-1 mb-2">
                            <span className={styles.kpiPositive}>
                                Live front-desk entries
                            </span>
                        </div>
                        <div className="d-flex justify-content-between mt-auto">
                            <span className={styles.kpiSub}>
                                Today's total:{" "}
                                <strong className="text-white">{stats ? stats.checkIns : "-"}</strong>
                            </span>
                            <span className={styles.kpiSub}>
                                Open sessions:{" "}
                                <strong className="text-white">{stats ? stats.openSessions : "-"}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Today's Cash Collected</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-money-bill"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>₱{stats ? Number(stats.totalCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</h3>
                        <div className="mb-2">
                            <span className={styles.kpiSub}>
                                Cash Drawer + GCash/Maya summary
                            </span>
                        </div>
                        <div className="d-flex justify-content-between mt-auto">
                            <span className={styles.kpiSub}>
                                Cash:{" "}
                                <strong className="text-white">₱{stats ? Number(stats.cashCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</strong>
                            </span>
                            <span className={styles.kpiSub}>
                                E-Wallets:{" "}
                                <strong className="text-white">₱{stats ? Number(stats.eWalletCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>New Registrations Today</span>
                            <div className={styles.iconBoxPrimaryOutline}>
                                <i className="fa-solid fa-user-plus"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {stats ? stats.registrations : "-"}{" "}
                            <span className={styles.kpiValueUnit}>
                                New Members
                            </span>
                        </h3>
                        <div className="mb-2">
                            <span className={styles.kpiPositive}>
                                Live registration count
                            </span>
                        </div>
                        <div className="d-flex justify-content-between mt-auto">
                            <span className={styles.kpiSub}>
                                Processed via front desk
                            </span>
                        </div>
                    </div>
                </div>
            </div>}
            <div
                className={styles.quickActionsBar}
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="d-flex align-items-center gap-2">
                    <i className="fa-solid fa-bolt text-primary"></i>
                    <span
                        className="text-white fw-bold"
                        style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}
                    >
                        Quick Desk Actions:
                    </span>
                </div>
                <div className={styles.actionsScroll}>
                    <button className={styles.btnQuickAction} onClick={() => navigate("/clerk/payments?mode=walkin")}>
                        <i className="fa-solid fa-person-walking"></i> Session Pass (walk-in)
                    </button>
                    <button className={styles.btnQuickAction} onClick={() => navigate("/clerk/attendance?focus=checkin")}>
                        <i className="fa-solid fa-id-card-clip"></i> Check-in
                    </button>
                    <button className={styles.btnQuickAction} onClick={() => navigate("/clerk/member-registration")}>
                        <i className="fa-solid fa-user-plus"></i> New Member
                        Registration
                    </button>
                    <button className={styles.btnQuickAction} onClick={() => navigate("/clerk/payments?mode=member")}>
                        <i className="fa-solid fa-money-bill-wave"></i> Record
                        Member Payment
                    </button>
                </div>
            </div>

            {loading ? <div className="row g-4 mt-1"><div className="col-12 col-xl-8"><SkeletonTable rows={5} cols={4} /></div><div className="col-12 col-xl-4"><SkeletonList rows={4} /></div></div> : <div className="row g-4 mt-1 fm-fade-in">
                <div className="col-12 col-xl-8">
                    <div className={styles.panelCard}>
                        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <div className={styles.iconBoxOutline}>
                                    <i className="fa-solid fa-person-walking-arrow-right"></i>
                                </div>
                                <div>
                                    <h4 className={styles.panelTitle}>
                                        Recent Desk Check-ins & Attendance
                                    </h4>
                                    <p className={styles.panelDesc}>
                                        Last 5 members who entered the gym floor
                                        today
                                    </p>
                                </div>
                            </div>
                            <span className={styles.syncBadge}>
                                Real-time Sync Active
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>MEMBER</th>
                                        <th>CHECK-IN TIME</th>
                                        <th>MEMBERSHIP PLAN</th>
                                        <th>METHOD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(stats?.recentAttendance || []).map((record) => (
                                        <tr key={record.id}>
                                            <td><div className="d-flex align-items-center gap-3"><div className={styles.avatar}>{record.display_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><strong className="d-block text-white mb-1">{record.display_name}</strong><span className={styles.subText}>Live attendance record</span></div></div></td>
                                            <td><strong className="d-block text-white mb-1">{new Date(record.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><span className={styles.subText}>Today</span></td>
                                            <td><span className={styles.planBadgeOutline}>{record.plan_name}</span></td>
                                            <td>{(() => { const method = attendanceMethodLabel(record.method); return <span className={styles.subText}><i className={`fa-solid ${method.icon}`}></i> {method.label}</span>; })()}</td>
                                        </tr>
                                    ))}
                                    {!stats?.recentAttendance?.length && <tr><td colSpan="4" className="text-secondary text-center">No check-ins recorded today.</td></tr>}
                                </tbody>
                                <tbody style={{ display: "none" }}>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className={styles.avatar}>
                                                    CM
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Carlos Mendoza
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        Regular Lifter
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                10:42 AM
                                            </strong>
                                            <span className={styles.subText}>
                                                18 mins ago
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeOutline
                                                }
                                            >
                                                Monthly Member
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                <i className="fa-solid fa-qrcode"></i>{" "}
                                                Member QR Code
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarSuccess
                                                    }
                                                >
                                                    SS
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Sarah Jen Santos
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        Evening Cardio Class
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                10:35 AM
                                            </strong>
                                            <span className={styles.subText}>
                                                25 mins ago
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeOutline
                                                }
                                            >
                                                Monthly Member
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                <i className="fa-solid fa-desktop"></i>{" "}
                                                Clerk Check-in
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarPrimary
                                                    }
                                                >
                                                    PD
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Paolo Gabriel Diaz
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        Student Pass
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                10:18 AM
                                            </strong>
                                            <span className={styles.subText}>
                                                42 mins ago
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgePrimary
                                                }
                                            >
                                                Weekly Pass
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                <i className="fa-solid fa-qrcode"></i>{" "}
                                                Member QR Code
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarSecondary
                                                    }
                                                >
                                                    AT
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Angela Marie Tan
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        First Time Visitor
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                10:02 AM
                                            </strong>
                                            <span className={styles.subText}>
                                                58 mins ago
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgePrimary
                                                }
                                            >
                                                Walk-in Pass (₱90)
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                <i className="fa-solid fa-desktop"></i>{" "}
                                                Clerk Check-in
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className={styles.avatar}>
                                                    RC
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Raymond Cruz
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        Morning Strength
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                09:47 AM
                                            </strong>
                                            <span className={styles.subText}>
                                                1 hr 13 mins ago
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeOutline
                                                }
                                            >
                                                Monthly Member
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                <i className="fa-solid fa-qrcode"></i>{" "}
                                                Member QR Code
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 pt-3 border-top border-secondary">
                            <span
                                className="text-secondary d-flex align-items-start gap-2"
                                style={{
                                    fontSize: "0.8rem",
                                    maxWidth: "400px",
                                }}
                            >
                                <i className="fa-solid fa-circle-info mt-1"></i>
                                Showing {stats?.recentAttendance?.length || 0} recent check-ins today.
                            </span>
                            <button className={styles.btnLink}>
                                View full attendance sheet
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-4">
                    <div className={styles.panelCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className={styles.iconBoxSuccess}>
                                    <i className="fa-solid fa-cash-register"></i>
                                </div>
                                <div>
                                    <h4 className={styles.panelTitle}>
                                        Daily Cash Drawer
                                    </h4>
                                    <p className={styles.panelDesc}>
                                        Shift reconciliation
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex flex-column gap-3 mb-4 border-bottom border-secondary pb-4">
                            <div
                                className="d-flex justify-content-between align-items-center"
                                style={{ fontSize: "0.85rem" }}
                            >
                                <span className="text-secondary">
                                    <i className="fa-solid fa-unlock text-secondary me-2"></i>{" "}
                                    Starting morning float
                                </span>
                                <strong className="text-white">
                                    ₱{Number(preferences.openingFloat || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </strong>
                            </div>
                            <div
                                className="d-flex justify-content-between align-items-center"
                                style={{ fontSize: "0.85rem" }}
                            >
                                <span className="text-secondary">
                                    <i className="fa-solid fa-circle-plus text-success me-2"></i>{" "}
                                    Cash collected today
                                </span>
                                <strong className="text-success">
                                    + ₱{stats ? Number(stats.cashCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                                </strong>
                            </div>
                            <div
                                className="d-flex justify-content-between align-items-center"
                                style={{ fontSize: "0.85rem" }}
                            >
                                <span className="text-secondary">
                                    <i className="fa-solid fa-mobile-screen text-primary me-2"></i>{" "}
                                    GCash / Maya digital
                                </span>
                                <strong className="text-primary">
                                    ₱{stats ? Number(stats.eWalletCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                                </strong>
                            </div>
                        </div>

                        <div className={styles.cashTotalBox}>
                            <div>
                                <span
                                    className="text-secondary d-block mb-1"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Current cash in drawer:
                                </span>
                                <h3
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1.6rem",
                                        fontWeight: "700",
                                    }}
                                >
                                    ₱{drawer?.expectedCash == null ? "-" : Number(drawer.expectedCash).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                            <div className="text-end">
                                <span
                                    className="text-success d-block mb-1"
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: "600",
                                    }}
                                >
                                    {drawer?.session?.status === "closed" ? `Closed (variance ₱${Number(drawer.session.variance || 0).toFixed(2)})` : drawer?.session ? "Ready for count" : "Drawer not opened"}
                                </span>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Float + Cash sales
                                </span>
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            <button className={styles.btnPrimaryOutlineFull} onClick={updateDrawer}>
                                <i className="fa-solid fa-rotate"></i> {drawer?.session ? "Count / Close" : "Open drawer"}
                            </button>
                            {drawer?.session?.status === "open" && <button className={styles.btnPrimaryOutlineFull} onClick={() => setDrawerModal("adjust")}>
                                <i className="fa-solid fa-right-left"></i> Adjust
                            </button>}
                        </div>
                    </div>

                    <div className={`${styles.panelCard} mt-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className={styles.iconBoxWarning}>
                                    <i className="fa-regular fa-bell"></i>
                                </div>
                                <div>
                                    <h4 className={styles.panelTitle}>
                                        Expiring Soon
                                    </h4>
                                    <p className={styles.panelDesc}>
                                        Polite Front-Desk Notice (Next 3 Days)
                                    </p>
                                </div>
                            </div>
                            <span className={styles.warningBadge}>
                                {stats?.expiringSoon?.length || 0} Members
                            </span>
                        </div>

                        <div className="d-flex flex-column gap-4">
                            {stats?.expiringSoon?.map((member) => (
                                <div className={styles.expiringItem} key={member.id}>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div><h6 className="text-white mb-1" style={{ fontSize: "0.95rem" }}>{member.member_name}</h6><span className="text-secondary d-block mb-1" style={{ fontSize: "0.75rem" }}>{member.membership_plans?.name || "Membership"} · Expires {member.end_date}</span></div>
                                        <span className={member.days_left <= 1 ? styles.badgeDanger : styles.badgeWarning}>{member.days_left === 0 ? "Expires today" : `Expires in ${member.days_left} days`}</span>
                                    </div>
                                    <div className="d-flex gap-2"><button className={styles.btnActionPrimary} onClick={() => navigate(`/clerk/membership?member=${member.member_id}`)}><i className="fa-solid fa-rotate-right"></i> Renew Membership</button><button className={styles.btnActionOutline} disabled={!member.member_email} onClick={async () => { setReminderState(member.id); try { await api(`/clerk/members/${member.member_id}/expiry-reminder`, { method: "POST", body: { membership_id: member.id } }); setReminderState(`${member.id}:sent`); } catch (err) { setError(err.message); setReminderState(""); } }}><i className="fa-regular fa-envelope"></i> {reminderState === `${member.id}:sent` ? "Reminder Sent" : reminderState === member.id ? "Sending..." : "Send Reminder Email"}</button></div>
                                </div>
                            ))}
                            {!stats?.expiringSoon?.length && <div className="text-secondary text-center">No memberships are expiring soon.</div>}
                        <p
                            className="text-center text-secondary mt-4 mb-0"
                            style={{ fontSize: "0.75rem" }}
                        >
                            Friendly reminder: Clerks can ask members gently
                            upon entrance.
                        </p>
                    </div>
                </div>
                </div>
            </div>}
            {drawerModal && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerModal(""); }}>
                <div className={styles.drawerModal} role="dialog" aria-modal="true" aria-labelledby="drawer-modal-title">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h2 id="drawer-modal-title" className={styles.panelTitle}>
                            {drawerModal === "open" ? "Open cash drawer" : drawerModal === "count" ? "Count / close drawer" : "Add cash adjustment"}
                        </h2>
                        <button type="button" className={styles.modalClose} onClick={() => setDrawerModal("")} aria-label="Close"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <form onSubmit={submitDrawerAction}>
                        {drawerModal === "open" && <label className={styles.drawerField}>Opening float (₱)<input required min="0" step="0.01" type="number" value={drawerForm.amount} onChange={(event) => setDrawerForm({ ...drawerForm, amount: event.target.value })} /></label>}
                        {drawerModal === "count" && <>
                            <p className="text-secondary">Expected cash: <strong className="text-white">₱{Number(drawer?.expectedCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                            <label className={styles.drawerField}>Counted cash (₱)<input required min="0" step="0.01" type="number" value={drawerForm.counted_cash} onChange={(event) => setDrawerForm({ ...drawerForm, counted_cash: event.target.value })} /></label>
                            <label className={styles.drawerField}>Note <textarea required={Number(drawerForm.counted_cash || 0).toFixed(2) !== Number(drawer?.expectedCash || 0).toFixed(2)} value={drawerForm.note} onChange={(event) => setDrawerForm({ ...drawerForm, note: event.target.value })} placeholder="Required when there is a variance" /></label>
                        </>}
                        {drawerModal === "adjust" && <>
                            <label className={styles.drawerField}>Adjustment type<select value={drawerForm.kind} onChange={(event) => setDrawerForm({ ...drawerForm, kind: event.target.value })}><option value="correction">Cash in</option><option value="payout">Payout / cash out</option><option value="refund">Refund / cash out</option></select></label>
                            <label className={styles.drawerField}>Amount (₱)<input required min="0.01" step="0.01" type="number" value={drawerForm.amount} onChange={(event) => setDrawerForm({ ...drawerForm, amount: event.target.value })} /></label>
                            <label className={styles.drawerField}>Reason<textarea required maxLength="500" value={drawerForm.reason} onChange={(event) => setDrawerForm({ ...drawerForm, reason: event.target.value })} /></label>
                        </>}
                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <button type="button" className={styles.modalCancel} onClick={() => setDrawerModal("")}>Cancel</button>
                            <button type="submit" className={styles.modalSubmit} disabled={drawerSaving}>{drawerSaving ? "Saving..." : "Save"}</button>
                        </div>
                    </form>
                </div>
            </div>}
        </ClerkLayout>
    );
}
