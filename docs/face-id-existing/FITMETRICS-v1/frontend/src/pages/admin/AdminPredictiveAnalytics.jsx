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
import styles from "./AdminPredictiveAnalytics.module.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

export default function AdminPredictiveAnalytics() {
    const chartData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
            {
                label: "Forecasted Members",
                data: [68, 52, 72, 48, 58, 64, 34],
                backgroundColor: "#38bdf8",
                borderRadius: 6,
                barPercentage: 0.7,
                categoryPercentage: 0.6,
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
                ticks: {
                    color: "#94a3b8",
                    font: { size: 12, family: "Inter, sans-serif" },
                },
            },
            y: {
                display: false,
                beginAtZero: true,
            },
        },
    };

    return (
        <AdminLayout>
            <div className="d-flex flex-column mb-4" data-aos="fade-down">
                <h1 className={styles.pageTitle}>Predictive Analytics</h1>
                <p className={styles.pageDesc}>
                    Estimated gym attendance and upcoming membership renewals
                </p>
            </div>

            <div className="row g-4 mb-4">
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
                        <h3 className={styles.kpiValue}>~65 visits</h3>
                        <div className="d-flex align-items-center mt-3 gap-2">
                            <i className="fa-regular fa-clock text-warning"></i>
                            <span className={styles.kpiSub}>
                                Peak around 6:00 PM
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
                        <h3 className={styles.kpiValue}>₱68,000</h3>
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
                        <h3 className={styles.kpiValue}>19 members</h3>
                        <div className="d-flex align-items-center mt-3 gap-2">
                            <i className="fa-solid fa-bell text-warning"></i>
                            <span className={styles.kpiSub}>
                                Follow-ups recommended
                            </span>
                        </div>
                    </div>
                </div>
            </div>

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
                                <span className={styles.dotPrimary}></span> Peak
                                Rush: 5:30 PM - 7:30 PM
                            </div>
                        </div>

                        <div className={styles.chartWrapper}>
                            <Bar data={chartData} options={chartOptions} />
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
                                Estimated average attendance: 58 members/day
                            </span>
                            <span className="mt-2 mt-md-0">
                                Typical evening rush window: 5:30 PM - 7:30 PM
                                (after-work peak)
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
                            Monday & Wednesday evenings will reach 25-30
                            concurrent members between 6 PM - 8 PM. Ensure 2
                            staff on desk.
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
                            8 students have Monthly plans expiring on Friday.
                            Remind them at front desk.
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
                                Friday Expirations
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
                                7 Members Listed
                            </span>
                        </div>

                        <div className="table-responsive">
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
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarSecondary
                                                    }
                                                >
                                                    MR
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Mark Ramos
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        mark.ramos@gmail.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-white">
                                            Monthly Student
                                        </td>
                                        <td className="text-white">
                                            Oct 25 (Friday)
                                        </td>
                                        <td>
                                            <span
                                                className={styles.badgeDanger}
                                            >
                                                In 2 days
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-envelope"></i>{" "}
                                                Send Email Reminder
                                            </button>
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
                                                    CD
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Camille De Guzman
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        camille.dg@yahoo.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-white">
                                            Monthly Regular
                                        </td>
                                        <td className="text-white">
                                            Oct 25 (Friday)
                                        </td>
                                        <td>
                                            <span
                                                className={styles.badgeDanger}
                                            >
                                                In 2 days
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-envelope"></i>{" "}
                                                Send Email Reminder
                                            </button>
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
                                                    JV
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Joshua Villanueva
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        josh.villa@gmail.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-white">
                                            Monthly Student
                                        </td>
                                        <td className="text-white">
                                            Oct 26 (Saturday)
                                        </td>
                                        <td>
                                            <span
                                                className={styles.badgeWarning}
                                            >
                                                In 3 days
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-envelope"></i>{" "}
                                                Send Email Reminder
                                            </button>
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
                                                    BT
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Bea Tolentino
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        beatolentino@gmail.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-white">
                                            Quarterly Pass
                                        </td>
                                        <td className="text-white">
                                            Oct 27 (Sunday)
                                        </td>
                                        <td>
                                            <span
                                                className={styles.badgeWarning}
                                            >
                                                In 4 days
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-envelope"></i>{" "}
                                                Send Email Reminder
                                            </button>
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
                                                    EC
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Emmanuel Cruz
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        emman.cruz@outlook.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-white">
                                            Monthly Student
                                        </td>
                                        <td className="text-white">
                                            Oct 28 (Monday)
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.badgeSecondary
                                                }
                                            >
                                                In 5 days
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-envelope"></i>{" "}
                                                Send Email Reminder
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
