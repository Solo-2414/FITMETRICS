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
import styles from "./AdminAttendanceAnalysis.module.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

export default function AdminAttendanceAnalysis() {
    const chartData = {
        labels: [
            "6 AM",
            "8 AM",
            "10 AM",
            "12 PM",
            "2 PM",
            "4 PM",
            "6 PM",
            "8 PM",
        ],
        datasets: [
            {
                label: "Visits",
                data: [5, 6, 4, 8, 7, 12, 28, 14],
                backgroundColor: (context) => {
                    const value = context.raw;
                    return value === 28 ? "#f59e0b" : "#38bdf8";
                },
                borderRadius: 4,
                barPercentage: 0.8,
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
                    color: (context) =>
                        context.tick.label === "6 PM" ? "#f59e0b" : "#94a3b8",
                    font: {
                        size: 11,
                        family: "Inter, sans-serif",
                        weight: (context) =>
                            context.tick.label === "6 PM" ? "bold" : "normal",
                    },
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
                <h1 className={styles.pageTitle}>Attendance Analysis</h1>
                <p className={styles.pageDesc}>
                    Review daily member check-ins, peak visiting hours, and gym
                    foot traffic
                </p>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Today's Total Check-Ins</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-list-check"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            56{" "}
                            <span className={styles.kpiValueUnit}>visits</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-up"></i> +12% vs
                                yesterday
                            </span>
                            <span className={styles.kpiSub}>Target: 70</span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Current People in Gym</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            24{" "}
                            <span className={styles.kpiValueUnit}>
                                active members
                            </span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiLive}>
                                <span className={styles.liveDot}></span> Floor
                                capacity: 48% full
                            </span>
                            <span className={styles.kpiSub}>Live</span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Busiest Time of Day</span>
                            <div className={styles.iconBoxWarning}>
                                <i className="fa-regular fa-clock"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValueText}>
                            5:30 PM - 7:30 PM
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiWarning}>
                                <i className="fa-solid fa-fire"></i> Evening
                                Rush
                            </span>
                            <span className={styles.kpiSub}>
                                ~28 checked in
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Most Active Day</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-regular fa-calendar"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValueText}>Mon & Wed</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiPrimary}>
                                Avg 68 visits
                            </span>
                            <span className={styles.kpiSub}>Weekly peak</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div
                    className="col-12 col-xl-8"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className={styles.chartCard}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                            <div>
                                <h4 className={styles.panelTitle}>
                                    Today's Check-Ins by Hour
                                </h4>
                                <p className={styles.panelDesc}>
                                    6:00 AM to 9:30 PM · Highlighting Evening
                                    Rush
                                </p>
                            </div>
                            <div className={styles.chartLegendOutline}>
                                <span className={styles.dotWarning}></span> Peak
                                Window: <strong>5:30 PM - 7:30 PM</strong>
                            </div>
                        </div>

                        <div className={styles.chartWrapper}>
                            <Bar data={chartData} options={chartOptions} />
                        </div>

                        <div
                            className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary text-secondary"
                            style={{ fontSize: "0.8rem" }}
                        >
                            <div className="d-flex gap-4">
                                <span className="d-flex align-items-center gap-2">
                                    <div
                                        className={styles.legendBoxPrimary}
                                    ></div>{" "}
                                    Standard Hours
                                </span>
                                <span className="d-flex align-items-center gap-2">
                                    <div
                                        className={styles.legendBoxWarning}
                                    ></div>{" "}
                                    Peak Rush (5:30 - 7:30 PM)
                                </span>
                            </div>
                            <span>Recorded via Front Desk Log</span>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-xl-4"
                    data-aos="fade-left"
                    data-aos-delay="200"
                >
                    <div className={styles.panelCard}>
                        <div className="mb-4">
                            <h4 className={styles.panelTitle}>
                                Day of Week Comparison
                            </h4>
                            <p className={styles.panelDesc}>
                                Average attendance per weekday
                            </p>
                        </div>

                        <div className="d-flex flex-column gap-3 mb-4">
                            <div className={styles.progressItem}>
                                <div className="d-flex justify-content-between align-items-end mb-1">
                                    <span className="text-white fw-bold">
                                        Mon
                                    </span>
                                    <span
                                        className="text-white"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        70 visits (Peak)
                                    </span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div
                                        className={
                                            styles.progressBarFillPrimary
                                        }
                                        style={{ width: "100%" }}
                                    ></div>
                                </div>
                            </div>

                            <div className={styles.progressItem}>
                                <div className="d-flex justify-content-between align-items-end mb-1">
                                    <span className="text-secondary">Tue</span>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        52 visits
                                    </span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div
                                        className={
                                            styles.progressBarFillSecondary
                                        }
                                        style={{ width: "74%" }}
                                    ></div>
                                </div>
                            </div>

                            <div className={styles.progressItem}>
                                <div className="d-flex justify-content-between align-items-end mb-1">
                                    <span className="text-white fw-bold">
                                        Wed
                                    </span>
                                    <span
                                        className="text-white"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        66 visits (Peak)
                                    </span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div
                                        className={
                                            styles.progressBarFillPrimary
                                        }
                                        style={{ width: "94%" }}
                                    ></div>
                                </div>
                            </div>

                            <div className={styles.progressItem}>
                                <div className="d-flex justify-content-between align-items-end mb-1">
                                    <span className="text-secondary">Thu</span>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        48 visits
                                    </span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div
                                        className={
                                            styles.progressBarFillSecondary
                                        }
                                        style={{ width: "68%" }}
                                    ></div>
                                </div>
                            </div>

                            <div className={styles.progressItem}>
                                <div className="d-flex justify-content-between align-items-end mb-1">
                                    <span className="text-secondary">Fri</span>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        58 visits
                                    </span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div
                                        className={
                                            styles.progressBarFillSecondary
                                        }
                                        style={{ width: "82%" }}
                                    ></div>
                                </div>
                            </div>

                            <div className={styles.progressItem}>
                                <div className="d-flex justify-content-between align-items-end mb-1">
                                    <span className="text-secondary">Sat</span>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        42 visits
                                    </span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div
                                        className={
                                            styles.progressBarFillSecondary
                                        }
                                        style={{ width: "60%" }}
                                    ></div>
                                </div>
                            </div>

                            <div className={styles.progressItem}>
                                <div className="d-flex justify-content-between align-items-end mb-1">
                                    <span className="text-secondary">Sun</span>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        25 visits
                                    </span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div
                                        className={
                                            styles.progressBarFillSecondary
                                        }
                                        style={{ width: "35%" }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-top border-secondary text-center">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                Weekend schedule: 7:00 AM - 7:00 PM
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12" data-aos="fade-up" data-aos-delay="300">
                    <div className={styles.panelCard}>
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
                            <div>
                                <h4 className={styles.panelTitle}>
                                    Check-In History Log
                                </h4>
                                <p className={styles.panelDesc}>
                                    Real-time attendance ledger recorded by
                                    staff
                                </p>
                            </div>
                            <div className="d-flex flex-column flex-sm-row gap-3">
                                <div className={styles.searchBox}>
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                    <input
                                        type="text"
                                        placeholder="Search member name..."
                                    />
                                </div>
                                <div className={styles.filterGroup}>
                                    <button className={styles.filterBtnActive}>
                                        Today
                                    </button>
                                    <button className={styles.filterBtn}>
                                        Yesterday
                                    </button>
                                    <button className={styles.filterBtn}>
                                        This Week
                                    </button>
                                </div>
                                <select className={styles.filterSelect}>
                                    <option>All Plans</option>
                                    <option>Monthly</option>
                                    <option>Student</option>
                                    <option>Walk-In</option>
                                </select>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>MEMBER NAME</th>
                                        <th>MEMBERSHIP PLAN</th>
                                        <th>TIME IN</th>
                                        <th>RECORDED BY</th>
                                        <th className="text-end">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className={styles.avatar}>
                                                    RC
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Roberto Cruz
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberId
                                                        }
                                                    >
                                                        Member #0421
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeOutline
                                                }
                                            >
                                                Monthly Unlimited
                                            </span>
                                        </td>
                                        <td className="text-white fw-bold">
                                            06:14 PM
                                        </td>
                                        <td>
                                            <span className="d-flex align-items-center gap-2">
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Staff Juan
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className={styles.btnActionIcon}
                                            >
                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                            </button>
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
                                                    MA
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Maria Angela Reyes
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberId
                                                        }
                                                    >
                                                        Member #0189
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgePrimary
                                                }
                                            >
                                                Student Pass
                                            </span>
                                        </td>
                                        <td className="text-white fw-bold">
                                            05:55 PM
                                        </td>
                                        <td>
                                            <span className="d-flex align-items-center gap-2">
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Staff Maria
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className={styles.btnActionIcon}
                                            >
                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                            </button>
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
                                                    CD
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Christian Dave Tan
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberId
                                                        }
                                                    >
                                                        Walk-in #0988
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeWarning
                                                }
                                            >
                                                Daily Walk-In
                                            </span>
                                        </td>
                                        <td className="text-white fw-bold">
                                            05:42 PM
                                        </td>
                                        <td>
                                            <span className="d-flex align-items-center gap-2">
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Staff Juan
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className={styles.btnActionIcon}
                                            >
                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                            </button>
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
                                                    GP
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Gabriel Panganiban
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberId
                                                        }
                                                    >
                                                        Member #0034
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgePrimary
                                                }
                                            >
                                                Annual VIP
                                            </span>
                                        </td>
                                        <td className="text-white fw-bold">
                                            05:35 PM
                                        </td>
                                        <td>
                                            <span className="d-flex align-items-center gap-2">
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Staff Maria
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className={styles.btnActionIcon}
                                            >
                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className={styles.avatar}>
                                                    JL
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Jessica Lim
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberId
                                                        }
                                                    >
                                                        Member #0211
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.planBadgeOutline
                                                }
                                            >
                                                Monthly Unlimited
                                            </span>
                                        </td>
                                        <td className="text-white fw-bold">
                                            05:12 PM
                                        </td>
                                        <td>
                                            <span className="d-flex align-items-center gap-2">
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Staff Juan
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <button
                                                className={styles.btnActionIcon}
                                            >
                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Showing 5 of 56 visits recorded today
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
                </div>
            </div>
        </AdminLayout>
    );
}
