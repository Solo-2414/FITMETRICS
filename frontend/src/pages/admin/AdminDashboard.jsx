import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminDashboard.module.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

export default function AdminDashboard() {
    const chartData = {
        labels: [
            "6a",
            "7a",
            "8a",
            "10a",
            "12p",
            "2p",
            "4p",
            "5p",
            "6p",
            "7p",
            "8p",
            "9p",
        ],
        datasets: [
            {
                label: "Visits",
                data: [4, 6, 8, 5, 12, 10, 14, 18, 22, 16, 9, 5],
                backgroundColor: (context) => {
                    const value = context.raw;
                    return value >= 20 ? "#f59e0b" : "#38bdf8";
                },
                borderRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#1e293b",
                titleColor: "#f8fafc",
                bodyColor: "#94a3b8",
                borderColor: "#334155",
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                grid: { display: false, drawBorder: false },
                ticks: { color: "#94a3b8", font: { size: 10 } },
            },
            y: {
                display: false,
            },
        },
    };

    return (
        <AdminLayout>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                <div>
                    <h1 className={styles.pageTitle}>Dashboard</h1>
                    <p className={styles.pageDesc}>
                        Daily summary, member attendance, and gym sales overview
                    </p>
                </div>
                <div className={styles.timeBadge}>
                    <i className="fa-regular fa-calendar"></i> Today: Friday,
                    October 24{" "}
                    <span className={styles.shiftText}>Evening Shift</span>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Today's Sales</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-money-bill"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>₱4,850</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>Cash & GCash</span>
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                +18% vs yesterday
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
                        <h3 className={styles.kpiValue}>184 Members</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>
                                82% on monthly
                            </span>
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-plus"></i> 6 new this
                                week
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
                        <h3 className={styles.kpiValue}>56 Visits</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>
                                Est. 80 peak total
                            </span>
                            <span className={styles.kpiHighlight}>
                                Avg 1.2h duration
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
                        <h3 className={styles.kpiValue}>8 Members</h3>
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
                                    Peak Evening (18-22 visits)
                                </span>
                            </div>
                        </div>

                        <div className={styles.capacityNotice}>
                            <i className="fa-regular fa-circle-check text-success"></i>
                            <span>
                                Gym capacity comfortable{" "}
                                <strong>(Max occupancy 35 persons)</strong> ·
                                Peak window: <strong>5:30 PM - 7:30 PM</strong>
                            </span>
                        </div>

                        <div className={styles.chartWrapper}>
                            <Bar data={chartData} options={chartOptions} />
                        </div>

                        <div
                            className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary text-secondary"
                            style={{ fontSize: "0.8rem" }}
                        >
                            <span>Morning rush: 7:00 AM (7 visits)</span>
                            <span className="text-white fw-bold">
                                Current Floor Crowd: 24 members
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
                                View all 56 visits today{" "}
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>MEMBER NAME & ID</th>
                                        <th>PLAN</th>
                                        <th>CHECK-IN TIME</th>
                                        <th>RECORDED BY</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Jerome Bautista
                                            </strong>
                                            <span className={styles.memberId}>
                                                #FM-1042
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeOutline
                                                }
                                            >
                                                Monthly
                                            </span>
                                        </td>
                                        <td className="text-white">5:42 PM</td>
                                        <td>Staff Juan</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Kimberly Cruz
                                            </strong>
                                            <span className={styles.memberId}>
                                                #FM-1088
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgePrimary
                                                }
                                            >
                                                Student Monthly
                                            </span>
                                        </td>
                                        <td className="text-white">5:38 PM</td>
                                        <td>Staff Maria</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Ramon Mercado
                                            </strong>
                                            <span className={styles.memberId}>
                                                #FM-Walkin-12
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeWarning
                                                }
                                            >
                                                Session P90
                                            </span>
                                        </td>
                                        <td className="text-white">5:31 PM</td>
                                        <td>Staff Juan</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Dennis Villanueva
                                            </strong>
                                            <span className={styles.memberId}>
                                                #FM-0994
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeOutline
                                                }
                                            >
                                                Weekly Plan
                                            </span>
                                        </td>
                                        <td className="text-white">5:24 PM</td>
                                        <td>Staff Maria</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Camille Solis
                                            </strong>
                                            <span className={styles.memberId}>
                                                #FM-1102
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeOutline
                                                }
                                            >
                                                Monthly
                                            </span>
                                        </td>
                                        <td className="text-white">5:15 PM</td>
                                        <td>Staff Juan</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
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
                                3 Days Window
                            </span>
                        </div>
                        <p
                            className={styles.panelDesc}
                            style={{ marginBottom: "24px" }}
                        >
                            Polite email notifications ready to send to members
                        </p>

                        <div className="d-flex flex-column gap-3 mb-4">
                            <div className={styles.expiringCard}>
                                <div>
                                    <h6 className="text-white mb-1">
                                        Grace Tan
                                    </h6>
                                    <div
                                        className="text-danger"
                                        style={{
                                            fontSize: "0.75rem",
                                            fontWeight: "600",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        <i className="fa-regular fa-clock"></i>{" "}
                                        Expires Tomorrow
                                    </div>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        Regular Monthly (₱990)
                                    </span>
                                </div>
                                <button className={styles.btnActionOutline}>
                                    <i className="fa-regular fa-envelope"></i>{" "}
                                    Send Email
                                </button>
                            </div>

                            <div className={styles.expiringCard}>
                                <div>
                                    <h6 className="text-white mb-1">
                                        Carlo Dizon
                                    </h6>
                                    <div
                                        className="text-warning"
                                        style={{
                                            fontSize: "0.75rem",
                                            fontWeight: "600",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        <i className="fa-regular fa-clock"></i>{" "}
                                        Expires in 2 days
                                    </div>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        Student Monthly (₱750)
                                    </span>
                                </div>
                                <button className={styles.btnActionOutline}>
                                    <i className="fa-regular fa-envelope"></i>{" "}
                                    Send Email
                                </button>
                            </div>

                            <div className={styles.expiringCard}>
                                <div>
                                    <h6 className="text-white mb-1">
                                        Sheryl Ramos
                                    </h6>
                                    <div
                                        className="text-secondary"
                                        style={{
                                            fontSize: "0.75rem",
                                            fontWeight: "600",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        <i className="fa-regular fa-clock"></i>{" "}
                                        Expires in 3 days
                                    </div>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        Two Weeks Plan (₱540)
                                    </span>
                                </div>
                                <button className={styles.btnActionOutline}>
                                    <i className="fa-regular fa-envelope"></i>{" "}
                                    Send Email
                                </button>
                            </div>
                        </div>

                        <button className={styles.btnPrimaryFull}>
                            <i className="fa-solid fa-paper-plane"></i> Send
                            Email Reminder to All 8 Members
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
                            Current enrollment split across 184 active
                            subscription contracts and today's sessions
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
                    <div
                        style={{
                            width: "53.2%",
                            backgroundColor: "var(--primary-color)",
                        }}
                    ></div>
                    <div
                        style={{
                            width: "29.3%",
                            backgroundColor: "var(--header-text-color)",
                        }}
                    ></div>
                    <div
                        style={{
                            width: "9.7%",
                            backgroundColor: "var(--green-color)",
                        }}
                    ></div>
                    <div
                        style={{ width: "7.6%", backgroundColor: "#f59e0b" }}
                    ></div>
                </div>

                <div className="row g-3 mt-3">
                    <div className="col-6 col-md-3">
                        <div className={styles.distBox}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className={styles.dotPrimary}></span>
                                <span className={styles.distLabel}>
                                    Monthly (Regular)
                                </span>
                            </div>
                            <div className="d-flex align-items-baseline gap-2 mb-1">
                                <h4
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontWeight: "700",
                                    }}
                                >
                                    98
                                </h4>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    (53.2%)
                                </span>
                            </div>
                            <span className={styles.distPrice}>
                                ₱990 / month
                            </span>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className={styles.distBox}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className={styles.dotWhite}></span>
                                <span className={styles.distLabel}>
                                    Student Monthly
                                </span>
                            </div>
                            <div className="d-flex align-items-baseline gap-2 mb-1">
                                <h4
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontWeight: "700",
                                    }}
                                >
                                    54
                                </h4>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    (29.3%)
                                </span>
                            </div>
                            <span className={styles.distPrice}>
                                ₱750 / month
                            </span>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className={styles.distBox}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className={styles.dotGreen}></span>
                                <span className={styles.distLabel}>
                                    Two Weeks Plan
                                </span>
                            </div>
                            <div className="d-flex align-items-baseline gap-2 mb-1">
                                <h4
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontWeight: "700",
                                    }}
                                >
                                    18
                                </h4>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    (9.7%)
                                </span>
                            </div>
                            <span className={styles.distPrice}>
                                ₱540 / 14 days
                            </span>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className={styles.distBox}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className={styles.dotWarning}></span>
                                <span className={styles.distLabel}>
                                    Weekly Plan
                                </span>
                            </div>
                            <div className="d-flex align-items-baseline gap-2 mb-1">
                                <h4
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontWeight: "700",
                                    }}
                                >
                                    14
                                </h4>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    (7.6%)
                                </span>
                            </div>
                            <span className={styles.distPrice}>
                                ₱270 / week
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
