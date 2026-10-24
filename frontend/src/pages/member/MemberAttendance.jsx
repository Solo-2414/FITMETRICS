import { useEffect, useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import { api } from "../../lib/api";
import styles from "./MemberAttendance.module.css";

export default function MemberAttendance() {
    const [attendance, setAttendance] = useState([]);
    const [error, setError] = useState("");
    
    // Default to the current actual month and year
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed (0 = Jan, 9 = Oct, 10 = Nov)

    // Formatted current month label (e.g., "October 2026")
    const monthYearLabel = currentDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });

    // Fetch attendance data based on selected month
    useEffect(() => {
        const fromDate = new Date(year, month, 1).toISOString();
        const toDate = new Date(year, month + 1, 1).toISOString();

        api(`/attendance/me?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`)
            .then(setAttendance)
            .catch((err) => setError(err.message));
    }, [year, month]);

    // Month Navigation Handlers
    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const totalVisits = attendance.length;
    const activeDays = new Set(
        attendance.map((item) => item.check_in_at.slice(0, 10))
    ).size;

    const formatTime = (value) =>
        value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

    const duration = (row) =>
        row.check_out_at
            ? `${Math.max(1, Math.round((new Date(row.check_out_at) - new Date(row.check_in_at)) / 60000))} mins`
            : "In gym";

    // Set of visited dates YYYY-MM-DD
    const visitedDates = new Set(
        attendance.map((item) =>
            new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
                new Date(item.check_in_at)
            )
        )
    );

    // Dynamic Calendar Days Renderer
    const renderCalendarDays = (calcYear, calcMonth) => {
        const firstDay = new Date(calcYear, calcMonth, 1).getDay();
        const daysInMonth = new Date(calcYear, calcMonth + 1, 0).getDate();
        const prevMonthDays = new Date(calcYear, calcMonth, 0).getDate();

        const cells = [];

        // 1. Previous month padding days
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            cells.push(
                <div key={`prev-${dayNum}`} className={styles.calCellEmpty}>
                    {dayNum}
                </div>
            );
        }

        // 2. Current month days
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

        for (let day = 1; day <= daysInMonth; day++) {
            const monthStr = String(calcMonth + 1).padStart(2, "0");
            const dayStr = String(day).padStart(2, "0");
            const dateKey = `${calcYear}-${monthStr}-${dayStr}`;

            const isVisited = visitedDates.has(dateKey);
            const isToday = dateKey === todayStr;

            cells.push(
                <div
                    key={`current-${day}`}
                    className={`${styles.calCell} ${isToday ? styles.calCellToday : ""}`}
                >
                    {day}
                    {isVisited && <span className={styles.dotActive}></span>}
                </div>
            );
        }

        // 3. Next month trailing padding days
        const totalCells = cells.length;
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
            cells.push(
                <div key={`next-${nextDay}`} className={styles.calCellEmpty}>
                    {nextDay}
                </div>
            );
        }

        return cells;
    };

    // Export Log PDF Handler
    const exportPdfLog = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return alert("Please allow popups to export the PDF log.");

        const rowsHtml = attendance.map((row) => `
            <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">${new Date(row.check_in_at).toLocaleDateString()}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">${formatTime(row.check_in_at)}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">${formatTime(row.check_out_at)}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">${duration(row)}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">${row.method === "manual" ? "Counter Check-in" : row.method}</td>
                <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">Gym Staff</td>
                <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">${row.check_out_at ? "Completed" : "Active"}</td>
            </tr>
        `).join("");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Attendance History Log - ${monthYearLabel}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #1e293b; }
                    h1 { margin-bottom: 4px; font-size: 22px; color: #0f172a; }
                    p { margin-top: 0; color: #64748b; font-size: 13px; }
                    .stats-box { display: flex; gap: 20px; margin: 20px 0; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                    th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 10px 12px; font-weight: 600; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                </style>
            </head>
            <body>
                <h1>FITMETRICS — Attendance History Log</h1>
                <p>Analyn's Fitness Gym | Report Period: ${monthYearLabel}</p>
                <div class="stats-box">
                    <div><strong>Total Visits:</strong> ${totalVisits}</div>
                    <div><strong>Active Days:</strong> ${activeDays}</div>
                    <div><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</div>
                </div>
                <table>
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
                        ${rowsHtml.length ? rowsHtml : '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">No attendance records found for this month.</td></tr>'}
                    </tbody>
                </table>
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <MemberLayout>
            {error && <div className="alert alert-danger">{error}</div>}
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
                        <button className={styles.navArrow} onClick={handlePrevMonth} aria-label="Previous Month">
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                        <span className={styles.monthText}>
                            <i className="fa-regular fa-calendar me-2"></i>
                            {monthYearLabel}
                        </span>
                        <button className={styles.navArrow} onClick={handleNextMonth} aria-label="Next Month">
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                    <button className={styles.btnOutline} onClick={exportPdfLog}>
                        <i className="fa-solid fa-download"></i> Export Log
                    </button>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3" data-aos="fade-up" data-aos-delay="100">
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="text-secondary" style={{ fontSize: "0.75rem" }}>
                                Total Visits This Month
                            </span>
                            <i className="fa-regular fa-calendar-check text-secondary"></i>
                        </div>
                        <h3 className={styles.kpiValue}>{totalVisits} Visits</h3>
                        <span className={styles.kpiSubPositive}>
                            <i className="fa-solid fa-arrow-trend-up"></i> {monthYearLabel}
                        </span>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3" data-aos="fade-up" data-aos-delay="200">
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="text-secondary" style={{ fontSize: "0.75rem" }}>
                                Consistency Streak
                            </span>
                            <i className="fa-solid fa-fire text-success"></i>
                        </div>
                        <h3 className={styles.kpiValue}>{activeDays} Active Days</h3>
                        <span className={styles.kpiSub}>
                            Logged sessions in database
                        </span>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3" data-aos="fade-up" data-aos-delay="300">
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="text-secondary" style={{ fontSize: "0.75rem" }}>
                                Most Active Time
                            </span>
                            <i className="fa-regular fa-clock text-warning"></i>
                        </div>
                        <h3 className={styles.kpiValue}>Late Afternoon</h3>
                        <span className={styles.kpiSub}>Typical: 5:30 PM - 7:00 PM</span>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3" data-aos="fade-up" data-aos-delay="400">
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="text-secondary" style={{ fontSize: "0.75rem" }}>
                                Current Week Progress
                            </span>
                            <i className="fa-solid fa-arrow-trend-up text-primary"></i>
                        </div>
                        <div className="d-flex align-items-baseline gap-2 mb-2">
                            <h3 className={styles.kpiValue}>{Math.min(5, activeDays)}</h3>
                            <span className={styles.kpiSub}>/ 5 days</span>
                            <span className={styles.kpiTarget}>80% Target</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div style={{ width: `${Math.min(100, (activeDays / 5) * 100)}%`, backgroundColor: "var(--primary-color)" }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12 col-lg-8" data-aos="fade-right" data-aos-delay="200">
                    <div className={`${styles.panelCard} h-100 p-4 d-flex flex-column`}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                            <div>
                                <h3 className={styles.panelTitle}>
                                    {monthYearLabel} Calendar Flow
                                </h3>
                                <p className={styles.panelDesc}>
                                    Highlighted dots mark completed workout sessions
                                </p>
                            </div>
                            <div className="d-flex gap-3 text-secondary" style={{ fontSize: "0.75rem" }}>
                                <span>
                                    <span className={styles.dotActive}></span> Visited ({activeDays})
                                </span>
                                <span>
                                    <span className={styles.dotInactive}></span> Rest Day
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

                            {renderCalendarDays(year, month)}
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-top border-secondary pt-3 mt-auto text-secondary" style={{ fontSize: "0.75rem" }}>
                            <span className="text-success">
                                <i className="fa-regular fa-face-smile"></i> Great habit! You are in the top 15% most consistent members this month.
                            </span>
                            <span className="mt-2 mt-sm-0">Target: 20 Visits Goal</span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-4" data-aos="fade-left" data-aos-delay="300">
                    <div className={`${styles.instructionsCard} p-4`}>
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <i className="fa-regular fa-circle-question fs-5 text-secondary"></i>
                            <h3 className="m-0 text-white" style={{ fontFamily: "var(--heading-font)", fontSize: "1.1rem" }}>
                                How to Check In
                            </h3>
                        </div>

                        <div className="d-flex align-items-start gap-3 mb-4">
                            <div className={styles.stepNumber}>1</div>
                            <div>
                                <h5 className="text-white mb-1" style={{ fontSize: "0.95rem" }}>
                                    Give your Name
                                </h5>
                                <p className="mb-0 text-secondary" style={{ fontSize: "0.8rem", lineHeight: "1.5" }}>
                                    Inform the staff at the counter upon arrival.
                                </p>
                            </div>
                        </div>

                        <div className="d-flex align-items-start gap-3 mb-4">
                            <div className={styles.stepNumberActive}>2</div>
                            <div>
                                <h5 className="text-white mb-1" style={{ fontSize: "0.95rem" }}>
                                    You are ready to train!
                                </h5>
                                <p className="mb-0 text-secondary" style={{ fontSize: "0.8rem", lineHeight: "1.5" }}>
                                    Your visit is logged instantly in your history log below.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${styles.tableCard} p-4`} data-aos="fade-up" data-aos-delay="400">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <h3 className={styles.panelTitle}>Visit Logs</h3>
                        <span className={styles.recordBadge}>{attendance.length} records</span>
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
                            {attendance.map((row) => (
                                <tr key={row.id}>
                                    <td><i className="fa-regular fa-calendar me-1"></i>{new Date(row.check_in_at).toLocaleDateString()}</td>
                                    <td>{formatTime(row.check_in_at)}</td>
                                    <td>{formatTime(row.check_out_at)}</td>
                                    <td>{duration(row)}</td>
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="fa-solid fa-desktop text-primary"></i>
                                            {row.method === "manual" ? "Counter Check-in" : row.method}
                                        </div>
                                    </td>
                                    <td>Gym Staff</td>
                                    <td>
                                        <span className={styles.statusCompleted}>
                                            <span className={styles.dotCompleted}></span>
                                            {row.check_out_at ? "Completed" : "Active"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {attendance.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center text-secondary py-4">
                                        No attendance records found for {monthYearLabel}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 gap-3">
                    <span className="text-secondary" style={{ fontSize: "0.8rem" }}>
                        Showing {attendance.length} visits for {monthYearLabel}
                    </span>
                </div>
            </div>
        </MemberLayout>
    );
}