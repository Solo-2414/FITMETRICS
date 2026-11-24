import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Skeleton, SkeletonKpiCards } from "../../components/ui/Skeleton";
import styles from "./AdminMembershipPlans.module.css";
import InlineError from "../../components/ui/InlineError";
import { toastError, useToast } from "../../components/ui/toast/useToast";
import { useConfirm } from "../../components/ui/toast/useConfirm";
import useDialogA11y from "../../hooks/useDialogA11y";

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
    const [dashboard, setDashboard] = useState(null);
    const [promos, setPromos] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [promoDraft, setPromoDraft] = useState({ code: "", name: "", discount_type: "percent", discount_value: "", usage_limit: "", active: true });
    const [coachDraft, setCoachDraft] = useState({ display_name: "", addon_amount: "", external_contact_url: "", active: true });
    const toast = useToast();
    const confirm = useConfirm();
    const dialogRef = useDialogA11y(showEditModal || showAddModal || showPromoModal, () => {
        setShowEditModal(false);
        setShowAddModal(false);
        setShowPromoModal(false);
    });

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
        Promise.resolve().then(loadPlans);
        api("/admin/dashboard").then(setDashboard).catch(() => {});
        api("/admin/promos").then(setPromos).catch(() => {});
        api("/admin/coaches").then(setCoaches).catch(() => {});
    }, []);
    const savePromo = async (event) => {
        event.preventDefault();
        try {
            const created = await api("/admin/promos", { method: "POST", body: promoDraft });
            setPromos((current) => [created, ...current]); setPromoDraft({ code: "", name: "", discount_type: "percent", discount_value: "", usage_limit: "", active: true }); toast.success("Promo created.");
        } catch (err) { toast.error(toastError(err)); }
    };
    const saveCoach = async (event) => {
        event.preventDefault();
        try {
            const created = await api("/admin/coaches", { method: "POST", body: coachDraft });
            setCoaches((current) => [...current, created]); setCoachDraft({ display_name: "", addon_amount: "", external_contact_url: "", active: true }); toast.success("Coach added.");
        } catch (err) { toast.error(toastError(err)); }
    };
    const togglePromo = async (promo) => {
        try {
            const updated = await api(`/admin/promos/${promo.id}`, { method: "PATCH", body: { active: !promo.active } });
            setPromos((current) => current.map((item) => item.id === updated.id ? updated : item));
            toast.success("Promo updated.");
        } catch (err) { toast.error(toastError(err)); }
    };
    const deletePromo = async (promo) => {
        if (!await confirm({ title: "Delete promo?", message: `Delete promo ${promo.code}?`, danger: true })) return;
        try {
            await api(`/admin/promos/${promo.id}`, { method: "DELETE" });
            setPromos((current) => current.filter((item) => item.id !== promo.id));
            toast.success("Promo deleted.");
        } catch (err) { toast.error(toastError(err)); }
    };
    const toggleCoach = async (coach) => {
        try {
            const updated = await api(`/admin/coaches/${coach.id}`, { method: "PATCH", body: { active: !coach.active } });
            setCoaches((current) => current.map((item) => item.id === updated.id ? updated : item));
            toast.success("Coach updated.");
        } catch (err) { toast.error(toastError(err)); }
    };

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
        if (Number(draft.duration_days) < 1 || (draft.student_price !== "" && Number(draft.student_price) > Number(draft.price))) {
            setError("Duration must be at least 1 day and student rate cannot exceed the standard rate.");
            return;
        }
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
            toast.success(isNew ? "Membership plan created." : "Membership plan updated.");
        } catch (err) {
            setError(err.message);
            toast.error(toastError(err));
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
        <>
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

            {error && <InlineError error={error} />}

            {loading ? <SkeletonKpiCards count={3} colClass="col-12 col-md-4" labels={["Total Active Passes", "Session Walk-Ins", "Monthly Roster"]} icons={["fa-id-card-clip", "fa-person-walking", "fa-users"]} /> : <div className="row g-3 mb-5 fm-fade-in" data-aos="fade-up" data-aos-delay="100">
                {[
                    ["Total Active Passes", activePlans.length, "fa-id-card-clip", styles.iconBoxPrimary],
                    ["Session Walk-Ins", dashboard?.planDistribution?.find((plan) => plan.code === walkInPlan?.code)?.count || 0, "fa-person-walking", styles.iconBoxSecondary],
                    ["Monthly Roster", dashboard?.planDistribution?.find((plan) => plan.code === monthlyPlan?.code)?.count || 0, "fa-users", styles.iconBoxSuccess],
                ].map(([label, value, icon, box]) => (
                    <div className="col-12 col-md-4" key={label}>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiHeader}><span>{label}</span><div className={box}><i className={`fa-solid ${icon}`}></i></div></div>
                            <h3 className={styles.kpiValue}>{loading ? "..." : value}</h3>
                            <div className="d-flex justify-content-between align-items-center mt-2"><span className={styles.kpiSub}>{label === "Monthly Roster" ? "Configured plan" : "Live from database"}</span></div>
                        </div>
                    </div>
                ))}
            </div>}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4" data-aos="fade-up" data-aos-delay="200">
                <h3 className={styles.sectionTitle}>Standard Access Tiers</h3>
                <span className={styles.sectionSubtitle}>Strict pure admission rates · Direct entry</span>
            </div>

            {loading ? <div className="row g-4 mb-5" aria-label="Loading membership plans">{Array.from({ length: 4 }, (_, index) => <div className="col-12 col-md-6 col-xl-3" key={index}><div className={styles.planCard} aria-hidden="true"><div className="d-flex justify-content-between align-items-center mb-3"><Skeleton w={92} h={20} r={999} /><i className="fa-regular fa-calendar text-secondary"></i></div><Skeleton w="72%" h={20} className="mb-3" /><div className="d-flex align-items-baseline gap-2 mb-3"><Skeleton w={112} h={30} /><Skeleton w={64} h={12} /></div><Skeleton w="96%" h={11} className="mb-2" /><Skeleton w="74%" h={11} className="mb-4" /><div className={styles.studentRateBox}><div className="d-flex justify-content-between align-items-center mb-1"><span className={styles.studentLabel}>Student Rate</span><Skeleton w={64} h={13} /></div><Skeleton w="82%" h={10} /></div><div className={styles.planFooter}><Skeleton w={56} h={13} /><Skeleton w={52} h={30} r={6} /></div></div></div>)}</div> : <div className="row g-4 mb-5 fm-fade-in" data-aos="fade-up" data-aos-delay="300">
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
            </div>}
            <div className={styles.policyBanner}><i className="fa-solid fa-shield-halved"></i><div><h5 className="text-white m-0 mb-1" style={{ fontSize: "0.95rem" }}>Direct Gym Access Policy</h5><p className="text-secondary m-0" style={{ fontSize: "0.85rem", lineHeight: "1.5" }}>All rates cover standard admission to gym equipment and the workout area for the designated validity window. Coach services are optional add-ons.</p></div></div>
            <div className="row g-4 mt-1">
                <div className="col-12 col-xl-6"><div className={styles.planCard}><h4 className={styles.planName}>Promos</h4><form onSubmit={savePromo} className="d-flex flex-column gap-2"><input className={styles.formInput} placeholder="Code" value={promoDraft.code} onChange={(event) => setPromoDraft({ ...promoDraft, code: event.target.value })} required /><input className={styles.formInput} placeholder="Name" value={promoDraft.name} onChange={(event) => setPromoDraft({ ...promoDraft, name: event.target.value })} required /><div className="d-flex gap-2"><select className={styles.formInput} value={promoDraft.discount_type} onChange={(event) => setPromoDraft({ ...promoDraft, discount_type: event.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed</option></select><input className={styles.formInput} type="number" min="0" placeholder="Value" value={promoDraft.discount_value} onChange={(event) => setPromoDraft({ ...promoDraft, discount_value: event.target.value })} required /></div><button className={styles.btnPrimaryModal}>Add Promo</button></form>{promos.map((promo) => <div className="d-flex justify-content-between align-items-center mt-3 text-secondary" key={promo.id}><span>{promo.code} · {promo.name}</span><span>{promo.discount_type === "percent" ? `${promo.discount_value}%` : `₱${promo.discount_value}`} <button type="button" className={styles.btnAction} onClick={() => togglePromo(promo)}>{promo.active ? "Deactivate" : "Activate"}</button><button type="button" className={styles.btnAction} onClick={() => deletePromo(promo)}>Delete</button></span></div>)}</div></div>
                <div className="col-12 col-xl-6"><div className={styles.planCard}><h4 className={styles.planName}>Coaches</h4><form onSubmit={saveCoach} className="d-flex flex-column gap-2"><input className={styles.formInput} placeholder="Coach name" value={coachDraft.display_name} onChange={(event) => setCoachDraft({ ...coachDraft, display_name: event.target.value })} required /><input className={styles.formInput} type="number" min="0" placeholder="Add-on amount" value={coachDraft.addon_amount} onChange={(event) => setCoachDraft({ ...coachDraft, addon_amount: event.target.value })} required /><input className={styles.formInput} placeholder="Contact URL (optional)" value={coachDraft.external_contact_url} onChange={(event) => setCoachDraft({ ...coachDraft, external_contact_url: event.target.value })} /><button className={styles.btnPrimaryModal}>Add Coach</button></form>{coaches.map((coach) => <div className="d-flex justify-content-between align-items-center mt-3 text-secondary" key={coach.id}><span>{coach.display_name}</span><span>{coach.active ? "Active" : "Inactive"} <button type="button" className={styles.btnAction} onClick={() => toggleCoach(coach)}>{coach.active ? "Deactivate" : "Activate"}</button></span></div>)}</div></div>
            </div>

            {(showEditModal || showAddModal) && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="membership-plan-modal-title">
                        <div className={styles.modalHeader}><h3 id="membership-plan-modal-title">{showAddModal ? "Add New Plan" : "Edit Membership Rates"}</h3><button onClick={() => { setShowAddModal(false); setShowEditModal(false); }}><i className="fa-solid fa-xmark"></i></button></div>
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

            {showPromoModal && <div className={styles.modalOverlay}><div className={styles.modalContent} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="promos-modal-title"><div className={styles.modalHeader}><h3 id="promos-modal-title">Promos</h3><button onClick={() => setShowPromoModal(false)}><i className="fa-solid fa-xmark"></i></button></div><div className={styles.modalBody}><p className="text-secondary">Use the Promos section below to add, activate, deactivate, or delete promotion codes.</p></div></div></div>}
        </>
    );
}
