import { useEffect, useRef, useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import { api } from "../../lib/api";
import { normalizeQrPayment } from "../../lib/qrPayment";
import { SkeletonCards } from "../../components/ui/Skeleton";
import PaymentWaitPanel from "../../components/clerk/PaymentWaitPanel";
import { isCurrentDuplicateValue, normalizeRegistration, registrationIssueList, validateRegistration } from "../../lib/registrationRules";
import ClerkModal from "../../components/clerk/ClerkModal";
import styles from "./ClerkMemberRegistration.module.css";
import InlineError from "../../components/ui/InlineError";

const initialForm = {
    full_name: "",
    phone: "",
    email: "",
    password: "",
    gender: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
};
const draftKey = "fitmetrics.clerk.member-registration.draft";
const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const getDraft = () => {
    try {
        const draft = JSON.parse(sessionStorage.getItem(draftKey) || "null");
        return draft && typeof draft === "object" ? draft : {};
    } catch {
        sessionStorage.removeItem(draftKey);
        return {};
    }
};

export default function ClerkMemberRegistration() {
    const formRef = useRef(null);
    const savedDraft = getDraft();
    const [form, setForm] = useState(() => ({ ...initialForm, ...savedDraft.form, password: "" }));
    const latestFormRef = useRef(form);
    const [plans, setPlans] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState("");
    const [coachId, setCoachId] = useState(savedDraft.coachId || "");
    const [addCoach, setAddCoach] = useState(savedDraft.addCoach === true);
    const [isStudent, setIsStudent] = useState(savedDraft.isStudent === true);
    const [paymentMethod, setPaymentMethod] = useState(savedDraft.paymentMethod || "cash");
    const [cashTendered, setCashTendered] = useState("");
    const [sendReceipt, setSendReceipt] = useState(true);
    const [existing, setExisting] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [payment, setPayment] = useState(null);
    const [quote, setQuote] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(null);
    const [requiredIssues, setRequiredIssues] = useState([]);
    const [simulationEnabled, setSimulationEnabled] = useState(false);
    const duplicateValues = useRef({});
    latestFormRef.current = form;

    useEffect(() => {
        Promise.all([api("/clerk/plans"), api("/clerk/coaches")])
            .then(([loadedPlans, loadedCoaches]) => {
                setPlans(loadedPlans);
                setCoaches(loadedCoaches);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        sessionStorage.setItem(draftKey, JSON.stringify({
            form: { ...form, password: "" },
            coachId,
            addCoach,
            isStudent,
            paymentMethod,
        }));
    }, [form, selectedPlan, coachId, addCoach, isStudent, paymentMethod]);

    useEffect(() => {
        if (!selectedPlan) {
            return undefined;
        }
        api("/clerk/payments/quote", {
            method: "POST",
            body: { plan_code: selectedPlan, is_student: isStudent, coach_id: addCoach ? coachId : null },
        }).then((result) => setQuote({
            ...result,
            plan_code: selectedPlan,
            is_student: isStudent,
            coach_id: addCoach ? coachId : null,
        })).catch((err) => setError(err.message));
        return undefined;
    }, [selectedPlan, isStudent, addCoach, coachId]);

    useEffect(() => {
        const fields = ["email", "phone"];
        const timers = fields.map((field) => {
            const value = latestFormRef.current[field];
            if (duplicateValues.current[field] === value) return null;
            duplicateValues.current[field] = value;
            if (!value) return null;
            return setTimeout(() => {
                const requestedValue = value;
                api("/clerk/register/validate", { method: "POST", body: { field, value: requestedValue } })
                    .then((result) => {
                        if (!isCurrentDuplicateValue(latestFormRef.current[field], requestedValue)) return;
                        if (result.exists) {
                            setExisting((current) => current || result);
                            setFieldErrors((current) => ({ ...current, [field]: result.message }));
                        } else {
                            setExisting((current) => current?.field === field ? null : current);
                            setFieldErrors((current) => current[field] ? { ...current, [field]: undefined } : current);
                        }
                    })
                    .catch((err) => {
                        if (!isCurrentDuplicateValue(latestFormRef.current[field], requestedValue)) return;
                        if (err.code || err.field || err.staff || err.member) {
                            setExisting({ exists: true, code: err.code, field: err.field || field, member: err.member, staff: err.staff, matches: err.matches, message: err.message });
                        } else setError(err.message);
                    });
            }, 400);
        });
        return () => timers.filter(Boolean).forEach(clearTimeout);
    }, [form.email, form.phone]);

    useEffect(() => {
        if (!payment?.intent_id || ["paid", "needs_review", "failed"].includes(payment.status)) return undefined;
        const poll = setInterval(() => {
            api(`/clerk/register/qrph/${payment.intent_id}/status`)
                .then((result) => {
                    setPayment((current) => ({ ...current, ...result }));
                    if (result.status === "paid") {
                        setSuccess({ message: `Payment received. Receipt ${result.payment?.receipt_number || ""}`.trim(), memberId: result.member?.id });
                        clearDraft({ clearMessages: false });
                        setPayment(null);
                    }
                })
                .catch((err) => setError(err.message));
        }, 3000);
        return () => clearInterval(poll);
    }, [payment]);

    useEffect(() => {
        if (!payment?.qr_expires_at) return undefined;
        const update = () => setCountdown(Math.max(0, Math.floor((new Date(payment.qr_expires_at).getTime() - Date.now()) / 1000)));
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [payment]);

    const plan = plans.find((item) => item.code === selectedPlan);
    const coach = coaches.find((item) => item.id === coachId);
    const quoteMatches = quote?.plan_code === selectedPlan && quote?.is_student === isStudent && quote?.coach_id === (addCoach ? coachId : null);
    const basePrice = Number(quoteMatches ? quote.amount : (isStudent && plan?.student_price != null ? plan.student_price : plan?.price || 0));
    const coachAmount = Number(quoteMatches ? quote.coachAddonAmount : coach?.addon_amount ?? coach?.monthly_price ?? 0);
    const totalDue = Number(quoteMatches ? quote.total : basePrice + (addCoach ? coachAmount : 0));
    const tendered = Number(cashTendered);
    const shortBy = paymentMethod === "cash" && cashTendered !== "" && tendered < totalDue ? totalDue - tendered : 0;
    const change = paymentMethod === "cash" && tendered >= totalDue ? Math.round((tendered - totalDue) * 100) / 100 : 0;
    const validationErrors = validateRegistration({ ...form, plan_code: selectedPlan });
    const invalid = Object.keys(validationErrors).length > 0 || !plan || (addCoach && !coachId) || (paymentMethod === "cash" && (cashTendered === "" || tendered < totalDue));

    const update = (key) => (event) => {
        const value = event.target.value;
        setForm((current) => ({ ...current, [key]: value }));
        if (touched[key]) setFieldErrors((current) => ({ ...current, [key]: validateRegistration({ ...form, [key]: value, plan_code: selectedPlan })[key] }));
    };
    const fieldProps = (field) => ({
        name: field,
        "aria-invalid": touched[field] && Boolean(fieldErrors[field]) ? "true" : "false",
        "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
        onBlur: () => {
            setTouched((current) => ({ ...current, [field]: true }));
            setFieldErrors((current) => ({ ...current, [field]: validateRegistration({ ...form, plan_code: selectedPlan })[field] }));
        },
    });
    const fieldMessage = (field) => touched[field] && fieldErrors[field] ? <small id={`${field}-error`} className={styles.fieldError}><i className="fa-solid fa-circle-exclamation me-1"></i>{fieldErrors[field]}</small> : null;
    function clearDraft({ clearMessages = true } = {}) {
        setForm(initialForm);
        setPayment(null);
        setSelectedPlan("");
        setFieldErrors({});
        setTouched({});
        setExisting(null);
        setCashTendered("");
        setPaymentMethod("cash");
        setAddCoach(false);
        setCoachId("");
        setIsStudent(false);
        sessionStorage.removeItem(draftKey);
        if (clearMessages) {
            setError("");
            setSuccess(null);
            setRequiredIssues([]);
        }
    }

    const cancelPayment = async () => {
        if (!payment?.intent_id) return clearDraft();
        const intentId = payment.intent_id;
        clearDraft();
        try {
            await api(`/clerk/register/qrph/${intentId}/cancel`, { method: "POST" });
        } catch {
            setTimeout(() => api(`/clerk/register/qrph/${intentId}/cancel`, { method: "POST" }).catch((retryError) => setError(retryError.message)), 1000);
        }
    };

    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = validateRegistration({ ...form, plan_code: selectedPlan });
        const issues = registrationIssueList({ ...form, plan_code: selectedPlan }, { paymentMethod, cashTendered, totalDue, addCoach, coachId });
        setFieldErrors(nextErrors);
        setTouched(Object.fromEntries(Object.keys(nextErrors).map((field) => [field, true])));
        if (invalid || existing || saving) {
            setRequiredIssues(issues);
            if (existing) setShowValidationModal(false);
            else setShowValidationModal(true);
            return;
        }
        setSaving(true);
        setError("");
        setSuccess(null);
        try {
            await api("/clerk/register/validate", {
                method: "POST",
                body: { ...normalizeRegistration(form), plan_code: selectedPlan, is_student: isStudent, coach_id: addCoach ? coachId : null },
            });
            const result = await api(paymentMethod === "cash" ? "/clerk/register/cash" : "/clerk/register/qrph", {
                method: "POST",
                body: { ...normalizeRegistration(form), plan_code: selectedPlan, is_student: isStudent, coach_id: addCoach ? coachId : null, payment_method: paymentMethod, cash_tendered: paymentMethod === "cash" ? Number(cashTendered) : null, send_receipt: sendReceipt },
            });
            if (paymentMethod === "qrph") {
                try {
                    const normalized = normalizeQrPayment(result);
                    setPayment({ ...normalized, intent_id: normalized.payment_id });
                    setSimulationEnabled(normalized.simulation_enabled);
                } catch {
                    if (result?.payment_id) await api(`/clerk/register/qrph/${result.payment_id}/cancel`, { method: "POST" }).catch(() => {});
                    throw new Error("Could not create the QR. Try again.");
                }
            } else {
                setSuccess({ message: `Payment received. Receipt ${result.receipt_number || result.payment?.receipt_number || ""}`.trim(), memberId: result.member?.id });
                clearDraft({ clearMessages: false });
            }
        } catch (err) {
            if (err.code === "MEMBER_EXISTS" || err.code === "REGISTRATION_PENDING") setExisting(err);
            if (Array.isArray(err.errors)) setFieldErrors(Object.fromEntries(err.errors.map((item) => [item.field, item.message])));
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <ClerkLayout>
        <h1 className={styles.pageTitle}>Member Registration</h1>
        <p className={styles.pageDesc}>Register a new gym member and set up their member account</p>
        <SkeletonCards count={4} colClass="col-12 col-sm-6" height={120} />
    </ClerkLayout>;

    return <ClerkLayout>
        <div className="d-flex align-items-center gap-2 mb-3 text-secondary" style={{ fontSize: "0.8rem" }} data-aos="fade-down">
            <span>Desk Console</span><i className="fa-solid fa-chevron-right" style={{ fontSize: "0.6rem" }}></i><span className="text-white fw-bold">Register Member</span>
        </div>
        <div className="d-flex justify-content-between align-items-start mb-4" data-aos="fade-down" data-aos-delay="100">
            <div><h1 className={styles.pageTitle}>Member Registration</h1><p className={styles.pageDesc}>Register a new gym member and set up their member account</p></div>
        </div>
        {error && <InlineError error={error} />}
        {success && <div className={styles.successAlert}><i className="fa-solid fa-circle-check"></i><span>{success.message}</span><a className="btn btn-sm btn-outline-primary ms-auto" href={`/clerk/members?search=${encodeURIComponent(success.memberId || "")}`}>View member</a><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => clearDraft()}>Register another member</button><button type="button" className={styles.alertClose} aria-label="Dismiss" onClick={() => setSuccess(null)}><i className="fa-solid fa-xmark"></i></button></div>}
        <form ref={formRef} onSubmit={submit} noValidate>
            <div className="d-flex justify-content-end mb-3">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => clearDraft()} title="Clear the saved registration draft"><i className="fa-solid fa-rotate-left me-2"></i>Clear form</button>
            </div>
            <div className="row g-4 mb-4">
                <div className="col-12 col-xl-8 d-flex flex-column gap-4">
                    <div className={styles.panelCard} data-aos="fade-right" data-aos-delay="200">
                        <div className={styles.panelHeader}><i className="fa-regular fa-user text-primary"></i><span>Member Personal Information</span></div>
                        <div className={styles.panelBody}>
                            <div className="mb-3"><label className={styles.formLabel}>Full Name</label><input {...fieldProps("full_name")} autoComplete="off" type="text" className={`${styles.formInput} ${fieldErrors.full_name ? styles.inputError : ""}`} placeholder="e.g. Juanito dela Cruz" value={form.full_name} onChange={update("full_name")} disabled={saving} required />{fieldMessage("full_name")}</div>
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-md-6"><label className={styles.formLabel}>Mobile Contact Number</label><input {...fieldProps("phone")} autoComplete="off" type="text" className={`${styles.formInput} ${fieldErrors.phone ? styles.inputError : ""}`} placeholder="0917 123 4567" value={form.phone} onChange={update("phone")} disabled={saving} required />{fieldMessage("phone")}</div>
                                <div className="col-12 col-md-6"><label className={styles.formLabel}>Email Address</label><input {...fieldProps("email")} autoComplete="off" type="email" className={`${styles.formInput} ${fieldErrors.email ? styles.inputError : ""}`} placeholder="juan.delacruz@example.com" value={form.email} onChange={update("email")} disabled={saving} required /><span className={styles.helperText}><i className="fa-solid fa-circle-info me-1"></i> Used to send your receipt and welcome email.</span>{fieldMessage("email")}</div>
                            </div>
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-md-6"><label className={styles.formLabel}>Password</label><input {...fieldProps("password")} autoComplete="new-password" type="password" className={`${styles.formInput} ${fieldErrors.password ? styles.inputError : ""}`} placeholder="Create a strong password" value={form.password} onChange={update("password")} disabled={saving} required />{fieldMessage("password")}</div>
                                <div className="col-12 col-md-6"><label className={styles.formLabel}>Gender</label><select {...fieldProps("gender")} className={`${styles.formSelect} ${fieldErrors.gender ? styles.inputError : ""}`} value={form.gender} onChange={update("gender")} disabled={saving} required><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>{fieldMessage("gender")}</div>
                            </div>
                            <div className="row g-3"><div className="col-12 col-md-6"><label className={styles.formLabel}>Emergency Contact Name</label><input {...fieldProps("emergency_contact_name")} type="text" className={`${styles.formInput} ${fieldErrors.emergency_contact_name ? styles.inputError : ""}`} placeholder="Maria dela Cruz" value={form.emergency_contact_name} onChange={update("emergency_contact_name")} disabled={saving} required />{fieldMessage("emergency_contact_name")}</div><div className="col-12 col-md-6"><label className={styles.formLabel}>Emergency Phone Number</label><input {...fieldProps("emergency_contact_phone")} type="text" className={`${styles.formInput} ${fieldErrors.emergency_contact_phone ? styles.inputError : ""}`} placeholder="0918 765 4321" value={form.emergency_contact_phone} onChange={update("emergency_contact_phone")} disabled={saving} required />{fieldMessage("emergency_contact_phone")}</div></div>
                        </div>
                    </div>
                    <div className={styles.panelCard} data-aos="fade-right" data-aos-delay="300">
                        <div className="d-flex justify-content-between align-items-center border-bottom border-secondary p-4"><div className={styles.panelHeaderNoBorder}><i className="fa-solid fa-id-card-clip text-primary"></i><span>Membership Plan Selection</span></div><span className="text-secondary" style={{ fontSize: "0.8rem" }}>Local gym rates</span></div>
                        <div className={styles.panelBody}>
                            {/* toast-allow: field validation remains inline */}
                            {!selectedPlan && fieldErrors.plan_code && <div className="alert alert-danger" role="alert"><i className="fa-solid fa-circle-exclamation me-2"></i>{fieldErrors.plan_code}</div>}
                            <div className="row g-3 mb-4">{plans.map((item) => <div className="col-12 col-sm-6" key={item.code}><div role="button" tabIndex={0} className={`${styles.planCard} ${selectedPlan === item.code ? styles.planCardActive : ""} ${!selectedPlan && fieldErrors.plan_code ? styles.planCardError : ""}`} onClick={() => { setSelectedPlan(item.code); setFieldErrors((current) => ({ ...current, plan_code: undefined })); setCashTendered(""); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedPlan(item.code); }}><div className="d-flex justify-content-between align-items-start mb-2"><div><span className={styles.planName}>{item.name}{item.popular && <span className={styles.popularBadge}>Popular</span>}</span><span className={styles.planDuration}>{item.duration_days} Days Valid</span></div><span className={`${styles.radioCircle} ${selectedPlan === item.code ? styles.radioCircleActive : ""}`}>{selectedPlan === item.code && <span className={styles.radioInner}></span>}</span></div><h3 className={styles.planPrice}>{money(item.price)}{item.student_price != null && <span className={styles.planPriceSub}> (Student: {money(item.student_price)})</span>}</h3></div></div>)}{!plans.length && <div className="col-12 text-secondary">No membership passes configured.</div>}</div>
                            {plan?.student_price != null && <label className={`${styles.infoAlert} ${styles.studentRateToggle}`}><input type="checkbox" className={styles.customCheckbox} checked={isStudent} onChange={(event) => { setIsStudent(event.target.checked); setCashTendered(""); }} /><i className="fa-regular fa-circle-check"></i><span>Apply student rate for this member<small className="d-block mt-1">This uses {money(plan.student_price)} instead of {money(plan.price)}.</small></span></label>}
                        </div>
                    </div>
                    <div className={styles.panelCard} data-aos="fade-right" data-aos-delay="400">
                        <div className={styles.panelHeader}><i className="fa-solid fa-user-tie text-primary"></i><span>Optional Coach Assistance</span></div>
                        <div className={styles.panelBody}><div className={styles.coachToggleBox}><label className={styles.checkboxLabel}><input type="checkbox" className={styles.customCheckbox} checked={addCoach} onChange={(event) => { setAddCoach(event.target.checked); setCoachId(""); setCashTendered(""); }} /><div><span className={styles.planName}>Add Coach Assistance</span><span className={styles.planDuration}>Adds personal guidance for fitness routines</span></div></label><select className={styles.formSelect} disabled={!addCoach || saving} value={coachId} onChange={(event) => setCoachId(event.target.value)} style={{ width: "200px" }}><option value="">Select Coach</option>{coaches.map((item) => <option value={item.id} key={item.id}>{item.display_name} (+{money(item.addon_amount || item.monthly_price)})</option>)}</select></div></div>
                    </div>
                </div>
                <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                    <div className={styles.panelCard} data-aos="fade-left" data-aos-delay="200">
                        <div className={styles.panelHeader}><i className="fa-solid fa-receipt text-primary"></i><span>Payment & Digital Receipt</span></div>
                        <div className={styles.panelBody}>
                            <div className="d-flex justify-content-between align-items-center mb-3"><span className="text-secondary" style={{ fontSize: "0.85rem" }}>{plan?.name || "No plan selected"} ({plan?.duration_days || 0} Days)</span><span className="text-white fw-bold">{money(basePrice)}</span></div>
                            {addCoach && <div className="d-flex justify-content-between align-items-center mb-3"><span className="text-secondary" style={{ fontSize: "0.85rem" }}>Coach Assistance</span><span className="text-white fw-bold">{money(coachAmount)}</span></div>}
                            <div className={styles.totalBox}><span className="text-white" style={{ fontSize: "0.9rem" }}>Total Amount Due</span><h2 className={styles.totalPrice}>{money(totalDue)}</h2></div>
                            {!payment && <><div className="mb-4"><span className={styles.formLabel}>Payment Method</span><div className="d-flex gap-2"><button type="button" className={`${styles.btnPaymentMethod} ${paymentMethod === "cash" ? styles.btnPaymentMethodActive : ""}`} onClick={() => { setPaymentMethod("cash"); setCashTendered(""); }}><i className="fa-solid fa-money-bill"></i>Cash</button><button type="button" className={`${styles.btnPaymentMethod} ${paymentMethod === "qrph" ? styles.btnPaymentMethodActive : ""}`} onClick={() => { setPaymentMethod("qrph"); setCashTendered(""); }}><i className="fa-solid fa-qrcode"></i>QR Ph</button></div></div>
                            {paymentMethod === "cash" && <div className="row g-3 mb-4"><div className="col-6"><label className={styles.formLabel}>Cash Tendered</label><div className={styles.inputGroupPrefix}><span>₱</span><input type="number" min="0" step="0.01" inputMode="decimal" className={styles.formInput} placeholder="1000" value={cashTendered} onChange={(event) => setCashTendered(event.target.value.replace(/[eE+-]/g, ""))} /></div><div className="d-flex gap-1 mt-2"><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCashTendered(String(totalDue))}>Exact</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCashTendered("500")}>₱500</button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCashTendered("1000")}>₱1,000</button></div></div><div className="col-6"><label className={styles.formLabel}>Change</label><div className={styles.changeDisplay}>{shortBy ? `Short by ${money(shortBy)}` : money(change)}</div></div></div>}
                            <label className={styles.checkboxLabelFull}><input type="checkbox" className={styles.customCheckbox} checked={sendReceipt} onChange={(event) => setSendReceipt(event.target.checked)} /><div><span className="d-block text-white fw-bold mb-1" style={{ fontSize: "0.85rem" }}>Send receipt and welcome email</span><span className="text-secondary" style={{ fontSize: "0.75rem", lineHeight: "1.4" }}>Sends the payment receipt and a welcome email.</span></div></label></>}
                            {payment && <PaymentWaitPanel payment={{ ...payment, qrClassName: styles.qrImage }} countdown={countdown == null ? 0 : countdown} simulationEnabled={simulationEnabled} onSimulate={() => api(`/clerk/register/qrph/${payment.intent_id}/simulate-paid`, { method: "POST" }).then((result) => { if (result.status === "paid") { setSuccess({ message: `Payment received. Receipt ${result.payment?.receipt_number || ""}`.trim(), memberId: result.member?.id }); clearDraft({ clearMessages: false }); } else setPayment((current) => ({ ...current, ...result })); }).catch((err) => setError(err.message))} onCancel={cancelPayment} onGenerate={() => { setPayment(null); setCountdown(null); }} />}
                        </div>
                    </div>
                    <div className={styles.actionPanel} data-aos="fade-left" data-aos-delay="300"><button type="submit" aria-disabled={saving || invalid || Boolean(existing) || Boolean(payment) ? "true" : "false"} className={`${styles.btnSubmit} ${saving || invalid || existing || payment ? styles.btnSubmitGated : ""}`}><i className="fa-regular fa-paper-plane"></i>{saving ? "Saving..." : paymentMethod === "qrph" ? "Generate QR Ph & Register" : "Complete Registration & Send Email"}</button><p className="text-center text-secondary mt-3 mb-0" style={{ fontSize: "0.75rem", lineHeight: "1.5" }}>An account will be created automatically. The member can log in using their email and password.</p></div>
                </div>
            </div>
        </form>
        {showValidationModal && <ClerkModal title="Please complete the required information" icon="fa-circle-exclamation" labelledBy="registration-validation-title" onClose={() => setShowValidationModal(false)} footer={<button type="button" className={styles.btnCancelFull} onClick={() => setShowValidationModal(false)}>Review form</button>}>
            <p className="text-secondary">Review these items before completing the registration.</p>
            <div className={styles.issueList}>{requiredIssues.map((issue) => <button type="button" className={styles.issueRow} key={issue.field} onClick={() => { setShowValidationModal(false); const target = document.querySelector(`[name="${issue.field}"]`); target?.focus(); if (issue.field === "plan_code") document.querySelector(`.${styles.planCard}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><i className="fa-solid fa-triangle-exclamation"></i><span><strong>{issue.label}</strong><small>{issue.message}</small></span></button>)}</div>
        </ClerkModal>}
        {existing && <ClerkModal title={existing.code === "REGISTRATION_PENDING" ? "Registration waiting for payment" : "Member already registered"} icon="fa-user-check" labelledBy="member-exists-title" onClose={() => setExisting(null)} footer={<div className={styles.modalButtons}>{existing.member && <a className={styles.btnSubmit} href={`/clerk/members?search=${encodeURIComponent(existing.member.member_code || existing.member.id)}`}>View member</a>}<button type="button" className={styles.btnCancelFull} onClick={() => { setExisting(null); document.querySelector(`[name="${existing.field || "email"}"]`)?.focus(); }}>Edit details</button></div>}>
            {(existing.matches || [existing]).map((match) => <p key={`${match.field}-${match.code}`}>{match.staff ? `This ${match.field} is used by a staff account and cannot be used for a member.` : match.code === "REGISTRATION_PENDING" ? "A registration for this person is waiting for payment." : `This ${match.field === "phone" ? "mobile number" : "email"} is already registered.`}</p>)}
            {existing.member && <div className={styles.existingDetails}><span>{existing.member.full_name}</span>{existing.member.member_code && <span>{existing.member.member_code}</span>}<span className={styles.statusBadge}>{existing.member.status || "active"}</span></div>}
        </ClerkModal>}
    </ClerkLayout>;
}
