import { Bar } from "react-chartjs-2";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { buildBarOptions } from "../../lib/chartDefaults";
import { SkeletonChart, SkeletonKpiCards, SkeletonTable } from "../../components/ui/Skeleton";
import styles from "./AdminAttendanceAnalysis.module.css";
import InlineError from "../../components/ui/InlineError";

const LIMIT = 10;
const ranges = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
];

const formatTime = (value) => value
    ? new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(new Date(value))
    : "-";

const initials = (name) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export default function AdminAttendanceAnalysis() {
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState("today");
    const [plan, setPlan] = useState("all");
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let active = true;
        api(`/attendance/analysis?range=${range}&plan=${plan}&page=${page}&limit=${LIMIT}`)
            .then((data) => { if (active) setAnalysis(data); })
            .catch((err) => { if (active) setError(err.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [range, plan, page]);

    const kpis = analysis?.kpis;
    const hourly = useMemo(() => analysis?.hourly || [], [analysis]);
    const chartData = useMemo(() => ({
        labels: hourly.map((bucket) => bucket.label),
        datasets: [{
            label: "Visits",
            data: hourly.map((bucket) => bucket.visits),
            backgroundColor: hourly.map((bucket) => bucket.label === kpis?.busiestHourLabel ? "#f59e0b" : "#38bdf8"),
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.6,
        }],
    }), [hourly, kpis]);
    const chartOptions = useMemo(() => {
        const options = buildBarOptions({ count: 12 });
        return {
            ...options,
            scales: {
                ...options.scales,
                x: { ...options.scales.x, ticks: { ...options.scales.x.ticks, font: { size: 11 } } },
                y: { ...options.scales.y, display: false },
            },
        };
    }, []);
    const records = (analysis?.records || []).filter((row) => row.member_name.toLowerCase().includes(search.toLowerCase()));
    const maxWeekday = Math.max(...(analysis?.weekday || []).map((day) => day.visits), 1);
    const changeLabel = kpis?.changePct === null || kpis?.changePct === undefined
        ? "No previous data"
        : `${kpis.changePct >= 0 ? "+" : ""}${kpis.changePct}% vs previous period`;

    const selectRange = (value) => {
        setLoading(true);
        setError("");
        setRange(value);
        setPage(1);
    };

    return (
        <>
            {error && <InlineError error={error} />}
            <div className="d-flex flex-column mb-4" data-aos="fade-down">
                <h1 className={styles.pageTitle}>Attendance Analysis</h1>
                <p className={styles.pageDesc}>Review daily member check-ins, peak visiting hours, and gym foot traffic</p>
            </div>

            {loading && !analysis ? <SkeletonKpiCards labels={["Check-Ins", "Current People in Gym", "Busiest Time of Day", "Most Active Day"]} icons={["fa-list-check", "fa-users", "fa-clock", "fa-calendar"]} /> : <div className="row g-3 mb-4 fm-fade-in">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}><span>Check-Ins</span><div className={styles.iconBoxPrimary}><i className="fa-solid fa-list-check"></i></div></div>
                        <h3 className={styles.kpiValue}>{kpis?.totalCheckIns ?? "..."} <span className={styles.kpiValueUnit}>visits</span></h3>
                        <div className="d-flex justify-content-between align-items-center mt-2"><span className={styles.kpiPositive}>{changeLabel}</span><span className={styles.kpiSub}>Target: {kpis?.target ?? "..."}</span></div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}><span>Current People in Gym</span><div className={styles.iconBoxSuccess}><i className="fa-solid fa-users"></i></div></div>
                        <h3 className={styles.kpiValue}>{kpis?.activeInGym ?? "..."} <span className={styles.kpiValueUnit}>active</span></h3>
                        <div className="d-flex justify-content-between align-items-center mt-2"><span className={styles.kpiLive}><span className={styles.liveDot}></span> Live</span><span className={styles.kpiSub}>Open check-ins</span></div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}><span>Busiest Time of Day</span><div className={styles.iconBoxWarning}><i className="fa-regular fa-clock"></i></div></div>
                        <h3 className={styles.kpiValueText}>{kpis?.busiestWindowLabel || "No data"}</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2"><span className={styles.kpiWarning}><i className="fa-solid fa-fire"></i> Peak window</span><span className={styles.kpiSub}>{kpis?.busiestHourLabel || "No data"}</span></div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}><span>Most Active Day</span><div className={styles.iconBoxPrimary}><i className="fa-regular fa-calendar"></i></div></div>
                        <h3 className={styles.kpiValueText}>{kpis?.mostActiveWeekdays?.map((day) => day.weekday).join(" & ") || "No data"}</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2"><span className={styles.kpiPrimary}>{kpis?.mostActiveWeekdays?.[0]?.visits || 0} visits</span><span className={styles.kpiSub}>Selected range</span></div>
                    </div>
                </div>
            </div>
            }
            <div className="row g-4 mb-4">
                <div className="col-12 col-xl-8" data-aos="fade-up" data-aos-delay="100">
                    <div className={styles.chartCard}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                            <div><h4 className={styles.panelTitle}>Check-Ins by Hour</h4><p className={styles.panelDesc}>All times shown in Asia/Manila</p></div>
                            <div className={styles.chartLegendOutline}><span className={styles.dotWarning}></span> Peak: <strong>{kpis?.busiestHourLabel || "No data"}</strong></div>
                        </div>
                        <div className={styles.chartWrapper}>{loading && !analysis ? <SkeletonChart height={320} /> : hourly.length ? <Bar data={chartData} options={chartOptions} /> : <div className="text-secondary">No attendance data for this range.</div>}</div>
                        <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary text-secondary" style={{ fontSize: "0.8rem" }}><span>Blue: standard hours</span><span>Orange: busiest hour</span></div>
                    </div>
                </div>
                <div className="col-12 col-xl-4" data-aos="fade-left" data-aos-delay="200">
                    <div className={styles.panelCard}>
                        <div className="mb-4"><h4 className={styles.panelTitle}>Day of Week Comparison</h4><p className={styles.panelDesc}>Visits in the selected range</p></div>
                        <div className="d-flex flex-column gap-3 mb-4">
                            {(analysis?.weekday || []).map((day, index) => (
                                <div className={styles.progressItem} key={day.weekday}>
                                    <div className="d-flex justify-content-between align-items-end mb-1"><span className={day.visits === maxWeekday ? "text-white fw-bold" : "text-secondary"}>{day.weekday}</span><span className="text-secondary" style={{ fontSize: "0.8rem" }}>{day.visits} visits</span></div>
                                    <div className={styles.progressBarBg}><div className={`${day.visits === maxWeekday ? styles.progressBarFillPrimary : styles.progressBarFillSecondary} fm-grow-x`} style={{ width: `${Math.round((day.visits / maxWeekday) * 100)}%`, "--i": index }}></div></div>
                                </div>
                            ))}
                            {!analysis?.weekday?.length && <span className="text-secondary">No attendance data for this range.</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12" data-aos="fade-up" data-aos-delay="300">
                    <div className={styles.panelCard}>
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
                            <div><h4 className={styles.panelTitle}>Check-In Log</h4><p className={styles.panelDesc}>{analysis?.total || 0} visits in selected range</p></div>
                            <div className="d-flex flex-wrap gap-2">
                                <div className={styles.searchBox}><i className="fa-solid fa-magnifying-glass"></i><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member name..." /></div>
                                <div className={styles.filterGroup}>{ranges.map((item) => <button key={item.value} className={range === item.value ? styles.filterBtnActive : styles.filterBtn} onClick={() => selectRange(item.value)}>{item.label}</button>)}</div>
                                <select className={styles.filterSelect} value={plan} onChange={(event) => { setLoading(true); setError(""); setPlan(event.target.value); setPage(1); }}><option value="all">All Plans</option>{(analysis?.byPlan || []).map((item) => <option value={item.planId} key={item.planId}>{item.plan}</option>)}</select>
                            </div>
                        </div>
                        {loading && !analysis ? <SkeletonTable rows={4} cols={5} headers={["Member name", "Membership plan", "Time in", "Recorded by", "Status"]} cellTypes={["text", "badge", "text", "text", "badge"]} /> : <div className={`table-responsive ${loading ? "fm-refreshing" : "fm-fade-in"}`}>
                            <table className={`table ${styles.customTable}`}>
                                <thead><tr><th>MEMBER NAME</th><th>MEMBERSHIP PLAN</th><th>TIME IN</th><th>RECORDED BY</th><th className="text-end">STATUS</th></tr></thead>
                                <tbody>
                                    {records.map((row) => <tr key={row.id}><td><div className="d-flex align-items-center gap-3"><div className={styles.avatar}>{initials(row.member_name)}</div><div><strong className="d-block text-white mb-1">{row.member_name}</strong><span className={styles.memberId}>{row.member_id ? `Member ${row.member_id.slice(0, 8)}` : "Walk-in guest"}</span></div></div></td><td><span className={styles.planBadgeOutline}>{row.plan_name}</span></td><td className="text-white fw-bold">{formatTime(row.check_in_at)}</td><td><span className="d-flex align-items-center gap-2"><span className={styles.dotGreen}></span>{row.recorded_by_name}</span></td><td className="text-end text-secondary">{row.status}</td></tr>)}
                                </tbody>
                            </table>
                        </div>}
                        {!loading && !records.length && <div className="text-secondary py-3">No check-ins match the selected filters.</div>}
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4"><span className="text-secondary" style={{ fontSize: "0.85rem" }}>Page {analysis?.page || page} of {Math.max(1, Math.ceil((analysis?.total || 0) / LIMIT))}</span><div className="d-flex gap-2 mt-3 mt-sm-0"><button className={styles.pageBtnText} disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</button><button className={styles.pageBtnTextActive} disabled={page * LIMIT >= (analysis?.total || 0) || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</button></div></div>
                    </div>
                </div>
            </div>
        </>
    );
}
