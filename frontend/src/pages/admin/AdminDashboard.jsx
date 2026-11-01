import { Bar } from "react-chartjs-2";
import { useMemo } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import InlineError from "../../components/ui/InlineError";
import { useApiData } from "../../hooks/useApiData";
import { SkeletonChart, SkeletonKpiCards, SkeletonList, SkeletonTable } from "../../components/ui/Skeleton";
import { buildBarOptions } from "../../lib/chartDefaults";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
    const { data: dashboard, error, showSkeleton, reload } = useApiData("/admin/dashboard");
    const kpis = dashboard?.kpis || {};
    const peak = dashboard?.today?.hourlyVisits;
    const recentCheckIns = dashboard?.recentCheckIns || [];
    const expiringSoon = dashboard?.expiringSoon || [];
    const planDistribution = dashboard?.planDistribution || [];
    const totalPlans = planDistribution.reduce((sum, plan) => sum + Number(plan.count || 0), 0);
    const chartData = useMemo(() => ({
        labels: (peak || []).map((row) => `${row.hour}:00`),
        datasets: [{
            label: "Visits",
            data: (peak || []).map((row) => Number(row.visits)),
            backgroundColor: (context) => (context.raw >= 20 ? "#f59e0b" : "#38bdf8"),
            borderRadius: 4,
        }],
    }), [peak]);
    const chartOptions = useMemo(() => {
        const options = buildBarOptions({ count: 24 });
        return {
            ...options,
            scales: {
                ...options.scales,
                x: { ...options.scales.x, ticks: { ...options.scales.x.ticks, font: { size: 10 } } },
                y: { ...options.scales.y, display: false },
            },
        };
    }, []);

    return (
        <AdminLayout>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                <div>
                    <h1 className={styles.pageTitle}>Dashboard</h1>
                    <p className={styles.pageDesc}>
                        Daily summary, member attendance, and gym sales overview
                    </p>
                </div>
                {error && <InlineError error={error} onRetry={reload} />}
                <div className={styles.timeBadge}>
                    <i className="fa-regular fa-calendar"></i> Today: Friday,
                    October 24{" "}
                    <span className={styles.shiftText}>{new Date().toLocaleTimeString([], { hour: "numeric" })}</span>
                </div>
            </div>

            {showSkeleton ? <SkeletonKpiCards /> : <div className="row g-3 mb-4 fm-fade-in">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Today's Sales</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-money-bill"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>₱{dashboard ? Number(dashboard.today?.sales || 0).toLocaleString() : "..."}</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>Paid transactions today</span>
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-chart-line"></i>{" "}
                                Live today
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Active Members</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>{kpis.active_members ?? "..."} Members</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>
                                Membership mix available in plan distribution
                            </span>
                            <span className={styles.kpiPositive}>
                                Current active member total
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Today's Check-ins</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-person-walking-arrow-right"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>{dashboard ? (dashboard.today?.checkIns ?? 0) : "..."} Visits</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>
                                Recorded visits for selected day
                            </span>
                            <span className={styles.kpiHighlight}>
                                Duration data available in attendance logs
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Expiring Memberships</span>
                            <div className={styles.iconBoxWarning}>
                                <i className="fa-regular fa-calendar-xmark"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>{dashboard ? (dashboard.today?.expiringCount ?? 0) : "..."} Members</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>Next 3 days</span>
                            <span className={styles.kpiWarning}>
                                <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                                Needs action
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            }
            <div className="row g-4 mb-4">
                <div className="col-12" data-aos="fade-up" data-aos-delay="100">
                    <div className={styles.panelCard}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                            <div>
                                <h4 className={styles.panelTitle}>
                                    Today's Hourly Visit Flow
                                </h4>
                                <p className={styles.panelDesc}>
                                    Real-time check-in density across
                                    operational hours (6:00 AM – 9:00 PM)
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                                <span className={styles.chartLegend}>
                                    <span className={styles.dotPrimary}></span>{" "}
                                    Today's visits
                                </span>
                            </div>
                        </div>

                        <div className={styles.capacityNotice}>
                            <i className="fa-regular fa-circle-check text-success"></i>
                            <span>
                                Gym capacity comfortable{" "}
                                <strong>(live capacity)</strong> ·
                                Live attendance flow from today's recorded check-ins
                            </span>
                        </div>

                        <div className={styles.chartWrapper}>
                            {showSkeleton ? <SkeletonChart height={250} /> : <Bar data={chartData} options={chartOptions} />}
                        </div>

                        <div
                            className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary text-secondary"
                            style={{ fontSize: "0.8rem" }}
                        >
                            <span>Total today: {dashboard?.today?.checkIns ?? 0} check-ins</span>
                            <span className="text-white fw-bold">
                                Current open visits: {dashboard?.today?.openVisits ?? 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div
                    className="col-12 col-xl-8"
                    data-aos="fade-right"
                    data-aos-delay="200"
                >
                    <div className={`${styles.panelCard} h-100`}>
                        <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
                            <div>
                                <h4 className={styles.panelTitle}>
                                    Recent Gym Check-Ins
                                </h4>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    <span className={styles.liveBadge}>
                                        <span className={styles.liveDot}></span>{" "}
                                        Live desk log · 2m ago
                                    </span>
                                    <span className={styles.panelDesc}>
                                        Real-time counter entries logged by
                                        reception desk
                                    </span>
                                </div>
                            </div>
                            <button className={styles.btnLink}>
                                View all {dashboard?.today?.checkIns ?? 0} visits today{" "}
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>

                        {showSkeleton ? <SkeletonTable rows={5} cols={4} /> : <div className="table-responsive fm-fade-in">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>MEMBER NAME & ID</th>
                                        <th>PLAN</th>
                                        <th>CHECK-IN TIME</th>
                                        <th>RECORDED BY</th>
                                    </tr>
                                </thead>
                                <tbody>{recentCheckIns.map((row) => <tr key={row.id}><td><strong className="d-block text-white mb-1">{row.member?.full_name || "Walk-in"}</strong><span className={styles.memberId}>{row.member?.member_details?.member_code || row.member_id}</span></td><td><span className={styles.planBadgeOutline}>{row.member?.membership_plan || "Active membership"}</span></td><td className="text-white">{new Date(row.check_in_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</td><td>{row.recordedByName}</td></tr>)}{dashboard && !recentCheckIns.length && <tr><td colSpan="4" className="text-center text-secondary py-4">No check-ins recorded today.</td></tr>}</tbody>
                            </table>
                        </div>}
                    </div>
                </div>

                <div
                    className="col-12 col-xl-4"
                    data-aos="fade-left"
                    data-aos-delay="300"
                >
                    <div className={`${styles.panelCard} h-100`}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="fa-regular fa-bell-slash text-warning fs-5"></i>
                            <h4 className={styles.panelTitle}>Expiring Soon</h4>
                            <span className={styles.warningBadge}>
                                {expiringSoon.length} in 3 Days
                            </span>
                        </div>
                        <p
                            className={styles.panelDesc}
                            style={{ marginBottom: "24px" }}
                        >
                            Polite email notifications ready to send to members
                        </p>

                        {showSkeleton ? <SkeletonList rows={3} /> : <div className="d-flex flex-column gap-3 mb-4 fm-fade-in">{expiringSoon.slice(0, 3).map((membership) => { const days = Math.max(0, Math.ceil((new Date(membership.end_date) - new Date()) / 86400000)); return <div className={styles.expiringCard} key={membership.id}><div><h6 className="text-white mb-1">{membership.member?.full_name || "Member"}</h6><div className={days <= 1 ? "text-danger" : "text-warning"} style={{ fontSize: "0.75rem", fontWeight: "600", marginBottom: "4px" }}><i className="fa-regular fa-clock"></i>{" "}Expires {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}</div><span className="text-secondary" style={{ fontSize: "0.75rem" }}>{membership.membership_plans?.name || "Membership"}</span></div><button className={styles.btnActionOutline}><i className="fa-regular fa-envelope"></i>{" "}Send Email</button></div>; })}{dashboard && !expiringSoon.length && <div className="text-secondary py-3">No memberships expire within the next 3 days.</div>}</div>}

                        <button className={styles.btnPrimaryFull}>
                            <i className="fa-solid fa-paper-plane"></i> Send
                            Email Reminder to All {expiringSoon.length} Members
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={styles.panelCard}
                data-aos="fade-up"
                data-aos-delay="400"
            >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4">
                    <div>
                        <h4 className={styles.panelTitle}>
                            Active Membership Plan Distribution
                        </h4>
                        <p className={styles.panelDesc}>
                            Current enrollment split across {totalPlans} active
                            membership contracts
                        </p>
                    </div>
                    <span
                        className="text-secondary"
                        style={{ fontSize: "0.75rem" }}
                    >
                        All prices in Philippine Peso (₱)
                    </span>
                </div>

                                <div className={styles.distributionBar}>
                    {planDistribution.map((plan, index) => <div key={plan.id} className="fm-grow-x" style={{ width: `${totalPlans ? (plan.count / totalPlans) * 100 : 0}%`, "--i": index, backgroundColor: ["var(--primary-color)", "var(--header-text-color)", "var(--green-color)", "#f59e0b"][index % 4] }}></div>)}
                </div>

                <div className="row g-3 mt-3">
                    {planDistribution.map((plan, index) => {
                        const percentage = totalPlans ? ((plan.count / totalPlans) * 100).toFixed(1) : "0.0";
                        return <div className="col-6 col-md-3" key={plan.id}><div className={styles.distBox}><div className="d-flex align-items-center gap-2 mb-2"><span className={[styles.dotPrimary, styles.dotWhite, styles.dotGreen, styles.dotWarning][index % 4]}></span><span className={styles.distLabel}>{plan.name}</span></div><div className="d-flex align-items-baseline gap-2 mb-1"><h4 className="text-white m-0" style={{ fontFamily: "var(--heading-font)", fontWeight: "700" }}>{plan.count}</h4><span className="text-secondary" style={{ fontSize: "0.75rem" }}>({percentage}%)</span></div><span className={styles.distPrice}>₱{Number(plan.price || 0).toLocaleString()}</span></div></div>;
                    })}
                    {dashboard && !planDistribution.length && <div className="col-12 text-secondary">No active membership plans.</div>}
                </div>            </div>\n        </AdminLayout>
    );
}
