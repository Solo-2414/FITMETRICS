import MemberLayout from "../../components/member/MemberLayout.jsx";
import styles from "./MemberDashboard.module.css";

export default function MemberDashboard() {
    return (
        <MemberLayout>
            <div
                className={`${styles.welcomeBanner} p-4 mb-4`}
                data-aos="fade-down"
            >
                <div className={styles.bannerBadge}>
                    <i className="fa-solid fa-location-dot"></i> Local Community
                    Member
                </div>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mt-3 gap-3">
                    <div>
                        <h1 className={styles.welcomeTitle}>
                            Welcome back, Michael!
                        </h1>
                        <p className={styles.welcomeSub}>
                            Keep up the momentum. 4 visits logged this week.
                            Coach Mark is on the floor today.
                        </p>
                    </div>
                    <button className={styles.noticeBtn}>
                        <i className="fa-solid fa-bullhorn"></i> Notice Board
                    </button>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div
                    className="col-12 col-md-4"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Current Plan
                            </span>
                            <i className="fa-regular fa-id-card text-primary fs-5"></i>
                        </div>
                        <h3 className={styles.kpiValue}>Monthly Regular</h3>
                        <div className={styles.kpiStatusPositive}>
                            <i className="fa-regular fa-circle-check"></i>{" "}
                            Active Plan
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-md-4"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Total Visits
                            </span>
                            <i className="fa-solid fa-chart-line text-primary fs-5"></i>
                        </div>
                        <h3 className={styles.kpiValue}>18 Visits</h3>
                        <div className={styles.kpiSubPositive}>
                            <i className="fa-solid fa-arrow-trend-up"></i> 4x
                            this week
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-md-4"
                    data-aos="fade-up"
                    data-aos-delay="300"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Membership Expiration
                            </span>
                            <i className="fa-regular fa-calendar-xmark text-primary fs-5"></i>
                        </div>
                        <h3 className={styles.kpiValue}>Nov 28, 2025</h3>
                        <div className={styles.kpiStatusWarning}>
                            <i className="fa-regular fa-clock"></i> 14 Days
                            Remaining
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 col-lg-8">
                    <div
                        className={`${styles.panelCard} p-4`}
                        data-aos="fade-right"
                        data-aos-delay="400"
                    >
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start mb-4 gap-3">
                            <div>
                                <span className={styles.panelLabel}>
                                    TODAY'S ROUTINE
                                </span>
                                <h4 className={styles.panelTitle}>
                                    Monday: Push Day (Chest & Shoulders)
                                </h4>
                            </div>
                            <div className={styles.timeEst}>
                                <i className="fa-solid fa-stopwatch"></i> ~50
                                Mins
                            </div>
                        </div>

                        <div className={styles.routineGrid}>
                            <div className={styles.exerciseCard}>
                                <div className={styles.exerciseNum}>1</div>
                                <h5>Barbell Bench Press</h5>
                                <p>4 sets · 8-10 reps</p>
                                <span className={styles.targetArea}>
                                    Target: Flat Bench Area
                                </span>
                            </div>
                            <div className={styles.exerciseCard}>
                                <div className={styles.exerciseNum}>2</div>
                                <h5>Incline Dumbbell Press</h5>
                                <p>3 sets · 10-12 reps</p>
                                <span className={styles.targetArea}>
                                    Target: Free Weights Rack
                                </span>
                            </div>
                            <div className={styles.exerciseCard}>
                                <div className={styles.exerciseNum}>3</div>
                                <h5>Overhead Press</h5>
                                <p>3 sets · 10 reps</p>
                                <span className={styles.targetArea}>
                                    Target: Standing Bar Area
                                </span>
                            </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-top border-secondary pt-3 mt-4 gap-3">
                            <span className={styles.footerNote}>
                                <i className="fa-regular fa-heart"></i> Warmed
                                up with 5 min light jump rope
                            </span>
                            <button className={styles.footerLink}>
                                Go to Workout Plans{" "}
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <div
                        className={`${styles.panelCard} p-4 mt-4`}
                        data-aos="fade-up"
                        data-aos-delay="500"
                    >
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start mb-4 gap-3">
                            <div>
                                <span className={styles.panelLabel}>
                                    ATTENDANCE LOG
                                </span>
                                <h4 className={styles.panelTitle}>
                                    Recent Gym Visits
                                </h4>
                            </div>
                            <button className={styles.footerLink}>
                                View Full History{" "}
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>DATE</th>
                                        <th>CHECK-IN TIME</th>
                                        <th>CHECK-OUT TIME</th>
                                        <th>METHOD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className={styles.dateActive}>
                                                <span
                                                    className={styles.dot}
                                                ></span>{" "}
                                                Today (Nov 17, 2025)
                                            </div>
                                        </td>
                                        <td>6:15 AM</td>
                                        <td>7:28 AM</td>
                                        <td>
                                            <span
                                                className={styles.methodBadge}
                                            >
                                                <i className="fa-regular fa-user"></i>{" "}
                                                Member Check-in
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Fri, Nov 15, 2025</td>
                                        <td>5:42 PM</td>
                                        <td>7:05 PM</td>
                                        <td>
                                            <span
                                                className={
                                                    styles.methodBadgeOutline
                                                }
                                            >
                                                <i className="fa-solid fa-desktop"></i>{" "}
                                                Front Desk
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Wed, Nov 13, 2025</td>
                                        <td>6:02 AM</td>
                                        <td>7:15 AM</td>
                                        <td>
                                            <span
                                                className={styles.methodBadge}
                                            >
                                                <i className="fa-regular fa-user"></i>{" "}
                                                Member Check-in
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-4">
                    <div
                        className={`${styles.panelCard} p-4`}
                        data-aos="fade-left"
                        data-aos-delay="600"
                    >
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                                <span className={styles.panelLabel}>
                                    COMMUNITY BOARD
                                </span>
                                <h4 className={styles.panelTitle}>
                                    Gym Notices
                                </h4>
                            </div>
                            <i
                                className="fa-solid fa-bullhorn fs-5"
                                style={{ color: "var(--primary-color)" }}
                            ></i>
                        </div>

                        <div className="d-flex flex-column gap-3">
                            <div className={`${styles.noticeItem} p-3`}>
                                <h6 className="d-flex align-items-center gap-2 mb-2 text-white">
                                    <i className="fa-regular fa-clock text-primary"></i>{" "}
                                    Holiday Hours This Friday
                                </h6>
                                <p
                                    className="mb-0 text-secondary"
                                    style={{
                                        fontSize: "0.8rem",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Gym is open from 6:00 AM to 9:30 PM. Regular
                                    floor coaches available until 7:00 PM.
                                </p>
                            </div>
                            <div className={`${styles.noticeItem} p-3`}>
                                <h6 className="d-flex align-items-center gap-2 mb-2 text-white">
                                    <i className="fa-solid fa-dumbbell text-success"></i>{" "}
                                    Tip from Coach Analyn
                                </h6>
                                <p
                                    className="mb-0 text-secondary"
                                    style={{
                                        fontSize: "0.8rem",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    "Remember to stay hydrated and kindly
                                    re-rack your dumbbells & plates after
                                    training. Keep the gym friendly and safe for
                                    all!"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MemberLayout>
    );
}
