import { useEffect, useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import { api } from "../../lib/api";
import styles from "./ClerkDashboard.module.css";

export default function ClerkDashboard() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        api("/clerk/dashboard").then(setStats).catch((err) => setError(err.message));
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
                    Shift: Morning to Afternoon{" "}
                    <span className={styles.shiftText}>Live shift</span>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Active Members on Floor</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {stats ? stats.activeOnFloor : "..."}{" "}
                            <span className={styles.kpiValueUnit}>Members</span>
                        </h3>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBarBg}>
                                <div
                                    className={styles.progressBarFillPrimary}
                                    style={{ width: `${Math.min(100, ((stats?.activeOnFloor || 0) / 50) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className={styles.kpiSub}>
                                    Current floor occupancy
                                </span>
                                <span className={styles.kpiPositive}>
                                    Live status
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
                            {stats ? stats.checkIns : "..."}{" "}
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
                                <strong className="text-white">{stats ? stats.checkIns : "..."}</strong>
                            </span>
                            <span className={styles.kpiSub}>
                                Open sessions:{" "}
                                <strong className="text-white">{stats ? stats.activeOnFloor : "..."}</strong>
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
                        <h3 className={styles.kpiValue}>₱{stats ? Number(stats.totalCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "..."}</h3>
                        <div className="mb-2">
                            <span className={styles.kpiSub}>
                                Cash Drawer + GCash/Maya summary
                            </span>
                        </div>
                        <div className="d-flex justify-content-between mt-auto">
                            <span className={styles.kpiSub}>
                                Cash:{" "}
                                <strong className="text-white">₱{stats ? Number(stats.cashCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "..."}</strong>
                            </span>
                            <span className={styles.kpiSub}>
                                E-Wallets:{" "}
                                <strong className="text-white">₱{stats ? Number(stats.eWalletCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "..."}</strong>
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
                            {stats ? stats.registrations : "..."}{" "}
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
            </div>

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
                    <button className={styles.btnQuickActionActive}>
                        Record Walk-in / Day Pass (₱90)
                    </button>
                    <button className={styles.btnQuickAction}>
                        <i className="fa-solid fa-id-card-clip"></i> Verify
                        Membership
                    </button>
                    <button className={styles.btnQuickAction}>
                        <i className="fa-solid fa-user-plus"></i> New Member
                        Registration
                    </button>
                    <button className={styles.btnQuickAction}>
                        <i className="fa-solid fa-money-bill-wave"></i> Record
                        Member Payment
                    </button>
                </div>
            </div>

            <div className="row g-4 mt-1" style={{ display: "none" }}>
                <div
                    className="col-12 col-xl-8"
                    data-aos="fade-right"
                    data-aos-delay="200"
                >
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
                                            <td><span className={styles.subText}><i className="fa-solid fa-desktop"></i> {record.method}</span></td>
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
                                Showing last 5 of 86 total check-ins today.
                                Click 'Check Out' when members hand in their key
                                or exit.
                            </span>
                            <button className={styles.btnLink}>
                                View full attendance sheet
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-xl-4"
                    data-aos="fade-left"
                    data-aos-delay="300"
                >
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
                            <span className={styles.statusBalanced}>
                                Balanced
                            </span>
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
                                    ₱0.00
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
                                    + ₱{stats ? Number(stats.cashCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "..."}
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
                                    ₱{stats ? Number(stats.eWalletCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "..."}
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
                                    ₱{stats ? Number(stats.cashCollected).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "..."}
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
                                    Ready for count
                                </span>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Float + Cash sales
                                </span>
                            </div>
                        </div>

                        <button className={styles.btnPrimaryOutlineFull}>
                            <i className="fa-solid fa-rotate"></i> Update Cash
                            Drawer
                        </button>
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
                                3 Members
                            </span>
                        </div>

                        <div className="d-flex flex-column gap-4">
                            <div className={styles.expiringItem}>
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h6
                                            className="text-white mb-1"
                                            style={{ fontSize: "0.95rem" }}
                                        >
                                            Clarisse Domingo
                                        </h6>
                                        <span
                                            className="text-secondary d-block mb-1"
                                            style={{ fontSize: "0.75rem" }}
                                        >
                                            Monthly Fitness · Plan #1042
                                        </span>
                                    </div>
                                    <span className={styles.badgeDanger}>
                                        Expires Tomorrow
                                    </span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className={styles.btnActionPrimary}>
                                        <i className="fa-solid fa-rotate-right"></i>{" "}
                                        Renew Membership
                                    </button>
                                    <button className={styles.btnActionOutline}>
                                        <i className="fa-regular fa-envelope"></i>{" "}
                                        Send Reminder Email
                                    </button>
                                </div>
                            </div>

                            <div className={styles.expiringItem}>
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h6
                                            className="text-white mb-1"
                                            style={{ fontSize: "0.95rem" }}
                                        >
                                            Marcus Vane
                                        </h6>
                                        <span
                                            className="text-secondary d-block mb-1"
                                            style={{ fontSize: "0.75rem" }}
                                        >
                                            Quarterly VIP · Plan #0892
                                        </span>
                                    </div>
                                    <span className={styles.badgeWarning}>
                                        Expires in 2 days
                                    </span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className={styles.btnActionPrimary}>
                                        <i className="fa-solid fa-rotate-right"></i>{" "}
                                        Renew Membership
                                    </button>
                                    <button className={styles.btnActionOutline}>
                                        <i className="fa-regular fa-envelope"></i>{" "}
                                        Send Reminder Email
                                    </button>
                                </div>
                            </div>

                            <div className={styles.expiringItem}>
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h6
                                            className="text-white mb-1"
                                            style={{ fontSize: "0.95rem" }}
                                        >
                                            Beatrice Luna
                                        </h6>
                                        <span
                                            className="text-secondary d-block mb-1"
                                            style={{ fontSize: "0.75rem" }}
                                        >
                                            Monthly Standard · Plan #1128
                                        </span>
                                    </div>
                                    <span className={styles.badgeWarning}>
                                        Expires in 3 days
                                    </span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className={styles.btnActionPrimary}>
                                        <i className="fa-solid fa-rotate-right"></i>{" "}
                                        Renew Membership
                                    </button>
                                    <button className={styles.btnActionOutline}>
                                        <i className="fa-regular fa-envelope"></i>{" "}
                                        Send Reminder Email
                                    </button>
                                </div>
                            </div>
                        </div>

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
        </ClerkLayout>
    );
}
