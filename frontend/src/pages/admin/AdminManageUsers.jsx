import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { toastError, useToast } from "../../components/ui/toast/useToast";
import styles from "./AdminManageUsers.module.css";
import InlineError from "../../components/ui/InlineError";
import { SkeletonKpiCards, SkeletonTable } from "../../components/ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import useDialogA11y from "../../hooks/useDialogA11y";

const initialForm = { email: "", username: "", password: "", full_name: "", role: "member", status: "active" };

export default function AdminManageUsers() {
    const { profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState("");
    const [form, setForm] = useState(initialForm);
    const [selected, setSelected] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [modalError, setModalError] = useState("");
    const [userDetails, setUserDetails] = useState(null);
    const [plans, setPlans] = useState([]);
    const [membershipForm, setMembershipForm] = useState({ membershipId: "", plan_id: "", status: "active", start_date: "", end_date: "" });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [summary, setSummary] = useState(null);
    const [page, setPage] = useState(1);
    const requestId = useRef(0);
    const toast = useToast();
    const dialogRef = useDialogA11y(showAddModal || showEditModal || showViewModal || showDeleteConfirm, () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowViewModal(false);
        setShowDeleteConfirm(false);
    });

    const loadUsers = useCallback(async () => {
        const request = ++requestId.current;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (role) params.set("role", role);
            if (status) params.set("status", status);
            const result = await api(`/users?${params.toString()}`);
            if (request === requestId.current) setUsers(result);
            setError("");
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    }, [role, search, status]);
    useEffect(() => { const timer = setTimeout(() => { setPage(1); loadUsers(); }, 250); return () => clearTimeout(timer); }, [loadUsers]);
    useEffect(() => { api("/users/summary").then(setSummary).catch(() => {}); }, []);
    useEffect(() => { api("/membership-plans").then(setPlans).catch((err) => setError(err.message)); }, []);
    useEffect(() => {
        const close = (event) => {
            if (event.key !== "Escape") return;
            setShowAddModal(false); setShowEditModal(false); setShowViewModal(false); setShowDeleteConfirm(false);
        };
        window.addEventListener("keydown", close);
        return () => window.removeEventListener("keydown", close);
    }, []);

    const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    const addUser = async (event) => {
        event.preventDefault(); setSaving(true); setModalError("");
        try {
            const created = await api("/users", { method: "POST", body: form });
            setUsers((current) => [created, ...current]); setShowAddModal(false); setForm(initialForm); toast.success("User created.");
        } catch (err) { setModalError(err.message); toast.error(toastError(err)); } finally { setSaving(false); }
    };
    const updateUser = async (event) => {
        event.preventDefault(); setSaving(true); setModalError("");
        try {
            const updated = await api(`/users/${selected.id}`, { method: "PATCH", body: { role: form.role, status: form.status, full_name: form.full_name, phone: form.phone } });
            setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
            setSelected(updated); setShowEditModal(false); toast.success("User updated.");
        } catch (err) { setModalError(err.message); toast.error(toastError(err)); } finally { setSaving(false); }
    };
    const openEdit = (user) => { setSelected(user); setModalError(""); setForm({ ...initialForm, full_name: user.full_name || "", phone: user.phone || "", role: user.role, status: user.status }); setShowEditModal(true); };
    const openView = async (user) => {
        setSelected(user); setShowViewModal(true); setModalError("");
        try {
            const details = await api(`/users/${user.id}/details`);
            setUserDetails(details);
            const membership = details.memberships?.find((item) => item.status === "active") || details.memberships?.[0];
            setMembershipForm(membership ? { membershipId: membership.id, plan_id: membership.plan_id, status: membership.status, start_date: membership.start_date, end_date: membership.end_date } : { membershipId: "", plan_id: "", status: "active", start_date: "", end_date: "" });
        } catch (err) { setModalError(err.message); }
    };
    const saveMembership = async () => {
        setSaving(true); setModalError("");
        try {
            if (!membershipForm.membershipId) throw new Error("This user has no membership to update.");
            await api(`/users/${selected.id}/membership`, { method: "PATCH", body: membershipForm });
            await openView(selected);
        } catch (err) { setModalError(err.message); } finally { setSaving(false); }
    };
    const deleteUser = async () => {
        setSaving(true); setModalError("");
        try {
            await api(`/users/${selected.id}`, { method: "DELETE" });
            setUsers((current) => current.filter((user) => user.id !== selected.id));
            setShowDeleteConfirm(false); setShowViewModal(false); setSelected(null); toast.success("User deleted.");
        } catch (err) { setModalError(err.message); toast.error(toastError(err)); } finally { setSaving(false); }
    };
    const sendPasswordReset = async () => {
        try { await api(`/users/${selected.id}/password-reset`, { method: "POST" }); toast.success("Password reset email sent."); }
        catch (err) { toast.error(toastError(err)); }
    };
    const selfTarget = selected?.id === profile?.id;
    const visibleUsers = users.slice((page - 1) * 25, page * 25);
    const counts = { total: summary ? summary.admins + summary.clerks + summary.members : users.length, admins: summary?.admins ?? users.filter((u) => u.role === "admin").length, staff: summary?.clerks ?? users.filter((u) => u.role === "clerk").length, members: summary?.members ?? users.filter((u) => u.role === "member").length, active: summary?.active_members ?? users.filter((u) => u.role === "member" && u.status === "active").length };
    const roleClass = (value) => value === "admin" ? styles.roleAdmin : value === "clerk" ? styles.roleStaff : styles.roleMember;

    return <>
        <div className="d-flex flex-column mb-4"><h1 className={styles.pageTitle}>Manage Users</h1><p className={styles.pageDesc}>View and manage gym staff accounts and member profiles</p></div>
        {loading && !users.length ? <SkeletonKpiCards labels={["Total System Accounts", "Gym Admin / Owners", "Front Desk Staff / Clerks", "Active Members"]} icons={["fa-users-viewfinder", "fa-user-shield", "fa-headset", "fa-user-group"]} /> : <div className="row g-3 mb-4 fm-fade-in">
            {[["Total System Accounts", counts.total, "fa-users-viewfinder", styles.iconBoxPrimary], ["Gym Admin / Owners", counts.admins, "fa-user-shield", styles.iconBoxSecondary], ["Front Desk Staff / Clerks", counts.staff, "fa-headset", styles.iconBoxSecondary], ["Active Members", counts.active, "fa-user-group", styles.iconBoxSuccess]].map(([label, value, icon, box]) => <div className="col-12 col-sm-6 col-xl-3" key={label}><div className={styles.kpiCard}><div className={styles.kpiHeader}><span>{label}</span><div className={box}><i className={`fa-solid ${icon}`}></i></div></div><h3 className={styles.kpiValue}>{loading ? "..." : value} <span className={styles.kpiValueUnit}>Users</span></h3><span className={styles.kpiSub}>Live from database</span></div></div>)}
        </div>}
        {error && <InlineError error={error} />}
        <div className={styles.actionToolbar}><div className={styles.searchBox}><i className="fa-solid fa-magnifying-glass"></i><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, or username..." /></div><select className={styles.filterSelect} value={role} onChange={(e) => setRole(e.target.value)}><option value="">All Roles</option><option value="admin">Admin</option><option value="clerk">Clerk</option><option value="member">Member</option></select><select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select><button className={styles.btnPrimary} onClick={() => { setForm(initialForm); setModalError(""); setShowAddModal(true); }}><i className="fa-solid fa-plus"></i> Add User</button></div>
        <div className={`${styles.panelCard} ${loading && users.length ? "fm-refreshing" : ""}`}>{loading && !users.length ? <SkeletonTable rows={4} cols={5} headers={["User", "Role", "Contact", "Status", "Actions"]} cellTypes={["text", "badge", "text", "badge", "action"]} /> : <div className="table-responsive fm-fade-in"><table className={`table ${styles.customTable}`}><thead><tr><th>User</th><th>Role</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleUsers.map((user) => <tr key={user.id}><td><strong>{user.full_name || "Unnamed user"}</strong><div className={styles.subText}>@{user.username || "—"}</div></td><td><span className={roleClass(user.role)}>{user.role}</span></td><td><div>{user.email}</div><div className={styles.subText}>{user.phone || "No phone"}</div></td><td><span className={user.status === "active" ? styles.statusActive : styles.textWarning}>{user.status}</span></td><td><button className={styles.btnAction} onClick={() => openView(user)}>View</button><button className={styles.btnAction} onClick={() => openEdit(user)}>Edit</button></td></tr>)}{!loading && !users.length && <tr><td colSpan="5" className="text-center text-secondary py-4">No users found.</td></tr>}</tbody></table></div>}</div>
        {users.length > 25 && <div className="d-flex justify-content-center align-items-center gap-3 py-3"><button className={styles.btnAction} disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-secondary">Page {page}</span><button className={styles.btnAction} disabled={page * 25 >= users.length} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
        {showViewModal && selected && <div className={styles.modalOverlay}><div className={styles.modalContent} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="user-details-title"><div className={styles.modalHeader}><h3 id="user-details-title">User Details</h3><button onClick={() => setShowViewModal(false)}><i className="fa-solid fa-xmark"></i></button></div><div className={styles.modalBody}>{modalError && <div className={styles.modalError}>{modalError}</div>}<p className="text-white mb-2"><strong>{selected.full_name}</strong></p><p className="text-secondary mb-1">{selected.email}</p><p className="text-secondary mb-1">@{selected.username || "—"}</p>        <p className="text-secondary">Role: {selected.role} · Status: {selected.status}</p>{!selfTarget && <button type="button" className={styles.btnAction} onClick={sendPasswordReset}>Send password reset email</button>}{userDetails && selected.role === "member" && <><hr /><h5 className="text-white">Membership</h5><label className={styles.formLabel}>Plan<select className={styles.formSelect} value={membershipForm.plan_id} onChange={(event) => setMembershipForm((current) => ({ ...current, plan_id: event.target.value }))}><option value="">Select a plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>{membershipForm.membershipId && <><label className={styles.formLabel}>Status<select className={styles.formSelect} value={membershipForm.status} onChange={(event) => setMembershipForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="frozen">Frozen</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></label><button className={styles.btnPrimaryModal} type="button" disabled={saving} onClick={saveMembership}>{saving ? "Saving..." : "Save Membership"}</button></>}<p className="text-secondary mt-3">{userDetails.memberships?.length ? `${userDetails.memberships.length} membership record(s)` : "No membership records."}</p></>}</div><div className={styles.modalFooter}><button type="button" className={styles.btnCancel} onClick={() => setShowViewModal(false)}>Close</button><button type="button" className={styles.btnAction} onClick={() => openEdit(selected)}>Manage Account</button>        <button type="button" className={styles.btnDanger} disabled={selfTarget} onClick={() => setShowDeleteConfirm(true)}>Delete Account</button></div></div></div>}
        {showDeleteConfirm && selected && <div className={styles.modalOverlay}><div className={styles.modalContent} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><div className={styles.modalHeader}><h3 id="delete-account-title">Delete Account</h3><button onClick={() => setShowDeleteConfirm(false)}><i className="fa-solid fa-xmark"></i></button></div><div className={styles.modalBody}><div className={styles.modalError}>This permanently deletes the authentication account and profile when it has no membership or payment history. Accounts with gym history must be disabled instead. This cannot be undone.</div><p className="text-white">Delete <strong>{selected.full_name}</strong>?</p></div><div className={styles.modalFooter}><button className={styles.btnCancel} onClick={() => setShowDeleteConfirm(false)}>Cancel</button><button className={styles.btnDanger} disabled={saving} onClick={deleteUser}>{saving ? "Deleting..." : "Permanently Delete"}</button></div></div></div>}
    </>;
}
