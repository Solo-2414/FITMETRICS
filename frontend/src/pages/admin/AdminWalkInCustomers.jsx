import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import InlineError from "../../components/ui/InlineError";
import { SkeletonKpiCards, SkeletonTable } from "../../components/ui/Skeleton";
import { api } from "../../lib/api";
import styles from "./AdminWalkInCustomers.module.css";

export default function AdminWalkInCustomers() {
    const [data, setData] = useState({ rows: [], total: 0, revenue: 0 });
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = async () => {
        setLoading(true);
        try { setData(await api(`/admin/walk-ins?page=${page}&limit=25&search=${encodeURIComponent(search)}`)); setError(""); }
        catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [page, search]);
    const open = async (customer) => {
        try { setSelected(await api(`/admin/walk-ins/${customer.id}`)); } catch (err) { setError(err.message); }
    };
    return <AdminLayout>
        <div className="d-flex flex-column mb-4"><h1 className={styles.pageTitle}>Walk-in Customers</h1><p className={styles.pageDesc}>Returning day-pass customers and visit history</p></div>
        {error && <InlineError error={error} />}
        {loading && !data.rows.length ? <SkeletonKpiCards count={3} /> : <div className="row g-3 mb-4">
            {[["Customers", data.total], ["Visits shown", data.rows.reduce((sum, row) => sum + Number(row.visit_count || 0), 0)], ["Day-pass revenue", `₱${Number(data.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]].map(([label, value]) => <div className="col-12 col-md-4" key={label}><div className={styles.kpiCard}><span>{label}</span><strong>{value}</strong><small>Live from database</small></div></div>)}
        </div>}
        <div className={styles.toolbar}><input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search name, phone, email, or customer code" /><a className={styles.button} href="/api/admin/walk-ins/export.csv">Export CSV</a></div>
        <div className={styles.panel}>{loading ? <SkeletonTable rows={8} cols={6} /> : <div className="table-responsive"><table className={`table ${styles.table}`}><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Visits</th><th>Last visit</th><th></th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.id}><td><strong>{row.full_name}</strong><small>{row.customer_code}</small></td><td>{row.phone_normalized || "—"}</td><td>{row.email_normalized || "—"}</td><td>{row.visit_count}</td><td>{row.last_visit_at ? new Date(row.last_visit_at).toLocaleDateString() : "—"}</td><td><button className={styles.link} onClick={() => open(row)}>View</button></td></tr>)}{!data.rows.length && <tr><td colSpan="6" className="text-center text-secondary">No walk-in customers found.</td></tr>}</tbody></table></div>}</div>
        {data.total > 25 && <div className={styles.pagination}><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 25 >= data.total} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
        {selected && <div className={styles.drawer}><button className={styles.close} onClick={() => setSelected(null)}>×</button><h2>{selected.customer.full_name}</h2><p>{selected.customer.customer_code} · {selected.customer.visit_count} visits</p><h3>Visit history</h3>{selected.visits.map((visit) => <div className={styles.visit} key={visit.id}><strong>{visit.membership_plans?.name || "Day pass"}</strong><span>{new Date(visit.created_at).toLocaleString()}</span><span>{visit.payments?.[0]?.receipt_number || "—"} · ₱{Number(visit.payments?.[0]?.amount || 0).toFixed(2)}</span></div>)}</div>}
    </AdminLayout>;
}
