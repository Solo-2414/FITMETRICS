import { Bar } from "react-chartjs-2";
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminPredictiveAnalytics.module.css";
import InlineError from "../../components/ui/InlineError";
import { api } from "../../lib/api";
import { buildBarOptions } from "../../lib/chartDefaults";
import { SkeletonChart, SkeletonKpiCards, SkeletonTable } from "../../components/ui/Skeleton";
import { toastError, useToast } from "../../components/ui/toast/useToast";

export default function AdminPredictiveAnalytics() {
    const [prediction, setPrediction] = useState(null);
    const [error, setError] = useState("");
    const [sending, setSending] = useState("");
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    useEffect(() => { api("/admin/predictive").then(setPrediction).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
    const sendReminder = async (memberId) => {
        setSending(memberId);
        try {
            await api(`/admin/churn/${memberId}/reminder`, { method: "POST" });
            toast.success("Reminder queued.");
        } catch (err) {
            toast.error(toastError(err));
        } finally {
            setSending("");
        }
    };
    const forecast = prediction?.forecast;
    const stats = prediction?.stats || {};
    const chartData = useMemo(() => ({
        labels: (forecast || []).map((item) => new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short" })),
        datasets: [
            {
                label: "Forecasted Members",
                data: (forecast || []).map((item) => item.visits),
                backgroundColor: "#38bdf8",
                borderRadius: 6,
                barPercentage: 0.7,
                categoryPercentage: 0.6,
            },
        ],
    }), [forecast]);
    const chartOptions = useMemo(() => {
        const options = buildBarOptions({ count: 7 });
        return {
            ...options,
            scales: {
                ...options.scales,
                x: { ...options.scales.x, ticks: { ...options.scales.x.ticks, font: { size: 12, family: "Inter, sans-serif" } } },
                y: { ...options.scales.y, display: false },
            },
        };
    }, []);

    return (
        <>
            {error && <InlineError error={error} />}
            <div className="d-flex flex-column mb-4" data-aos="fade-down">
                <h1 className={styles.pageTitle}>Predictive Analytics</h1>
                <p className={styles.pageDesc}>
                    Estimated gym attendance and upcoming membership renewals
                </p>
            </div>
            {prediction?.lowData && <p className={styles.panelDesc}>Forecasts are statistical estimates based on only {prediction.dataWindow?.attendanceDays || 0} attendance days. At least 14 days of data are recommended.</p>}
            {prediction?.dataWindow && <p className={styles.panelDesc}>Estimate window: {new Date(prediction.dataWindow.start).toLocaleDateString()}–{new Date(prediction.dataWindow.end).toLocaleDateString()}.</p>}

            {loading ? <SkeletonKpiCards count={3} colClass="col-12 col-md-4" /> : <div className="row g-4 mb-4 fm-fade-in">
                <div className="col-12 col-md-4">
                    <div
                        className={styles.kpiCard}
                        data-aos="fade-up"
                        data-aos-delay="100"
                    >
                        <div className={styles.kpiHeader}>
                            <span>Expected Visits Tomorrow</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>~{stats.expectedTomorrow ?? "..."} visits</h3>
                        <div className="d-flex align-items-center mt-3 gap-2">
                            <i className="fa-regular fa-clock text-warning"></i>
                            <span className={styles.kpiSub}>
                                Peak around {prediction?.peak?.hour ?? "..."}:00
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div
                        className={styles.kpiCard}
                        data-aos="fade-up"
                        data-aos-delay="200"
                    >
                        <div className={styles.kpiHeader}>
                            <span>Projected Monthly Revenue</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-solid fa-money-bill"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>₱{stats.projectedMonthlyRevenue?.toLocaleString() ?? "..."}</h3>
                        <div className="d-flex align-items-center mt-3 gap-2">
                            <i className="fa-regular fa-circle-check text-success"></i>
                            <span className={styles.kpiSub}>
                                Based on current active members
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div
                        className={styles.kpiCard}
                        data-aos="fade-up"
                        data-aos-delay="300"
                    >
                        <div className={styles.kpiHeader}>
                            <span>Renewals (Next 14 Days)</span>
                            <div className={styles.iconBoxWarning}>
                                <i className="fa-regular fa-calendar-check"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>{stats.renewalsNext14 ?? "..."} members</h3>
                        <div className="d-flex align-items-center mt-3 gap-2">
                            <i className="fa-solid fa-bell text-warning"></i>
                            <span className={styles.kpiSub}>
                                Follow-ups recommended
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
                                    Projected Daily Attendance for Next 7 Days
                                </h4>
                                <p className={styles.panelDesc}>
                                    Forecasted member volume with post-work peak
                                    windows (Monday - Sunday)
                                </p>
                            </div>
                            <div className={styles.chartLegend}>
                                <span className={styles.dotPrimary}></span> Recorded peak window
                            </div>
                        </div>

                        <div className={styles.chartWrapper}>
                            {loading ? <SkeletonChart height={320} /> : <Bar data={chartData} options={chartOptions} />}
                        </div>

                        <div
                            className="d-flex justify-content-between text-center mt-2 px-2"
                            style={{ fontSize: "0.75rem" }}
                        >
                            <div className="text-warning">Busy</div>
                            <div className="text-secondary">Moderate</div>
                            <div className="text-danger">Peak Day</div>
                            <div className="text-secondary">Moderate</div>
                            <div className="text-secondary">Regular</div>
                            <div className="text-warning">Morning Rush</div>
                            <div className="text-success">Light</div>
                        </div>

                        <div
                            className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mt-4 pt-3 border-top border-secondary text-secondary"
                            style={{ fontSize: "0.8rem" }}
                        >
                            <span className="d-flex align-items-center gap-2">
                                <i className="fa-solid fa-chart-line text-primary"></i>{" "}
                                Estimated average attendance: {forecast?.length ? Math.round(forecast.reduce((sum, item) => sum + item.visits, 0) / forecast.length) : "..."} members/day
                            </span>
                            <span className="mt-2 mt-md-0">
                                Typical evening rush window: {prediction?.peak?.hour ?? "..."}:00 - {(Number(prediction?.peak?.hour) || 0) + 2}:00
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="d-flex flex-column mb-3" data-aos="fade-up">
                <h4 className={styles.panelTitle}>
                    Staffing & Floor Advisory for This Week
                </h4>
                <p className={styles.panelDesc}>
                    Straightforward operational tips tailored for gym floor and
                    reception management
                </p>
            </div>

            <div className="row g-4 mb-5">
                <div
                    className="col-12 col-lg-6"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className={styles.advisoryCard}>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div className={styles.iconBoxWarning}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                            <h5
                                className="text-white m-0"
                                style={{ fontSize: "1rem" }}
                            >
                                Busy Evening Alert
                            </h5>
                        </div>
                        <p
                            className="text-secondary mb-4"
                            style={{ fontSize: "0.85rem", lineHeight: "1.6" }}
                        >
                            {prediction?.advisory?.busyEvening ? `The busiest recorded period is around ${prediction.peak.hour}:00. ${prediction.advisory.staffing}` : "Recorded attendance does not show a consistent busy-evening threshold yet."}
                        </p>
                        <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary">
                            <span
                                className="text-warning"
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: "700",
                                    letterSpacing: "1px",
                                }}
                            >
                                FLOOR COVERAGE
                            </span>
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                Desk + Floor Support
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-lg-6"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <div className={styles.advisoryCard}>
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-graduation-cap"></i>
                            </div>
                            <h5
                                className="text-white m-0"
                                style={{ fontSize: "1rem" }}
                            >
                                Upcoming Renewal Wave
                            </h5>
                        </div>
                        <p
                            className="text-secondary mb-4"
                            style={{ fontSize: "0.85rem", lineHeight: "1.6" }}
                        >
                            {prediction?.renewals?.length ?? 0} members have active plans expiring within the next 14 days. Remind them at the front desk.
                        </p>
                        <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary">
                            <span
                                className="text-primary"
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: "700",
                                    letterSpacing: "1px",
                                }}
                            >
                                STUDENT PROMO
                            </span>
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                Next 14 Days
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12" data-aos="fade-up">
                    <div className={styles.panelCard}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                            <div>
                                <h4 className={styles.panelTitle}>
                                    Expected Renewals This Week
                                </h4>
                                <p className={styles.panelDesc}>
                                    Members expiring in the current 7-day
                                    operational cycle
                                </p>
                            </div>
                            <span className={styles.totalBadge}>
                                {prediction?.renewals?.length ?? "..."} Members Listed
                            </span>
                        </div>

                        {loading ? <SkeletonTable rows={5} cols={5} /> : <div className="table-responsive fm-fade-in">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>MEMBER NAME</th>
                                        <th>PLAN TYPE</th>
                                        <th>EXPIRATION DATE</th>
                                        <th>URGENCY</th>
                                        <th>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(prediction?.renewals || []).map((member) => {
                                        const days = Math.max(0, Math.ceil((new Date(member.end_date) - new Date()) / 86400000));
                                        return <tr key={member.member_id}><td><div className="d-flex align-items-center gap-3"><div className={styles.avatarSecondary}>{(member.full_name || "Member").split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><strong className="d-block text-white mb-1">{member.full_name || "Member"}</strong><span className={styles.memberSince}>{member.email || "No email"}</span></div></div></td><td className="text-white">{member.membership_plans?.name || "Membership"}</td><td className="text-white">{new Date(member.end_date).toLocaleDateString()}</td><td><span className={days <= 3 ? styles.badgeDanger : styles.badgeWarning}>In {days} days</span></td><td><button className={styles.btnActionOutline} disabled={sending === member.member_id} onClick={() => sendReminder(member.member_id)}><i className="fa-regular fa-envelope"></i>{" "}{sending === member.member_id ? "Sending..." : "Send Email Reminder"}</button></td></tr>;
                                    })}
                                    {prediction && !prediction.renewals?.length && <tr><td colSpan="5" className="text-center text-secondary py-4">No memberships are expiring in the next 14 days.</td></tr>}
                                </tbody>
                            </table>
                        </div>}
                    </div>
                </div>
            </div>
        </>
    );
}
