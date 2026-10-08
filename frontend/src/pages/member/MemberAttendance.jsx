import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberAttendance.module.css";

export default function MemberAttendance() {
    return (
        <MemberLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3"
                data-aos="fade-down"
                data-aos-delay="100"
            >
                <div>
                    <h1 className={styles.pageTitle}>Attendance History</h1>
                    <p className={styles.pageDesc}>
                        Review your gym check-ins, weekly consistency, and
                        workout streak at Analyn's Gym.
                    </p>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <div className={styles.monthNav}>
                        <button className={styles.navArrow}>
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <span className={styles.monthText}>
                            <i className="fa-regular fa-calendar"></i> November
                            2026
                        </span>
                        <button className={styles.navArrow}>
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                    <button className={styles.btnOutline}>
                        <i className="fa-solid fa-download"></i> Export Log
                    </button>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div
                    className="col-12 col-sm-6 col-xl-3"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.75rem" }}
                            >
                                Total Visits This Month
                            </span>
                            <i className="fa-regular fa-calendar-check text-secondary"></i>
                        </div>
                        <h3 className={styles.kpiValue}>18 Visits</h3>
                        <span className={styles.kpiSubPositive}>
                            <i className="fa-solid fa-arrow-trend-up"></i> +3
                            visits vs last month
                        </span>
                    </div>
                </div>
                <div
                    className="col-12 col-sm-6 col-xl-3"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.75rem" }}
                            >
                                Consistency Streak
                            </span>
                            <i className="fa-solid fa-fire text-success"></i>
                        </div>
                        <h3 className={styles.kpiValue}>4 Weeks Consistent</h3>
                        <span className={styles.kpiSub}>
                            Averaging 4 visits per week
                        </span>
                    </div>
                </div>
                <div
                    className="col-12 col-sm-6 col-xl-3"
                    data-aos="fade-up"
                    data-aos-delay="300"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.75rem" }}
                            >
                                Most Active Time
                            </span>
                            <i className="fa-regular fa-clock text-warning"></i>
                        </div>
                        <h3 className={styles.kpiValue}>Late Afternoon</h3>
                        <span className={styles.kpiSub}>
                            Typical: 5:30 PM - 7:00 PM
                        </span>
                    </div>
                </div>
                <div
                    className="col-12 col-sm-6 col-xl-3"
                    data-aos="fade-up"
                    data-aos-delay="400"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.75rem" }}
                            >
                                Current Week Progress
                            </span>
                            <i className="fa-solid fa-arrow-trend-up text-primary"></i>
                        </div>
                        <div className="d-flex align-items-baseline gap-2 mb-2">
                            <h3 className={styles.kpiValue}>4</h3>
                            <span className={styles.kpiSub}>/ 5 days</span>
                            <span className={styles.kpiTarget}>80% Target</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div
                                style={{
                                    width: "80%",
                                    backgroundColor: "var(--primary-color)",
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div
                    className="col-12 col-lg-8"
                    data-aos="fade-right"
                    data-aos-delay="200"
                >
                    <div
                        className={`${styles.panelCard} h-100 p-4 d-flex flex-column`}
                    >
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                            <div>
                                <h3 className={styles.panelTitle}>
                                    November 2026 Calendar Flow
                                </h3>
                                <p className={styles.panelDesc}>
                                    Highlighted dots mark completed workout
                                    sessions
                                </p>
                            </div>
                            <div
                                className="d-flex gap-3 text-secondary"
                                style={{ fontSize: "0.75rem" }}
                            >
                                <span>
                                    <span className={styles.dotActive}></span>{" "}
                                    Visited (18)
                                </span>
                                <span>
                                    <span className={styles.dotInactive}></span>{" "}
                                    Rest Day
                                </span>
                            </div>
                        </div>

                        <div className={styles.calendarGrid}>
                            <div className={styles.calHeader}>SUN</div>
                            <div className={styles.calHeader}>MON</div>
                            <div className={styles.calHeader}>TUE</div>
                            <div className={styles.calHeader}>WED</div>
                            <div className={styles.calHeader}>THU</div>
                            <div className={styles.calHeader}>FRI</div>
                            <div className={styles.calHeader}>SAT</div>

                            <div className={styles.calCellEmpty}>26</div>
                            <div className={styles.calCellEmpty}>27</div>
                            <div className={styles.calCellEmpty}>28</div>
                            <div className={styles.calCellEmpty}>29</div>
                            <div className={styles.calCellEmpty}>30</div>
                            <div className={styles.calCellEmpty}>31</div>
                            <div className={styles.calCell}>
                                1<span className={styles.dotActive}></span>
                            </div>

                            <div className={styles.calCell}>2</div>
                            <div className={styles.calCell}>
                                3<span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                4<span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                5<span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>6</div>
                            <div className={styles.calCell}>
                                7<span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>8</div>

                            <div className={styles.calCell}>9</div>
                            <div className={styles.calCell}>
                                10
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                11
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                12
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                13
                                <span className={styles.dotActive}></span>
                            </div>
                            <div
                                className={`${styles.calCell} ${styles.calCellToday}`}
                            >
                                14
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>15</div>

                            <div className={styles.calCell}>16</div>
                            <div className={styles.calCell}>
                                17
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                18
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                19
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                20
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>21</div>
                            <div className={styles.calCell}>
                                22
                                <span className={styles.dotActive}></span>
                            </div>

                            <div className={styles.calCell}>23</div>
                            <div className={styles.calCell}>
                                24
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                25
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                26
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>
                                27
                                <span className={styles.dotActive}></span>
                            </div>
                            <div className={styles.calCell}>28</div>
                            <div className={styles.calCell}>29</div>

                            <div className={styles.calCell}>30</div>
                            <div className={styles.calCellEmpty}>1</div>
                            <div className={styles.calCellEmpty}>2</div>
                            <div className={styles.calCellEmpty}>3</div>
                            <div className={styles.calCellEmpty}>4</div>
                            <div className={styles.calCellEmpty}>5</div>
                            <div className={styles.calCellEmpty}>6</div>
                        </div>

                        <div
                            className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-top border-secondary pt-3 mt-auto text-secondary"
                            style={{ fontSize: "0.75rem" }}
                        >
                            <span className="text-success">
                                <i className="fa-regular fa-face-smile"></i>{" "}
                                Great habit! You are in the top 15% most
                                consistent members this month.
                            </span>
                            <span className="mt-2 mt-sm-0">
                                Target: 20 Visits Goal
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-lg-4"
                    data-aos="fade-left"
                    data-aos-delay="300"
                >
                    <div className={`${styles.instructionsCard} p-4`}>
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <i className="fa-regular fa-circle-question fs-5 text-secondary"></i>
                            <h3
                                className="m-0 text-white"
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    fontSize: "1.1rem",
                                }}
                            >
                                How to Check In
                            </h3>
                        </div>

                        <div className="d-flex align-items-start gap-3 mb-4">
                            <div className={styles.stepNumber}>1</div>
                            <div>
                                <h5
                                    className="text-white mb-1"
                                    style={{ fontSize: "0.95rem" }}
                                >
                                    Give your Name
                                </h5>
                                <p
                                    className="mb-0 text-secondary"
                                    style={{
                                        fontSize: "0.8rem",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Inform the staff at the counter upon
                                    arrival.
                                </p>
                            </div>
                        </div>

                        <div className="d-flex align-items-start gap-3 mb-4">
                            <div className={styles.stepNumberActive}>2</div>
                            <div>
                                <h5
                                    className="text-white mb-1"
                                    style={{ fontSize: "0.95rem" }}
                                >
                                    You are ready to train!
                                </h5>
                                <p
                                    className="mb-0 text-secondary"
                                    style={{
                                        fontSize: "0.8rem",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Your visit is logged instantly in your
                                    history log below.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={`${styles.tableCard} p-4`}
                data-aos="fade-up"
                data-aos-delay="400"
            >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <h3 className={styles.panelTitle}>Visit Logs</h3>
                        <span className={styles.recordBadge}>18 records</span>
                    </div>
                    <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-2">
                        <div className={styles.searchBox}>
                            <i className="fa-solid fa-magnifying-glass"></i>
                            <input
                                type="text"
                                placeholder="Search by date or month..."
                            />
                        </div>
                        <button className={styles.btnFilter}>
                            <i className="fa-solid fa-filter"></i> Filter
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className={`table ${styles.customTable}`}>
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>TIME IN</th>
                                <th>TIME OUT</th>
                                <th>DURATION</th>
                                <th>CHECK-IN METHOD</th>
                                <th>RECORDED BY</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fa-regular fa-calendar"></i>{" "}
                                        Nov 14, 2026
                                        <span className={styles.todayBadge}>
                                            Today
                                        </span>
                                    </div>
                                </td>
                                <td>05:42 PM</td>
                                <td>07:05 PM</td>
                                <td>1 hr 23 mins</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fa-solid fa-desktop text-primary"></i>{" "}
                                        Counter Check-in
                                    </div>
                                </td>
                                <td>Staff</td>
                                <td>
                                    <span className={styles.statusCompleted}>
                                        <span
                                            className={styles.dotCompleted}
                                        ></span>{" "}
                                        Completed
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <i className="fa-regular fa-calendar text-secondary"></i>{" "}
                                    Nov 13, 2026
                                </td>
                                <td>05:35 PM</td>
                                <td>06:50 PM</td>
                                <td>1 hr 15 mins</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fa-solid fa-desktop text-primary"></i>{" "}
                                        Counter Check-in
                                    </div>
                                </td>
                                <td>Staff</td>
                                <td>
                                    <span className={styles.statusCompleted}>
                                        <span
                                            className={styles.dotCompleted}
                                        ></span>{" "}
                                        Completed
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <i className="fa-regular fa-calendar text-secondary"></i>{" "}
                                    Nov 12, 2026
                                </td>
                                <td>06:05 PM</td>
                                <td>07:40 PM</td>
                                <td>1 hr 35 mins</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fa-solid fa-desktop text-primary"></i>{" "}
                                        Counter Check-in
                                    </div>
                                </td>
                                <td>Staff</td>
                                <td>
                                    <span className={styles.statusCompleted}>
                                        <span
                                            className={styles.dotCompleted}
                                        ></span>{" "}
                                        Completed
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <i className="fa-regular fa-calendar text-secondary"></i>{" "}
                                    Nov 11, 2026
                                </td>
                                <td>05:15 PM</td>
                                <td>06:30 PM</td>
                                <td>1 hr 15 mins</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fa-solid fa-desktop text-primary"></i>{" "}
                                        Counter Check-in
                                    </div>
                                </td>
                                <td>Staff</td>
                                <td>
                                    <span className={styles.statusCompleted}>
                                        <span
                                            className={styles.dotCompleted}
                                        ></span>{" "}
                                        Completed
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <i className="fa-regular fa-calendar text-secondary"></i>{" "}
                                    Nov 10, 2026
                                </td>
                                <td>05:50 PM</td>
                                <td>07:10 PM</td>
                                <td>1 hr 20 mins</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fa-solid fa-desktop text-primary"></i>{" "}
                                        Counter Check-in
                                    </div>
                                </td>
                                <td>Staff</td>
                                <td>
                                    <span className={styles.statusCompleted}>
                                        <span
                                            className={styles.dotCompleted}
                                        ></span>{" "}
                                        Completed
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <i className="fa-regular fa-calendar text-secondary"></i>{" "}
                                    Nov 08, 2026
                                </td>
                                <td>09:10 AM</td>
                                <td>10:45 AM</td>
                                <td>1 hr 35 mins</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fa-solid fa-desktop text-primary"></i>{" "}
                                        Counter Check-in
                                    </div>
                                </td>
                                <td>Staff</td>
                                <td>
                                    <span className={styles.statusCompleted}>
                                        <span
                                            className={styles.dotCompleted}
                                        ></span>{" "}
                                        Completed
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 gap-3">
                    <span
                        className="text-secondary"
                        style={{ fontSize: "0.8rem" }}
                    >
                        Showing 1-6 of 18 visits
                    </span>
                    <div className="d-flex gap-2">
                        <button className={styles.pageBtnText} disabled>
                            Previous
                        </button>
                        <button
                            className={`${styles.pageBtn} ${styles.pageActive}`}
                        >
                            1
                        </button>
                        <button className={styles.pageBtn}>2</button>
                        <button className={styles.pageBtn}>3</button>
                        <button className={styles.pageBtnText}>Next</button>
                    </div>
                </div>
            </div>
        </MemberLayout>
    );
}
