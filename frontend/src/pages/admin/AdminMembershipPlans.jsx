import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { api } from "../../lib/api";
import styles from "./AdminMembershipPlans.module.css";

const emptyPlan = {
    name: "",
    code: "",
    category: "standard",
    duration_days: 30,
    price: "",
    student_price: "",
    description: "",
    account_eligible: true,
    active: true,
};

export default function AdminMembershipPlans() {
    const [plans, setPlans] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [draft, setDraft] = useState(emptyPlan);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadPlans = async () => {
        setLoading(true);
        try {
            setPlans(await api("/membership-plans"));
            setError("");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    const updateDraft = (event) => {
        const { name, value, type, checked } = event.target;
        setDraft((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    };

    const openEdit = (plan) => {
        setEditingPlan(plan);
        setDraft({ ...plan, student_price: plan.student_price ?? "" });
        setShowEditModal(true);
    };

    const savePlan = async (event, isNew) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const saved = isNew
                ? await api("/membership-plans", { method: "POST", body: draft })
                : await api(`/membership-plans/${editingPlan.id}`, { method: "PATCH", body: draft });
            setPlans((current) => isNew
                ? [...current, saved].sort((a, b) => a.duration_days - b.duration_days)
                : current.map((plan) => plan.id === saved.id ? saved : plan));
            setShowAddModal(false);
            setShowEditModal(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const openAdd = () => {
        setDraft(emptyPlan);
        setError("");
        setShowAddModal(true);
    };

    const activePlans = plans.filter((plan) => plan.active);
    const walkInPlan = plans.find((plan) => plan.code === "session");
    const monthlyPlan = plans.find((plan) => plan.code === "monthly");

    return (
        <AdminLayout>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3" data-aos="fade-down">
                <div>
                    <h1 className={styles.pageTitle}>Membership Plans</h1>
                    <p className={styles.pageDesc}>Manage gym membership rates, student rates, and discounts</p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    <button className={styles.btnSecondary} onClick={() => setShowPromoModal(true)}><i className="fa-solid fa-tags"></i> Promos</button>
                    <button className={styles.btnSecondary} onClick={() => activePlans[0] && openEdit(activePlans[0])}><i className="fa-solid fa-pen"></i> Edit Rates</button>
                    <button className={styles.btnPrimary} onClick={openAdd}><i className="fa-solid fa-plus"></i> Add New Plan</button>
                </div>
            </div>

            {error && <div className="alert alert-danger mb-4" role="alert">{error}</div>}

            <div className="row g-3 mb-5" data-aos="fade-up" data-aos-delay="100">
                {[
                    ["Total Active Passes", activePlans.length, "fa-id-card-clip", styles.iconBoxPrimary],
                    ["Session Walk-Ins", walkInPlan ? "Configured" : 0, "fa-person-walking", styles.iconBoxSecondary],
                    ["Monthly Roster", monthlyPlan ? monthlyPlan.name : "Not configured", "fa-users", styles.iconBoxSuccess],
                ].map(([label, value, icon, box]) => (
                    <div className="col-12 col-md-4" key={label}>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiHeader}><span>{label}</span><div className={box}><i className={`fa-solid ${icon}`}></i></div></div>
                            <h3 className={styles.kpiValue}>{loading ? "..." : value}</h3>
                            <div className="d-flex justify-content-between align-items-center mt-2"><span className={styles.kpiSub}>{label === "Monthly Roster" ? "Configured plan" : "Live from database"}</span></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4" data-aos="fade-up" data-aos-delay="200">
                <h3 className={styles.sectionTitle}>Standard Access Tiers</h3>
                <span className={styles.sectionSubtitle}>Strict pure admission rates · Direct entry</span>
            </div>

            <div className="row g-4 mb-5" data-aos="fade-up" data-aos-delay="300">
                {plans.map((plan) => (
                    <div className="col-12 col-md-6 col-xl-3" key={plan.id}>
                        <div className={styles.planCard}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className={styles.planTag}>{plan.category === "walk_in" ? "Daily Walk-In" : "Standard Access"}</span>
                                <i className="fa-regular fa-calendar text-secondary"></i>
                            </div>
                            <h4 className={styles.planName}>{plan.name}</h4>
                            <div className={styles.priceContainer}><h2 className={styles.planPrice}>₱{Number(plan.price).toLocaleString()}</h2><span className={styles.planDuration}>/ {plan.duration_days} days</span></div>
                            <p className={styles.planDesc}>{plan.description || "Gym access for the designated validity window."}</p>
                            <div className={styles.studentRateBox}>
                                <div className="d-flex justify-content-between align-items-center mb-1"><span className={styles.studentLabel}>Student Rate</span><span className={styles.studentPrice}>{plan.student_price == null ? "—" : `₱${Number(plan.student_price).toLocaleString()}`}</span></div>
                                <p className={styles.studentDesc}>{plan.account_eligible ? "Available upon counter registration." : "No account required."}</p>
                            </div>
                            <div className={styles.planFooter}><span className={styles.footerStat}>{plan.active ? "Active" : "Inactive"}</span><button className={styles.btnAction} onClick={() => openEdit(plan)}>Edit</button></div>
                        </div>
                    </div>
                ))}
                {!loading && plans.length === 0 && <div className="col-12 text-secondary">No membership plans configured.</div>}
            </div>

            <div className={styles.policyBanner}><i className="fa-solid fa-shield-halved"></i><div><h5 className="text-white m-0 mb-1" style={{ fontSize: "0.95rem" }}>Direct Gym Access Policy</h5><p className="text-secondary m-0" style={{ fontSize: "0.85rem", lineHeight: "1.5" }}>All rates cover standard admission to gym equipment and the workout area for the designated validity window. Coach services are optional add-ons.</p></div></div>

            {(showEditModal || showAddModal) && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}><h3>{showAddModal ? "Add New Plan" : "Edit Membership Rates"}</h3><button onClick={() => { setShowAddModal(false); setShowEditModal(false); }}><i className="fa-solid fa-xmark"></i></button></div>
                        <form onSubmit={(event) => savePlan(event, showAddModal)} className={styles.modalBody}>
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-sm-8"><label className={styles.formLabel}>Plan Name</label><input name="name" value={draft.name} onChange={updateDraft} className={styles.formInput} required /></div>
                                <div className="col-12 col-sm-4"><label className={styles.formLabel}>Code</label><input name="code" value={draft.code} onChange={updateDraft} className={styles.formInput} required disabled={!showAddModal} /></div>
                            </div>
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-sm-4"><label className={styles.formLabel}>Duration (Days)</label><input name="duration_days" type="number" min="1" value={draft.duration_days} onChange={updateDraft} className={styles.formInput} required /></div>
                                <div className="col-12 col-sm-4"><label className={styles.formLabel}>Standard Rate (₱)</label><input name="price" type="number" min="0" step="0.01" value={draft.price} onChange={updateDraft} className={styles.formInput} required /></div>
                                <div className="col-12 col-sm-4"><label className={styles.formLabel}>Student Rate (₱)</label><input name="student_price" type="number" min="0" step="0.01" value={draft.student_price} onChange={updateDraft} className={styles.formInput} /></div>
                            </div>
                            <div className="mb-3"><label className={styles.formLabel}>Description</label><textarea name="description" value={draft.description || ""} onChange={updateDraft} className={styles.formInput} rows="3" /></div>
                            <div className="d-flex gap-4 mb-4"><label className={styles.checkboxLabel}><input name="account_eligible" type="checkbox" checked={draft.account_eligible} onChange={updateDraft} /> Account eligible</label><label className={styles.checkboxLabel}><input name="active" type="checkbox" checked={draft.active} onChange={updateDraft} /> Active</label></div>
                            <div className={styles.modalFooter}><button type="button" className={styles.btnCancel} onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Cancel</button><button disabled={saving} type="submit" className={styles.btnPrimaryModal}>{saving ? "Saving..." : "Save Changes"}</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showPromoModal && <div className={styles.modalOverlay}><div className={styles.modalContent}><div className={styles.modalHeader}><h3>Promos</h3><button onClick={() => setShowPromoModal(false)}><i className="fa-solid fa-xmark"></i></button></div><div className={styles.modalBody}><p className="text-secondary">No promotions are configured yet. Promotion management will be enabled in the next phase.</p></div></div></div>}
        </AdminLayout>
    );
}
