import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminReports.module.css";
import { api, downloadApi } from "../../lib/api";
import { SkeletonKpiCards, SkeletonTable } from "../../components/ui/Skeleton";

export default function AdminReports() {
    const [downloads, setDownloads] = useState([]);
    const [plans, setPlans] = useState([]);
    const [error, setError] = useState("");
    const [generating, setGenerating] = useState(false);
    const [summary, setSummary] = useState(null);
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [plan, setPlan] = useState("all");
    const [shift, setShift] = useState("all");
    const [loadedAt, setLoadedAt] = useState(null);
    const months = useMemo(() => Array.from({ length: 12 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - index);
        return { value: date.toISOString().slice(0, 7), label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
    }), []);
    const period = useMemo(() => {
        const [year, monthNumber] = month.split("-").map(Number);
        const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
        return { start: `${month}-01`, end };
    }, [month]);
    const fetchData = useCallback(async () => {
        const query = new URLSearchParams({ start: period.start, end: period.end, plan, shift });
        return Promise.all([
            api("/admin/reports"),
            api(`/admin/reports/summary?${query}`),
            api("/membership-plans"),
        ]);
    }, [period.end, period.start, plan, shift]);
    useEffect(() => {
        fetchData().then(([reportData, summaryData, planData]) => {
            setDownloads(reportData.downloads || []);
            setSummary(summaryData);
            setLoadedAt(summaryData.loadedAt);
            setPlans(planData || []);
        }).catch((err) => setError(err.message));
    }, [fetchData]);
    const generate = async (type) => {
        setGenerating(true);
        try {
            await api("/admin/reports", { method: "POST", body: { report_type: type, start: period.start, end: period.end, filters: { plan, shift } } });
            const [reportData, summaryData] = await fetchData();
            setDownloads(reportData.downloads || []);
            setSummary(summaryData);
            setLoadedAt(summaryData.loadedAt);
        } catch (err) { setError(err.message); } finally { setGenerating(false); }
    };
    const exportReport = async (type, format) => {
        setError("");
        try {
            const query = new URLSearchParams({ type, format, start: period.start, end: period.end, plan, shift });
            const { blob, filename } = await downloadApi(`/admin/reports/export?${query}`);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || `fitmetrics-${type}-${period.start}-to-${period.end}.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            const [reportData] = await fetchData();
            setDownloads(reportData.downloads || []);
        } catch (err) { setError(err.message); }
    };
    const revenue = summary?.revenue || {};
    const attendance = summary?.attendance || {};
    const members = summary?.members || {};
    const money = (value) => Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
        <AdminLayout>
            {error && <div className="alert alert-danger">{error}</div>}
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
                    {loadedAt ? new Date(loadedAt).toLocaleString() : "..."}
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
                        <select className={styles.filterSelect} value={month} onChange={(event) => setMonth(event.target.value)}>
                            {months.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                        </select>
                    </div>
                    <div className="col-12 col-md-3">
                        <label className={styles.filterLabel}>
                            PLAN CATEGORY
                        </label>
                        <select className={styles.filterSelect} value={plan} onChange={(event) => setPlan(event.target.value)}>
                            <option value="all">All Plans</option>
                            {plans.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                            <option value="walk-ins">Walk-ins</option>
                        </select>
                    </div>
                    <div className="col-12 col-md-4">
                        <label className={styles.filterLabel}>
                            SHIFT WINDOW
                        </label>
                        <select className={styles.filterSelect} value={shift} onChange={(event) => setShift(event.target.value)}>
                            <option value="all">All Shifts (Morning & Evening)</option>
                            <option value="morning">Morning (06:00 - 14:00)</option>
                            <option value="evening">Evening (14:00 - 22:00)</option>
                        </select>
                        <small className="text-secondary">Shift uses Manila time: morning 06:00-13:59, evening 14:00-21:59.</small>
                    </div>
                    <div className="col-12 col-md-2">
                        <button className={styles.btnGenerate} type="button" disabled={generating} onClick={() => generate("revenue")}>
                            <i className="fa-solid fa-filter"></i> Generate
                            Summary
                        </button>
                    </div>
                </div>
            </div>

            {summary ? <div
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
                        <h3 className={styles.kpiValue}>₱{money(revenue.total)}</h3>
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                {revenue.total ? `${Math.round(((Number(revenue.total) - Number(revenue.previousTotal || 0)) / Math.max(1, Number(revenue.previousTotal || 0))) * 100)}%` : "0%"}
                            </span>
                            <span className={styles.kpiSub}>(Memberships)</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto border-top border-secondary pt-3">
                            <span className={styles.kpiSub}>
                                Discounts: ₱{money(revenue.discounts)}
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
                        <h3 className={styles.kpiValue}>₱{money(revenue.cash)}</h3>
                        <div className="mb-3">
                            <span className={styles.kpiSub}>
                                {revenue.total ? `${Math.round((Number(revenue.cash || 0) / Number(revenue.total)) * 100)}% of total revenue` : "0% of total revenue"}
                            </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto border-top border-secondary pt-3">
                            <span className={styles.kpiSub}>
                                {revenue.cashCount || 0} paid transactions
                            </span>
                            <span className={styles.kpiStatusNeutral}>
                                Cash
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
                        <h3 className={styles.kpiValue}>₱{money(revenue.online)}</h3>
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                {revenue.onlineCount || 0} paid transactions
                            </span>
                            <span className={styles.kpiSub}>QR Transfers</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto border-top border-secondary pt-3">
                            <span className={styles.kpiSub}>
                                {revenue.total ? `${Math.round((Number(revenue.online || 0) / Number(revenue.total)) * 100)}% of total revenue` : "0% of total revenue"}
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
                            {attendance.total || 0}{" "}
                            <span className={styles.kpiValueUnit}>visits</span>
                        </h3>
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                {attendance.averagePerDay || 0} visits/day avg
                            </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-auto border-top border-secondary pt-3">
                            <span className={styles.kpiSub}>
                                Peak: {attendance.peak ? `${attendance.peak.startHour}:00 - ${attendance.peak.endHour}:00` : "No data"}
                            </span>
                            <span className={styles.kpiStatusNeutral}>
                                {members.inactive || 0} inactive members
                            </span>
                        </div>
                    </div>
                </div>
            </div> : <SkeletonKpiCards />}

            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4"
                data-aos="fade-up"
                data-aos-delay="300"
            >
                <h3 className={styles.sectionTitle}>
                    <i className="fa-solid fa-download me-2"></i> Quick Export
                </h3>
                <span className={styles.sectionSubtitle}>
                    Downloadable Excel tables and ready-to-print administrative
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
                            {(summary?.salesByPlan || []).map((item) => <li key={item.plan}>{item.plan} ({item.sold || 0} sold)</li>)}
                            {!summary?.salesByPlan?.length && <li>No sales in this period.</li>}
                        </ul>
                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnExportPrimary} type="button" onClick={() => exportReport("sales", "pdf")}>
                                <i className="fa-solid fa-file-pdf"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnExportSecondary} type="button" onClick={() => exportReport("sales", "xlsx")}>
                                <i className="fa-solid fa-file-csv"></i> Export
                                Download Excel (.xlsx)
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
                            <li>Cash collected: ₱{money(revenue.cash)}</li>
                            <li>Online collected: ₱{money(revenue.online)}</li>
                            <li>{Number(revenue.cashCount || 0) + Number(revenue.onlineCount || 0)} paid transactions</li>
                        </ul>
                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnExportPrimary} type="button" onClick={() => exportReport("collections", "pdf")}>
                                <i className="fa-solid fa-file-pdf"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnExportSecondary} type="button" onClick={() => exportReport("collections", "xlsx")}>
                                <i className="fa-solid fa-file-csv"></i> Export
                                Download Excel (.xlsx)
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
                            <li>Total visits: {attendance.total || 0}</li>
                            <li>Average per day: {attendance.averagePerDay || 0}</li>
                            <li>Peak: {attendance.peak ? `${attendance.peak.startHour}:00 - ${attendance.peak.endHour}:00` : "No data"}</li>
                        </ul>
                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnExportPrimary} type="button" onClick={() => exportReport("attendance", "pdf")}>
                                <i className="fa-solid fa-file-pdf"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnExportSecondary} type="button" onClick={() => exportReport("attendance", "xlsx")}>
                                <i className="fa-solid fa-file-csv"></i> Export
                                Download Excel (.xlsx)
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
                            <li>{members.expiredLast7Days || 0} expired in the last 7 days</li>
                            <li>{members.expiringWithin48Hours || 0} expiring within 48 hours</li>
                            <li>{members.inactive || 0} inactive members</li>
                        </ul>
                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnExportPrimary} type="button" onClick={() => exportReport("members", "pdf")}>
                                <i className="fa-solid fa-file-pdf"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnExportSecondary} type="button" onClick={() => exportReport("members", "xlsx")}>
                                <i className="fa-solid fa-file-csv"></i> Export
                                Download Excel (.xlsx)
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

                {!summary ? <SkeletonTable rows={5} cols={6} /> : <div className="table-responsive fm-fade-in">
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
                            {!downloads.length && <tr><td colSpan="6" className="text-center text-secondary py-4">No downloads recorded yet.</td></tr>}
                            {downloads.map((download) => (
                                <tr key={download.id}>
                                    <td><div className="d-flex align-items-center gap-2 text-white fw-bold"><i className="fa-solid fa-file-invoice text-secondary"></i>{download.report_type}</div></td>
                                    <td>{download.period_start} - {download.period_end}</td>
                                    <td>{download.generated_by_name}</td>
                                    <td><span className={download.format === "pdf" ? styles.formatBadgePrimary : styles.formatBadgeSuccess}>.{download.format.toUpperCase()}</span></td>
                                    <td>{new Date(download.created_at).toLocaleString()}</td>
                                    <td className="text-end"><span className="text-secondary">Logged</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>}
            </div>
        </AdminLayout>
    );
}
