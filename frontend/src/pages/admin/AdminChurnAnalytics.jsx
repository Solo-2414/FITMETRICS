import { useState } from "react";
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
import styles from "./AdminChurnAnalytics.module.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

export default function AdminChurnAnalytics() {
    const [promptText, setPromptText] = useState(
        "We miss you at Analyn's Gym! Come get your workout in today.",
    );
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);

    const chartData = {
        labels: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr (Current)"],
        datasets: [
            {
                label: "Returning Members",
                data: [1300, 1250, 1650, 1500, 1550, 1600],
                backgroundColor: "#10b981",
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.4,
            },
            {
                label: "Total Visits",
                data: [1410, 1360, 1780, 1620, 1695, 1740],
                backgroundColor: "#38bdf8",
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.4,
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
                    font: { size: 11, family: "Inter, sans-serif" },
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
                <h1 className={styles.pageTitle}>Churn Analytics</h1>
                <p className={styles.pageDesc}>
                    Track members who stopped visiting and send friendly email
                    reminders
                </p>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Members Visited This Month</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-regular fa-circle-check"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>184</h3>
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
                            22{" "}
                            <span className={styles.kpiValueUnit}>members</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiWarning}>
                                Needs re-engagement
                            </span>
                            <span className={styles.kpiSub}>
                                · 3 sent this week
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
                            14{" "}
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
                        <h3 className={styles.kpiValue}>88%</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                renewal rate
                            </span>
                            <span className={styles.kpiSub}>
                                (+3% from last month)
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
                            <Bar data={chartData} options={chartOptions} />
                        </div>

                        <div
                            className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary text-secondary"
                            style={{ fontSize: "0.8rem" }}
                        >
                            <span>
                                Steady attendance pattern: Peak morning sessions
                                6:00 AM - 9:00 AM & Evening 5:30 PM - 8:30 PM
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
                                        22 Total
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

                        <div className="table-responsive">
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
                                                            styles.memberSince
                                                        }
                                                    >
                                                        Member since Jan 2024
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
                                                Monthly
                                            </span>
                                        </td>
                                        <td>Mar 28, 2025</td>
                                        <td>
                                            <span
                                                className={styles.badgeWarning}
                                            >
                                                16 days ago
                                            </span>
                                        </td>
                                        <td>carlos.m@example.com</td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                                Send Friendly Email
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
                                                    BB
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Bea Bautista
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        Member since Nov 2024
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
                                                Student Monthly
                                            </span>
                                        </td>
                                        <td>Mar 25, 2025</td>
                                        <td>
                                            <span
                                                className={styles.badgeWarning}
                                            >
                                                19 days ago
                                            </span>
                                        </td>
                                        <td>bea.bautista@univ.edu.ph</td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                                Send Friendly Email
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
                                                    RC
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Rafael Cruz
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        Member since Aug 2023
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
                                                Two Weeks
                                            </span>
                                        </td>
                                        <td>Mar 22, 2025</td>
                                        <td>
                                            <span
                                                className={styles.badgeDanger}
                                            >
                                                22 days ago
                                            </span>
                                        </td>
                                        <td>rafael.cruz91@gmail.com</td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                                Send Friendly Email
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
                                                    GL
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Grace Lim
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        Member since Feb 2025
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
                                                Weekly
                                            </span>
                                        </td>
                                        <td>Mar 27, 2025</td>
                                        <td>
                                            <span
                                                className={styles.badgeWarning}
                                            >
                                                17 days ago
                                            </span>
                                        </td>
                                        <td>grace.lim.design@gmail.com</td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                                Send Friendly Email
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
                                                    MR
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Mark Anthony Reyes
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.memberSince
                                                        }
                                                    >
                                                        Member since Dec 2024
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
                                                Monthly
                                            </span>
                                        </td>
                                        <td>Mar 20, 2025</td>
                                        <td>
                                            <span
                                                className={styles.badgeDanger}
                                            >
                                                24 days ago
                                            </span>
                                        </td>
                                        <td>mark.reyes88@yahoo.com</td>
                                        <td>
                                            <button
                                                className={
                                                    styles.btnActionOutline
                                                }
                                            >
                                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                                Send Friendly Email
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
                                Showing 5 of 22 inactive members
                            </span>
                            <div className="d-flex gap-2 mt-3 mt-sm-0">
                                <button className={styles.pageBtnText} disabled>
                                    Previous
                                </button>
                                <button className={styles.pageBtnText}>
                                    Page 1 of 5
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
