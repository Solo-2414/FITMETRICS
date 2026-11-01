import { Bar } from "react-chartjs-2";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminChurnAnalytics.module.css";
import InlineError from "../../components/ui/InlineError";
import { api } from "../../lib/api";
import { buildBarOptions } from "../../lib/chartDefaults";
import { SkeletonChart, SkeletonKpiCards, SkeletonTable } from "../../components/ui/Skeleton";

export default function AdminChurnAnalytics() {
    const [promptText, setPromptText] = useState(
        "We miss you at Analyn's Gym! Come get your workout in today.",
    );
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [members, setMembers] = useState([]);
    const [stats, setStats] = useState(null);
    const [trend, setTrend] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        api("/admin/churn").then((result) => { setMembers(result.members || []); setStats(result.stats); setTrend(result.trend || []); }).catch((err) => setError(err.message)).finally(() => setLoading(false));
    }, []);
    const chartData = useMemo(() => ({
        labels: (trend || []).map((item) => item.label),
        datasets: [
            {
                label: "Returning Members",
                data: (trend || []).map((item) => item.visits),
                backgroundColor: "#10b981",
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.4,
            },
            {
                label: "Total Visits",
                data: (trend || []).map((item) => item.visits),
                backgroundColor: "#38bdf8",
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.4,
            },
        ],
    }), [trend]);
    const chartOptions = useMemo(() => {
        const options = buildBarOptions({ count: 12 });
        return {
            ...options,
            scales: {
                ...options.scales,
                x: { ...options.scales.x, ticks: { ...options.scales.x.ticks, font: { size: 11, family: "Inter, sans-serif" } } },
                y: { ...options.scales.y, display: false },
            },
        };
    }, []);

    return (
        <AdminLayout>
            {error && <InlineError error={error} />}
            <div className="d-flex flex-column mb-4" data-aos="fade-down">
                <h1 className={styles.pageTitle}>Churn Analytics</h1>
                <p className={styles.pageDesc}>
                    Track members who stopped visiting and send friendly email
                    reminders
                </p>
            </div>

            {loading ? <SkeletonKpiCards /> : <div className="row g-3 mb-4 fm-fade-in">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Members Visited This Month</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-regular fa-circle-check"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>{stats?.visitedThisMonth ?? "..."}</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-up"></i> Active
                                members
                            </span>
                            <span className={styles.kpiSub}>
                                this calendar month
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Inactive Members (&gt;14 Days)</span>
                            <div className={styles.iconBoxWarning}>
                                <i className="fa-solid fa-stopwatch"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {stats?.inactive14 ?? "..."}{" "}
                            <span className={styles.kpiValueUnit}>members</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiWarning}>
                                Needs re-engagement
                            </span>
                            <span className={styles.kpiSub}>
                                Current re-engagement list
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Memberships Ending Soon</span>
                            <div className={styles.iconBoxDanger}>
                                <i className="fa-regular fa-calendar-xmark"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            {stats?.endingSoon ?? "..."}{" "}
                            <span className={styles.kpiValueUnit}>members</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiDanger}>
                                Next 7 Days
                            </span>
                            <span className={styles.kpiSub}>
                                · Ready for renewal
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Renewed This Month</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-solid fa-rotate"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>{stats?.renewalRate ?? "..."}%</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                renewal rate
                            </span>
                            <span className={styles.kpiSub}>
                                Recorded renewal rate
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            }
            <div className="row mb-4">
                <div className="col-12" data-aos="fade-up" data-aos-delay="100">
                    <div className={styles.chartCard}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                            <div>
                                <h4 className={styles.panelTitle}>
                                    Member Visits Over Time (Last 6 Months)
                                </h4>
                                <p className={styles.panelDesc}>
                                    Monthly gym visits count showing consistent
                                    attendance and healthy community retention
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-4 flex-wrap">
                                <span className={styles.chartLegend}>
                                    <span className={styles.dotPrimary}></span>{" "}
                                    Total Visits
                                </span>
                                <span className={styles.chartLegend}>
                                    <span className={styles.dotSuccess}></span>{" "}
                                    Returning Members
                                </span>
                                <div className={styles.retentionBadge}>
                                    Simple Retention: 91% Avg
                                </div>
                            </div>
                        </div>

                        <div className={styles.chartWrapper}>
                            {loading ? <SkeletonChart height={300} /> : <Bar data={chartData} options={chartOptions} />}
                        </div>

                        <div
                            className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary text-secondary"
                            style={{ fontSize: "0.8rem" }}
                        >
                            <span>
                                Attendance trend from recorded check-ins
                            </span>
                            <span>Last synced: Today, 3:15 PM</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12" data-aos="fade-up" data-aos-delay="200">
                    <div className={styles.panelCard}>
                        <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center mb-4 gap-3">
                            <div>
                                <div className="d-flex align-items-center gap-3">
                                    <h4 className={styles.panelTitle}>
                                        Members Who Haven't Visited in 14+ Days
                                    </h4>
                                    <span className={styles.totalBadge}>
                                        {stats?.inactive14 ?? "..."} Total
                                    </span>
                                </div>
                                <p className={styles.panelDesc}>
                                    Send a quick, friendly touchpoint so members
                                    feel remembered and encouraged to come back
                                </p>
                            </div>
                            <div className={styles.defaultPrompt}>
                                <i className="fa-regular fa-envelope text-primary"></i>
                                {isEditingPrompt ? (
                                    <div className="d-flex align-items-center gap-2 flex-grow-1">
                                        <input
                                            type="text"
                                            className={styles.promptInput}
                                            value={promptText}
                                            onChange={(e) =>
                                                setPromptText(e.target.value)
                                            }
                                            autoFocus
                                        />
                                        <button
                                            className={styles.btnSavePrompt}
                                            onClick={() =>
                                                setIsEditingPrompt(false)
                                            }
                                        >
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <div className="d-flex align-items-center justify-content-between w-100 gap-3">
                                        <span>
                                            Default prompt:{" "}
                                            <em className="text-white">
                                                "{promptText}"
                                            </em>
                                        </span>
                                        <button
                                            className={styles.btnEditPrompt}
                                            onClick={() =>
                                                setIsEditingPrompt(true)
                                            }
                                        >
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading ? <SkeletonTable rows={5} cols={6} /> : <div className="table-responsive fm-fade-in">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>MEMBER NAME</th>
                                        <th>MEMBERSHIP PLAN</th>
                                        <th>LAST VISITED DATE</th>
                                        <th>DAYS INACTIVE</th>
                                        <th>CONTACT</th>
                                        <th>QUICK ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.filter((member) => member.days_inactive >= 14).slice(0, 5).map((member, index) => (
                                        <tr key={member.member_id}>
                                            <td><div className="d-flex align-items-center gap-3"><div className={index % 2 ? styles.avatarSecondary : styles.avatar}>{(member.full_name || "Member").split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><strong className="d-block text-white mb-1">{member.full_name || "Member"}</strong><span className={styles.memberSince}>Active member</span></div></div></td>
                                            <td><span className={styles.planBadgeOutline}>{member.plan_name || "Membership"}</span></td>
                                            <td>{member.last_visit_date ? new Date(member.last_visit_date).toLocaleDateString() : "No visit recorded"}</td>
                                            <td><span className={member.days_inactive >= 30 ? styles.badgeDanger : styles.badgeWarning}>{member.days_inactive >= 999 ? "No visits" : `${member.days_inactive} days ago`}</span></td>
                                            <td>{member.email || member.phone || "No contact"}</td>
                                            <td><button className={styles.btnActionOutline} disabled={sending === member.member_id} onClick={async () => { setSending(member.member_id); try { await api(`/admin/churn/${member.member_id}/reminder`, { method: "POST", body: { message: promptText } }); } catch (err) { setError(err.message); } finally { setSending(""); } }}><i className="fa-regular fa-paper-plane"></i>{" "}{sending === member.member_id ? "Sending..." : "Send Friendly Email"}</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>}

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Showing {Math.min(5, members.filter((member) => member.days_inactive >= 14).length)} of {members.filter((member) => member.days_inactive >= 14).length} inactive members
                            </span>
                            <div className="d-flex gap-2 mt-3 mt-sm-0">
                                <button className={styles.pageBtnText} disabled>
                                    Previous
                                </button>
                                <button className={styles.pageBtnText}>
                                    Page 1
                                </button>
                                <button className={styles.pageBtnTextActive}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
