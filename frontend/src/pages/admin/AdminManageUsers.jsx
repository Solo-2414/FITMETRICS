import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { api } from "../../lib/api";
import styles from "./AdminManageUsers.module.css";

const initialForm = { email: "", username: "", password: "", full_name: "", role: "member" };

export default function AdminManageUsers() {
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

    const loadUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (role) params.set("role", role);
            if (status) params.set("status", status);
            setUsers(await api(`/users?${params.toString()}`));
            setError("");
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };
    useEffect(() => { const timer = setTimeout(loadUsers, 250); return () => clearTimeout(timer); }, [search, role, status]);

    const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    const addUser = async (event) => {
        event.preventDefault(); setSaving(true); setModalError("");
        try {
            const created = await api("/users", { method: "POST", body: form });
            setUsers((current) => [created, ...current]); setShowAddModal(false); setForm(initialForm);
        } catch (err) { setModalError(err.message); } finally { setSaving(false); }
    };
    const updateUser = async (event) => {
        event.preventDefault(); setSaving(true); setModalError("");
        try {
            const updated = await api(`/users/${selected.id}`, { method: "PATCH", body: { role: form.role, status: form.status } });
            setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
            setSelected(updated); setShowEditModal(false);
        } catch (err) { setModalError(err.message); } finally { setSaving(false); }
    };
    const openEdit = (user) => { setSelected(user); setModalError(""); setForm({ ...initialForm, role: user.role, status: user.status }); setShowEditModal(true); };
    const counts = { total: users.length, admins: users.filter((u) => u.role === "admin").length, staff: users.filter((u) => u.role === "clerk").length, members: users.filter((u) => u.role === "member").length };
    const roleClass = (value) => value === "admin" ? styles.roleAdmin : value === "clerk" ? styles.roleStaff : styles.roleMember;

    return <AdminLayout>
        <div className="d-flex flex-column mb-4"><h1 className={styles.pageTitle}>Manage Users</h1><p className={styles.pageDesc}>View and manage gym staff accounts and member profiles</p></div>
        <div className="row g-3 mb-4">
            {[["Total System Accounts", counts.total, "fa-users-viewfinder", styles.iconBoxPrimary], ["Gym Admin / Owners", counts.admins, "fa-user-shield", styles.iconBoxSecondary], ["Front Desk Staff / Clerks", counts.staff, "fa-headset", styles.iconBoxSecondary], ["Active Members", counts.members, "fa-user-group", styles.iconBoxSuccess]].map(([label, value, icon, box]) => <div className="col-12 col-sm-6 col-xl-3" key={label}><div className={styles.kpiCard}><div className={styles.kpiHeader}><span>{label}</span><div className={box}><i className={`fa-solid ${icon}`}></i></div></div><h3 className={styles.kpiValue}>{loading ? "..." : value} <span className={styles.kpiValueUnit}>Users</span></h3><span className={styles.kpiSub}>Live from database</span></div></div>)}
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className={styles.actionToolbar}><div className={styles.searchBox}><i className="fa-solid fa-magnifying-glass"></i><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, or username..." /></div><select className={styles.filterSelect} value={role} onChange={(e) => setRole(e.target.value)}><option value="">All Roles</option><option value="admin">Admin</option><option value="clerk">Clerk</option><option value="member">Member</option></select><select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select><button className={styles.btnPrimary} onClick={() => { setForm(initialForm); setModalError(""); setShowAddModal(true); }}><i className="fa-solid fa-plus"></i> Add User</button></div>
        <div className={styles.panelCard}><div className="table-responsive"><table className={`table ${styles.customTable}`}><thead><tr><th>User</th><th>Role</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.full_name || "Unnamed user"}</strong><div className={styles.subText}>@{user.username || "—"}</div></td><td><span className={roleClass(user.role)}>{user.role}</span></td><td><div>{user.email}</div><div className={styles.subText}>{user.phone || "No phone"}</div></td><td><span className={user.status === "active" ? styles.statusActive : styles.textWarning}>{user.status}</span></td><td><button className={styles.btnAction} onClick={() => { setSelected(user); setShowViewModal(true); }}>View</button><button className={styles.btnAction} onClick={() => openEdit(user)}>Edit</button></td></tr>)}{!loading && !users.length && <tr><td colSpan="5" className="text-center text-secondary py-4">No users found.</td></tr>}</tbody></table></div></div>
        {(showAddModal || showEditModal) && <div className={styles.modalOverlay}><div className={styles.modalContent}><div className={styles.modalHeader}><h3>{showAddModal ? "Add User" : "Edit User"}</h3><button onClick={() => { setShowAddModal(false); setShowEditModal(false); setModalError(""); }}><i className="fa-solid fa-xmark"></i></button></div><form className={styles.modalBody} onSubmit={showAddModal ? addUser : updateUser}>{modalError && <div className={styles.modalError} role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{modalError}</span></div>}{showAddModal ? <><label className={styles.formLabel}>Full name<input className={styles.formInput} name="full_name" value={form.full_name} onChange={updateForm} required /></label><label className={styles.formLabel}>Email<input className={styles.formInput} name="email" type="email" value={form.email} onChange={updateForm} required /></label><label className={styles.formLabel}>Username<input className={styles.formInput} name="username" value={form.username} onChange={updateForm} required /></label><label className={styles.formLabel}>Temporary password<input className={styles.formInput} name="password" type="password" value={form.password} onChange={updateForm} required /></label><label className={styles.formLabel}>Role<select className={styles.formSelect} name="role" value={form.role} onChange={updateForm}><option value="member">Member</option><option value="clerk">Clerk</option><option value="admin">Admin</option></select></label></> : <><p className="text-white">{selected?.full_name}</p><label className={styles.formLabel}>Role<select className={styles.formSelect} name="role" value={form.role} onChange={updateForm}><option value="member">Member</option><option value="clerk">Clerk</option><option value="admin">Admin</option></select></label><label className={styles.formLabel}>Status<select className={styles.formSelect} name="status" value={form.status} onChange={updateForm}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label></>}<div className={styles.modalFooter}><button type="button" className={styles.btnCancel} onClick={() => { setShowAddModal(false); setShowEditModal(false); setModalError(""); }}>Cancel</button><button disabled={saving} className={styles.btnPrimaryModal}>{saving ? "Saving..." : "Save"}</button></div></form></div></div>}
        {showViewModal && selected && <div className={styles.modalOverlay}><div className={styles.modalContent}><div className={styles.modalHeader}><h3>User Details</h3><button onClick={() => setShowViewModal(false)}><i className="fa-solid fa-xmark"></i></button></div><div className={styles.modalBody}><p className="text-white mb-2"><strong>{selected.full_name}</strong></p><p className="text-secondary mb-1">{selected.email}</p><p className="text-secondary mb-1">@{selected.username || "—"}</p><p className="text-secondary">Role: {selected.role} · Status: {selected.status}</p></div></div></div>}
    </AdminLayout>;
}
