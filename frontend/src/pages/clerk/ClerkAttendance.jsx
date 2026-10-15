import { useEffect, useRef, useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import { api } from "../../lib/api";
import styles from "./ClerkAttendance.module.css";

export default function ClerkAttendance() {
    const [members, setMembers] = useState([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [saving, setSaving] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const morningCount = analysis?.records?.filter((row) => new Date(row.check_in_at).getHours() < 12).length || 0;
    const eveningCount = (analysis?.totalCheckIns || 0) - morningCount;
    const checkInFormRef = useRef(null);
    useEffect(() => {
        Promise.all([api("/clerk/members"), api("/attendance/analysis")]).then(([memberRows, attendance]) => {
            setMembers(memberRows);
            setAnalysis(attendance);
        }).catch((err) => setError(err.message));
    }, []);
    const recordCheckIn = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            const search = checkInFormRef.current.querySelector("input").value.trim().toLowerCase();
            const member = members.find((item) => `${item.full_name} ${item.email}`.toLowerCase().includes(search));
            if (!member) throw new Error("Select or enter a registered member before checking in.");
            await api("/clerk/attendance", { method: "POST", body: { member_id: member.id, method: "manual" } });
            const refreshed = await api("/attendance/analysis");
            setAnalysis(refreshed);
            setSuccess("Check-in recorded successfully.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };
    return (
        <ClerkLayout>
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Attendance</h1>
                    <p className={styles.pageDesc}>
                        Record member check-ins, scans, and monitor active gym
                        members
                    </p>
                </div>
            </div>

            <div
                className="row g-4 mb-4"
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="col-12 col-xl-7">
                    <div className={styles.actionCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className={styles.iconBoxPrimaryOutline}>
                                    <i className="fa-solid fa-user-check"></i>
                                </div>
                                <div>
                                    <h3 className={styles.cardTitle}>
                                        Clerk Fast Check-in
                                    </h3>
                                    <p className={styles.cardDesc}>
                                        Manual counter check-in for members
                                        without their phone pass
                                    </p>
                                </div>
                            </div>
                            <span className={styles.badgeOutline}>
                                Method 1
                            </span>
                        </div>

                        <form ref={checkInFormRef} onSubmit={recordCheckIn}>
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Search Member
                                </label>
                                <div className={styles.inputGroup}>
                                    <input
                                        type="text"
                                        className={styles.formInputGroup}
                                        placeholder="Type member name or ID..."
                                    />
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className={styles.queueLabel}>
                                    RECENT FRONT DESK QUEUE
                                </span>
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    {members.filter((member) => member.membership?.status === "active").slice(0, 5).map((member) => (
                                        <button type="button" className={styles.queuePill} key={member.id}>
                                            <span className={styles.dotGreen}></span>{" "}
                                            {member.full_name || member.email}
                                        </button>
                                    ))}
                                    {!members.length && <span className="text-secondary">No active members found.</span>}
                                </div>
                                <div className="d-none">
                                    <button
                                        type="button"
                                        className={styles.queuePill}
                                    >
                                        <span
                                            className={styles.dotGreen}
                                        ></span>{" "}
                                        Kenneth Bautista (0917-882-9912)
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.queuePill}
                                    >
                                        <span
                                            className={styles.dotGreen}
                                        ></span>{" "}
                                        Maricel Santos (0922-311-8401)
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.queuePill}
                                    >
                                        <span
                                            className={styles.dotWarning}
                                        ></span>{" "}
                                        Andrea Lim (0908-119-4452)
                                    </button>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end pt-3 border-top border-secondary">
                                <button
                                    disabled={saving}
                                    type="submit"
                                    className={styles.btnPrimaryFull}
                                >
                                    <i className="fa-regular fa-circle-check"></i>{" "}
                                    {saving ? "Recording..." : "Record Check-in"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="col-12 col-xl-5">
                    <div className={styles.actionCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className={styles.iconBoxSuccessOutline}>
                                    <i className="fa-solid fa-qrcode"></i>
                                </div>
                                <div>
                                    <h3 className={styles.cardTitle}>
                                        Member QR Code Station
                                    </h3>
                                    <p className={styles.cardDesc}>
                                        Contactless self-scan or pass reading
                                    </p>
                                </div>
                            </div>
                            <span className={styles.badgeSuccessOutline}>
                                Method 2
                            </span>
                        </div>

                        <div className={styles.qrBox}>
                            <div className={styles.qrIconWrapper}>
                                <i className="fa-solid fa-qrcode"></i>
                            </div>
                            <div>
                                <h4
                                    className="text-white mb-2"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1rem",
                                        fontWeight: "600",
                                    }}
                                >
                                    Gym Entrance QR Code
                                </h4>
                                <p
                                    className="text-secondary m-0"
                                    style={{
                                        fontSize: "0.85rem",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Members scan this QR code using their phone
                                    camera to check in automatically through
                                    their portal, or clerk can scan member's QR
                                    pass.
                                </p>
                            </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnOutlineAction}>
                                <i className="fa-solid fa-print"></i> Print QR
                                Code Poster
                            </button>
                            <button className={styles.btnOutlineActionPrimary}>
                                <i className="fa-solid fa-camera"></i> Scan
                                Member Phone Pass
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="row g-3 mb-4"
                data-aos="fade-up"
                data-aos-delay="200"
            >
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Currently in Gym</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {analysis ? analysis.activeInGym : "..."}{" "}
                            <span className={styles.kpiValueUnit}>Members</span>
                        </h3>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBarBg}>
                                <div
                                    className={styles.progressBarFillPrimary}
                                    style={{ width: `${Math.min(100, ((analysis?.activeInGym || 0) / 50) * 100)}%` }}
                                ></div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className={styles.kpiSub}>
                                    Live floor occupancy
                                </span>
                                <span className={styles.kpiPositive}>
                                    {analysis ? `${Math.round((analysis.activeInGym / 50) * 100)}% Floor Density` : "..."}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Today's Total Check-ins</span>
                            <div className={styles.iconBoxSecondary}>
                                <i className="fa-solid fa-clipboard-check"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {analysis ? analysis.totalCheckIns : "..."}{" "}
                            <span className={styles.kpiValueUnit}>Visits</span>
                        </h3>
                        <div className="d-flex align-items-center gap-2 mt-auto">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                +14%
                            </span>
                            <span
                                className={styles.kpiSub}
                                style={{ maxWidth: "100px", lineHeight: "1.2" }}
                            >
                                vs yesterday same hour
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span
                                style={{ maxWidth: "150px", lineHeight: "1.3" }}
                            >
                                Morning Shift (6am-12pm)
                            </span>
                            <div className={styles.iconBoxWarning}>
                                <i className="fa-regular fa-sun"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {analysis ? morningCount : "..."}{" "}
                            <span className={styles.kpiValueUnit}>Visits</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-auto">
                            <span className={styles.kpiSub}>
                                Shift concluded
                            </span>
                            <span className={styles.kpiSub}>
                                {analysis && analysis.totalCheckIns ? `${Math.round((morningCount / analysis.totalCheckIns) * 100)}% of total` : "..."}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span
                                style={{ maxWidth: "160px", lineHeight: "1.3" }}
                            >
                                Afternoon/Evening (12pm-9:30pm)
                            </span>
                            <div className={styles.iconBoxPrimaryOutline}>
                                <i className="fa-solid fa-moon"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {analysis ? eveningCount : "..."}{" "}
                            <span className={styles.kpiValueUnit}>Visits</span>
                        </h3>
                        <div className="d-flex align-items-center mt-auto">
                            <span className={styles.kpiPrimaryLive}>
                                <span className={styles.dotPrimary}></span>{" "}
                                Current Active Shift
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={styles.tablePanel}
                data-aos="fade-up"
                data-aos-delay="300"
            >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 border-bottom border-secondary pb-4">
                    <div className="d-flex flex-wrap gap-2">
                        <button className={styles.filterBtnActive}>
                            <span className={styles.dotGreen}></span> Currently
                            In Gym ({analysis ? analysis.activeInGym : "..."})
                        </button>
                        <button className={styles.filterBtn}>
                            All Today's Check-ins ({analysis ? analysis.totalCheckIns : "..."})
                        </button>
                    </div>
                    <div className={styles.searchBox}>
                        <i className="fa-solid fa-filter"></i>
                        <input
                            type="text"
                            placeholder="Filter attendance records..."
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className={`table ${styles.customTable}`}>
                        <thead>
                            <tr>
                                <th>MEMBER NAME</th>
                                <th>MEMBERSHIP PLAN</th>
                                <th>TIME IN</th>
                                <th>TIME OUT</th>
                                <th>CHECK-IN METHOD</th>
                                <th className="text-end">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(analysis?.records || []).map((row) => (
                                <tr key={row.id}>
                                    <td><strong className="d-block text-white mb-1">{members.find((member) => member.id === row.member_id)?.full_name || "Member"}</strong><span className={styles.subText}>ID: {row.member_id.slice(0, 8)}</span></td>
                                    <td>{members.find((member) => member.id === row.member_id)?.membership?.membership_plans?.name || "Membership"}</td>
                                    <td><span className="text-white fw-bold">{new Date(row.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></td>
                                    <td><span className="text-secondary">{row.check_out_at ? new Date(row.check_out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}</span></td>
                                    <td><span className={styles.methodBadgeOutline}><i className="fa-solid fa-desktop"></i>{" "}{row.method}</span></td>
                                    <td className="text-end">{!row.check_out_at ? <button className={styles.btnActionOutline} onClick={async () => { try { await api(`/attendance/${row.id}/checkout`, { method: "PATCH" }); const refreshed = await api("/attendance/analysis"); setAnalysis(refreshed); } catch (err) { setError(err.message); } }}>Check Out</button> : <span className={styles.statusCheckedOut}>Checked Out</span>}</td>
                                </tr>
                            ))}
                            {!analysis?.records?.length && <tr><td colSpan="6" className="text-center text-secondary py-4">No attendance records today.</td></tr>}
                        </tbody>
                        <tbody style={{ display: "none" }}>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatar}>KB</div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Kenneth Bautista
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-1082
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Monthly Regular
                                    </strong>
                                    <span
                                        className="text-primary"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        + Coach Mark
                                    </span>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        10:15 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-secondary">--</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgePrimary}>
                                        <i className="fa-solid fa-qrcode"></i>{" "}
                                        Member QR Code
                                    </span>
                                </td>
                                <td className="text-end">
                                    <button className={styles.btnActionOutline}>
                                        Check Out
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarSecondary}>
                                            MS
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Maricel Santos
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-2041
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Weekly Pass
                                    </strong>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        10:45 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-secondary">--</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgeOutline}>
                                        <i className="fa-solid fa-desktop"></i>{" "}
                                        Clerk Check-in
                                    </span>
                                </td>
                                <td className="text-end">
                                    <button className={styles.btnActionOutline}>
                                        Check Out
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarSecondary}>
                                            DV
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Dominic Valderama
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-1903
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Two Weeks Pass
                                    </strong>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        09:30 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-white">11:15 AM</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgePrimary}>
                                        <i className="fa-solid fa-qrcode"></i>{" "}
                                        Member QR Code
                                    </span>
                                </td>
                                <td className="text-end">
                                    <span className={styles.statusCheckedOut}>
                                        <i className="fa-solid fa-check"></i>{" "}
                                        Checked Out
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarSecondary}>
                                            JC
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Joshua Cordero
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-1130
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Monthly Regular
                                    </strong>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        08:15 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-white">10:00 AM</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgeOutline}>
                                        <i className="fa-solid fa-desktop"></i>{" "}
                                        Clerk Check-in
                                    </span>
                                </td>
                                <td className="text-end">
                                    <span className={styles.statusCheckedOut}>
                                        <i className="fa-solid fa-check"></i>{" "}
                                        Checked Out
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatar}>AL</div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Andrea Lim
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-2508
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Student Monthly
                                    </strong>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        11:00 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-secondary">--</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgePrimary}>
                                        <i className="fa-solid fa-qrcode"></i>{" "}
                                        Member QR Code
                                    </span>
                                </td>
                                <td className="text-end">
                                    <button className={styles.btnActionOutline}>
                                        Check Out
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 border-top border-secondary pt-4">
                    <span
                        className="text-secondary"
                        style={{ fontSize: "0.85rem" }}
                    >
                        Showing {analysis?.records?.length || 0} active sessions in gym
                    </span>
                    <div className="d-flex gap-2 mt-3 mt-sm-0">
                        <button className={styles.pageBtnText} disabled>
                            Previous
                        </button>
                        <button className={styles.pageBtnTextActive}>
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </ClerkLayout>
    );
}
