import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminReports.module.css";

export default function AdminReports() {
    return (
        <AdminLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Reports</h1>
                    <p className={styles.pageDesc}>
                        Download simple daily, weekly, and monthly gym sales and
                        attendance summaries
                    </p>
                </div>
                <div className={styles.syncBadge}>
                    <i className="fa-regular fa-clock"></i> Last synchronized:
                    Today at 2:45 PM
                </div>
            </div>

            <div
                className={styles.filterPanel}
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="row g-3 align-items-end">
                    <div className="col-12 col-md-3">
                        <label className={styles.filterLabel}>
                            REPORT MONTH
                        </label>
                        <select className={styles.filterSelect}>
                            <option>October 2026</option>
                            <option>September 2026</option>
                            <option>August 2026</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-3">
                        <label className={styles.filterLabel}>
                            PLAN CATEGORY
                        </label>
                        <select className={styles.filterSelect}>
                            <option>All Plans</option>
                            <option>Monthly Plans</option>
                            <option>Student Passes</option>
                            <option>Walk-Ins</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-4">
                        <label className={styles.filterLabel}>
                            SHIFT WINDOW
                        </label>
                        <select className={styles.filterSelect}>
                            <option>All Shifts (Morning & Evening)</option>
                            <option>Morning (06:00 - 14:00)</option>
                            <option>Evening (14:00 - 22:00)</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-2">
                        <button className={styles.btnGenerate}>
                            <i className="fa-solid fa-filter"></i> Generate
                            Summary
                        </button>
                    </div>
                </div>
            </div>

            <div
                className="row g-3 mb-5"
                data-aos="fade-up"
                data-aos-delay="200"
            >
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>This Month's Gym Sales</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-money-bill"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>₱68,450</h3>
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                14.2%
                            </span>
                            <span className={styles.kpiSub}>(Memberships)</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto border-top border-secondary pt-3">
                            <span className={styles.kpiSub}>
                                Day Passes: ₱4,500
                            </span>
                            <span className={styles.kpiStatusSuccess}>
                                Healthy
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Cash Collected</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-solid fa-cash-register"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>₱42,150</h3>
                        <div className="mb-3">
                            <span className={styles.kpiSub}>
                                61.5% of total revenue
                            </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto border-top border-secondary pt-3">
                            <span className={styles.kpiSub}>
                                Drawer count verified
                            </span>
                            <span className={styles.kpiStatusNeutral}>
                                Front Desk Lockbox
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>GCash / Online Collected</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-mobile-screen"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>₱26,300</h3>
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                22.8%
                            </span>
                            <span className={styles.kpiSub}>QR Transfers</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto border-top border-secondary pt-3">
                            <span className={styles.kpiSub}>
                                GCash Express QR #0917
                            </span>
                            <span className={styles.kpiStatusPrimary}>
                                Direct E-wallet
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Total Check-Ins</span>
                            <div className={styles.iconBoxSecondary}>
                                <i className="fa-solid fa-fingerprint"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            1,420{" "}
                            <span className={styles.kpiValueUnit}>visits</span>
                        </h3>
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                52 visits/day avg
                            </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto border-top border-secondary pt-3">
                            <span className={styles.kpiSub}>
                                Peak: 5:30 PM - 8:00 PM
                            </span>
                            <span className={styles.kpiStatusNeutral}>
                                Turnstile active
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4"
                data-aos="fade-up"
                data-aos-delay="300"
            >
                <h3 className={styles.sectionTitle}>
                    <i className="fa-solid fa-download me-2"></i> Quick Export
                </h3>
                <span className={styles.sectionSubtitle}>
                    Instant CSV table exports & ready-to-print administrative
                    PDFs
                </span>
            </div>

            <div
                className="row g-4 mb-5"
                data-aos="fade-up"
                data-aos-delay="400"
            >
                <div className="col-12 col-xl-6">
                    <div className={styles.exportCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-start gap-3">
                                <div className={styles.exportIconBox}>
                                    <i className="fa-solid fa-file-invoice-dollar"></i>
                                </div>
                                <div>
                                    <h4 className={styles.exportTitle}>
                                        Monthly Sales Summary
                                    </h4>
                                    <p className={styles.exportDesc}>
                                        Comprehensive itemized revenue breakdown
                                        across all pass categories & front desk
                                        amenities.
                                    </p>
                                </div>
                            </div>
                            <span className={styles.badgePrimary}>Revenue</span>
                        </div>
                        <ul className={styles.bulletList}>
                            <li>Monthly VIP Passes (78 sold)</li>
                            <li>Weekly & 2-Week Passes (42 sold)</li>
                            <li>Daily Walk-Ins (194 passes)</li>
                        </ul>
                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnExportPrimary}>
                                <i className="fa-solid fa-file-pdf"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnExportSecondary}>
                                <i className="fa-solid fa-file-csv"></i> Export
                                Excel / CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-6">
                    <div className={styles.exportCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-start gap-3">
                                <div className={styles.exportIconBoxSuccess}>
                                    <i className="fa-solid fa-cash-register"></i>
                                </div>
                                <div>
                                    <h4 className={styles.exportTitle}>
                                        Daily Cash & GCash Collection Log
                                    </h4>
                                    <p className={styles.exportDesc}>
                                        Shift-by-shift physical cash drawer
                                        reconciliations paired with front desk
                                        GCash reference numbers.
                                    </p>
                                </div>
                            </div>
                            <span className={styles.badgeSuccess}>
                                Daily Shift
                            </span>
                        </div>
                        <ul className={styles.bulletList}>
                            <li>Opening & Closing drawer cash match</li>
                            <li>GCash confirmation ref code logs</li>
                            <li>Shift handover signoffs</li>
                        </ul>
                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnExportPrimary}>
                                <i className="fa-solid fa-file-pdf"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnExportSecondary}>
                                <i className="fa-solid fa-file-csv"></i> Export
                                Excel / CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-6">
                    <div className={styles.exportCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-start gap-3">
                                <div className={styles.exportIconBoxInfo}>
                                    <i className="fa-solid fa-users-viewfinder"></i>
                                </div>
                                <div>
                                    <h4 className={styles.exportTitle}>
                                        Member Attendance Summary
                                    </h4>
                                    <p className={styles.exportDesc}>
                                        Daily member visits, workout duration
                                        estimates, and floor traffic logs for
                                        capacity management.
                                    </p>
                                </div>
                            </div>
                            <span className={styles.badgeInfo}>Traffic</span>
                        </div>
                        <ul className={styles.bulletList}>
                            <li>Peak hours: 5:00 PM - 8:30 PM (68% load)</li>
                            <li>Morning warrior cohort (6 AM - 9 AM)</li>
                            <li>Weekend visitor volume comparison</li>
                        </ul>
                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnExportPrimary}>
                                <i className="fa-solid fa-file-pdf"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnExportSecondary}>
                                <i className="fa-solid fa-file-csv"></i> Export
                                Excel / CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-6">
                    <div className={styles.exportCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-start gap-3">
                                <div className={styles.exportIconBoxDanger}>
                                    <i className="fa-solid fa-user-xmark"></i>
                                </div>
                                <div>
                                    <h4 className={styles.exportTitle}>
                                        Expired & Inactive Members List
                                    </h4>
                                    <p className={styles.exportDesc}>
                                        Direct phone, mobile, and email contact
                                        lists curated for staff renewal
                                        reminders and win-back offers.
                                    </p>
                                </div>
                            </div>
                            <span className={styles.badgeDanger}>
                                Follow-up
                            </span>
                        </div>
                        <ul className={styles.bulletList}>
                            <li>18 Members expired past 7 days</li>
                            <li>14 Expiring within 48 hours</li>
                            <li>Includes mobile numbers for SMS promo</li>
                        </ul>
                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnExportPrimary}>
                                <i className="fa-solid fa-file-pdf"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnExportSecondary}>
                                <i className="fa-solid fa-file-csv"></i> Export
                                Excel / CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={styles.tablePanel}
                data-aos="fade-up"
                data-aos-delay="500"
            >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4">
                    <div>
                        <h4 className={styles.panelTitle}>
                            Recent Downloads & Audits
                        </h4>
                        <p className={styles.panelDesc}>
                            History of exported spreadsheets and summaries
                            generated by front desk staff.
                        </p>
                    </div>
                    <span className={styles.sectionSubtitle}>
                        Auto-archived 30 days
                    </span>
                </div>

                <div className="table-responsive">
                    <table className={`table ${styles.customTable}`}>
                        <thead>
                            <tr>
                                <th>REPORT NAME</th>
                                <th>DATE FILTER</th>
                                <th>GENERATED BY</th>
                                <th>FORMAT</th>
                                <th>TIMESTAMP</th>
                                <th className="text-end">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-2 text-white fw-bold">
                                        <i className="fa-solid fa-file-invoice text-secondary"></i>
                                        Monthly Sales Summary (October)
                                    </div>
                                </td>
                                <td>Oct 01 - Oct 28, 2026</td>
                                <td>Zhaider Mendoza</td>
                                <td>
                                    <span className={styles.formatBadgePrimary}>
                                        .PDF
                                    </span>
                                </td>
                                <td>Today, 2:40 PM</td>
                                <td className="text-end">
                                    <button className={styles.btnActionLink}>
                                        <i className="fa-solid fa-download"></i>{" "}
                                        Re-download
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-2 text-white fw-bold">
                                        <i className="fa-regular fa-clock text-secondary"></i>
                                        Daily Shift Log (Morning Drawer)
                                    </div>
                                </td>
                                <td>Oct 28, 2026 (Morning)</td>
                                <td>Staff Mark B.</td>
                                <td>
                                    <span className={styles.formatBadgeSuccess}>
                                        .CSV
                                    </span>
                                </td>
                                <td>Today, 2:02 PM</td>
                                <td className="text-end">
                                    <button className={styles.btnActionLink}>
                                        <i className="fa-solid fa-download"></i>{" "}
                                        Re-download
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-2 text-white fw-bold">
                                        <i className="fa-solid fa-address-card text-secondary"></i>
                                        Expired Members (Oct Renewal Target)
                                    </div>
                                </td>
                                <td>Past 14 Days</td>
                                <td>Zhaider Mendoza</td>
                                <td>
                                    <span className={styles.formatBadgePrimary}>
                                        .XLSX
                                    </span>
                                </td>
                                <td>Yesterday, 6:15 PM</td>
                                <td className="text-end">
                                    <button className={styles.btnActionLink}>
                                        <i className="fa-solid fa-download"></i>{" "}
                                        Re-download
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
