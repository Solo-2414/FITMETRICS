import { useCallback, useEffect, useRef, useState } from "react";
import InlineError from "../../components/ui/InlineError";
import { Skeleton, SkeletonKpiCards, SkeletonTable } from "../../components/ui/Skeleton";
import { api, downloadApi } from "../../lib/api";
import { toastError, useToast } from "../../components/ui/toast/useToast";
import styles from "./AdminWalkInCustomers.module.css";

export default function AdminWalkInCustomers() {
    const [data, setData] = useState({ rows: [], total: 0, revenue: 0 });
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");
    const requestId = useRef(0);
    const [detailLoading, setDetailLoading] = useState(false);
    const toast = useToast();
    const load = useCallback(async () => {
        const request = ++requestId.current;
        setLoading(true);
        try { const result = await api(`/admin/walk-ins?page=${page}&limit=25&search=${encodeURIComponent(search)}`); if (request === requestId.current) setData(result); setError(""); }
        catch (err) { setError(err.message); } finally { setLoading(false); }
    }, [page, search]);
    useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
    const exportCsv = async () => {
        setExporting(true);
        try {
            const { blob, filename } = await downloadApi("/admin/walk-ins/export.csv");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || "walk-in-customers.csv";
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Walk-in customer export downloaded.");
        } catch (err) {
            toast.error(toastError(err));
        } finally {
            setExporting(false);
        }
    };
    const open = async (customer) => {
        setDetailLoading(true);
        try { setSelected(await api(`/admin/walk-ins/${customer.id}`)); } catch (err) { setError(err.message); } finally { setDetailLoading(false); }
    };
    useEffect(() => {
        const close = (event) => { if (event.key === "Escape") setSelected(null); };
        window.addEventListener("keydown", close);
        return () => window.removeEventListener("keydown", close);
    }, []);
    return <>
        <div className="d-flex flex-column mb-4"><h1 className={styles.pageTitle}>Walk-in Customers</h1><p className={styles.pageDesc}>Returning day-pass customers and visit history</p></div>
        {error && <InlineError error={error} />}
        {loading && !data.rows.length ? <SkeletonKpiCards count={3} colClass="col-12 col-md-4" labels={["Customers", "Visits shown", "Day-pass revenue"]} /> : <div className="row g-3 mb-4">
            {[["Customers", data.total], ["Visits shown", data.rows.reduce((sum, row) => sum + Number(row.visit_count || 0), 0)], ["Day-pass revenue", `₱${Number(data.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]].map(([label, value]) => <div className="col-12 col-md-4" key={label}><div className={styles.kpiCard}><span>{label}</span><strong>{value}</strong><small>Live from database</small></div></div>)}
        </div>}
        <div className={styles.toolbar}><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search name, phone, email, or customer code" /><button className={styles.button} type="button" onClick={exportCsv} disabled={exporting}>{exporting ? "Exporting..." : "Export CSV"}</button></div>
        <div className={styles.panel}>{loading ? <SkeletonTable rows={4} cols={6} headers={["Customer", "Phone", "Email", "Visits", "Last visit", "Actions"]} cellTypes={["text", "text", "text", "text", "text", "action"]} /> : <div className="table-responsive"><table className={`table ${styles.table}`}><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Visits</th><th>Last visit</th><th></th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.id}><td><strong>{row.full_name}</strong><small>{row.customer_code}</small></td><td>{row.phone_normalized || "—"}</td><td>{row.email_normalized || "—"}</td><td>{row.visit_count}</td><td>{row.last_visit_at ? new Date(row.last_visit_at).toLocaleDateString() : "—"}</td><td><button className={styles.link} onClick={() => open(row)}>View</button></td></tr>)}{!data.rows.length && <tr><td colSpan="6" className="text-center text-secondary">No walk-in customers found.</td></tr>}</tbody></table></div>}</div>
        {data.total > 25 && <div className={styles.pagination}><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 25 >= data.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
        {selected && <><div className={styles.drawerBackdrop} onClick={() => setSelected(null)}></div><div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Walk-in customer details"><button className={styles.close} aria-label="Close customer details" onClick={() => setSelected(null)}>×</button><h2>{selected.customer.full_name}</h2><p>{selected.customer.customer_code} · {selected.customer.visit_count} visits</p><h3>Visit history</h3>{detailLoading ? <div className="d-flex flex-column gap-3"><div className={`${styles.visit} d-flex flex-column gap-2`}><Skeleton w="45%" h={16} /><Skeleton w="68%" h={12} /><Skeleton w="58%" h={12} /></div><div className={`${styles.visit} d-flex flex-column gap-2`}><Skeleton w="45%" h={16} /><Skeleton w="68%" h={12} /><Skeleton w="58%" h={12} /></div><div className={`${styles.visit} d-flex flex-column gap-2`}><Skeleton w="45%" h={16} /><Skeleton w="68%" h={12} /><Skeleton w="58%" h={12} /></div></div> : selected.visits.map((visit) => <div className={styles.visit} key={visit.id}><strong>{visit.membership_plans?.name || "Day pass"}</strong><span>{new Date(visit.created_at).toLocaleString()}</span><span>{visit.payments?.[0]?.receipt_number || "—"} · ₱{Number(visit.payments?.[0]?.amount || 0).toFixed(2)}</span></div>)}</div></>}
    </>;
}
