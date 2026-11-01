/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import ClerkModal from "../../components/clerk/ClerkModal";
import QrPaymentPanel from "../../components/clerk/payments/QrPaymentPanel";
import InlineError from "../../components/ui/InlineError";
import { SkeletonCards, SkeletonTable } from "../../components/ui/Skeleton";
import { useConfirm } from "../../components/ui/toast/useConfirm";
import { useToast } from "../../components/ui/toast/useToast";
import { playTerminalAlert, useTerminalPreferences } from "../../hooks/useTerminalPreferences";
import { api } from "../../lib/api";
import { formatPhone, normalizeEmail, normalizeName, validateWalkInCustomer } from "../../lib/walkInRules";
import styles from "./ClerkPayments.module.css";

const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

function StepCard({ number, title, hint, complete, children }) {
    return <section className={styles.stepCard}>
        <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>{number}</span>
            <div><h2>{title}</h2><p>{hint}</p></div>
            {complete && <i className={`fa-solid fa-circle-check ${styles.stepComplete}`} aria-label="Complete"></i>}
        </div>
        {children}
    </section>;
}

function PlanCard({ plan, selected, onSelect, student }) {
    const price = student && plan.student_price != null ? plan.student_price : plan.price;
    return <button type="button" className={`${styles.planCard} ${selected ? styles.selectedCard : ""}`} onClick={onSelect}>
        <span className={styles.radio}>{selected && <i className="fa-solid fa-check"></i>}</span>
        <span className={styles.planDetails}><strong>{plan.name}</strong><small>{plan.duration_days} days · {plan.student_price != null ? `Student ${money(plan.student_price)}` : "Gym access plan"}</small></span>
        <strong className={styles.planPrice}>{money(price)}</strong>
    </button>;
}

export default function ClerkPayments() {
    const toast = useToast();
    const confirm = useConfirm();
    const { preferences } = useTerminalPreferences();
    const [searchParams, setSearchParams] = useSearchParams();
    const isWalkIn = searchParams.get("mode") === "walkin";
    const mode = isWalkIn ? "walkin" : "member";
    const [plans, setPlans] = useState({});
    const [members, setMembers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [selectedTransactionId, setSelectedTransactionId] = useState("");
    const [stats, setStats] = useState(null);
    const [drawer, setDrawer] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState("");
    const [selectedMemberId, setSelectedMemberId] = useState("");
    const [memberSearch, setMemberSearch] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestNotes, setGuestNotes] = useState("");
    const [promoCode, setPromoCode] = useState("");
    const [isStudent, setIsStudent] = useState(false);
    const [studentIdChecked, setStudentIdChecked] = useState(false);
    const [checkInNow, setCheckInNow] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem("fitmetrics.defaultPaymentMethod") === "qrph" ? "qrph" : "cash");
    const [cashTendered, setCashTendered] = useState("");
    const [sendReceipt, setSendReceipt] = useState(true);
    const [transactionSearch, setTransactionSearch] = useState("");
    const [transactionStatus, setTransactionStatus] = useState("");
    const [transactionMethod, setTransactionMethod] = useState("");
    const [transactionType, setTransactionType] = useState("");
    const [datePreset, setDatePreset] = useState("today");
    const [page, setPage] = useState(1);
    const [pendingPayment, setPendingPayment] = useState(null);
    const [qrClock, setQrClock] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [validationMessage, setValidationMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [customerCheck, setCustomerCheck] = useState(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [drawerForm, setDrawerForm] = useState({ amount: "", counted: "", note: "" });

    const loadPayments = useCallback(async () => {
        setError("");
        const from = datePreset === "yesterday" ? new Date(Date.now() - 86400000) : new Date();
        const fromDate = datePreset === "this-month" ? `${today().slice(0, 8)}01` : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(from);
        const params = new URLSearchParams({ search: transactionSearch, page: String(page), limit: "10", from: fromDate, to: datePreset === "last-7" ? today() : fromDate });
        if (transactionStatus) params.set("status", transactionStatus);
        if (transactionMethod) params.set("method", transactionMethod);
        if (transactionType) params.set("type", transactionType);
        const [planRows, memberRows, paymentRows, dashboard, drawerToday] = await Promise.all([
            api("/clerk/plans?include_session=true"), api("/clerk/members"), api(`/clerk/payments?${params}`), api("/clerk/dashboard"), api("/clerk/cash-drawer/today"),
        ]);
        setPlans(Object.fromEntries(planRows.filter((plan) => plan.account_eligible || plan.code === "session").map((plan) => [plan.code, { ...plan, price: Number(plan.price), student_price: plan.student_price == null ? null : Number(plan.student_price) }])));
        setMembers(memberRows);
        setTransactions(paymentRows.rows || []);
        setStats({ ...dashboard, total: paymentRows.totals?.paid || dashboard.totalCollected || 0 });
        setDrawer(drawerToday);
        setLoading(false);
    }, [datePreset, page, transactionMethod, transactionSearch, transactionStatus, transactionType]);

    useEffect(() => {
        loadPayments().catch((err) => { setError(err.message); setLoading(false); });
    }, [loadPayments]);

    useEffect(() => {
        setSelectedPlan("");
        setSelectedMemberId("");
        setMemberSearch("");
        setPendingPayment(null);
        setFieldErrors({});
        setCustomerCheck(null);
        setReviewOpen(false);
        setStudentIdChecked(false);
        if (isWalkIn) setSelectedPlan("session");
    }, [isWalkIn]);

    useEffect(() => {
        if (!pendingPayment) return undefined;
        const timer = window.setInterval(async () => {
            setQrClock((value) => Math.max(0, value - 3));
            try {
                const endpoint = isWalkIn ? `/clerk/walkins/qrph/${pendingPayment.payment_id}/status` : `/clerk/payments/${pendingPayment.payment_id}/status`;
                const result = await api(endpoint);
                if (["paid", "needs_review", "cancelled", "expired"].includes(result.status)) {
                    if (result.status === "paid") {
                        setPendingPayment(null);
                        toast.success(`Payment paid${result.receipt_number ? ` (${result.receipt_number})` : ""}.`);
                        await loadPayments();
                    } else {
                        setPendingPayment((current) => ({ ...current, ...result }));
                    }
                }
            } catch (err) {
                if (err.status !== 429) toast.error(err.message);
            }
        }, 3000);
        return () => window.clearInterval(timer);
    }, [isWalkIn, loadPayments, pendingPayment, toast]);

    const selectedMember = members.find((member) => member.id === selectedMemberId) || null;
    const matchingMembers = memberSearch.trim() && !selectedMember
        ? members.filter((member) => `${member.full_name || ""} ${member.email || ""} ${member.phone || ""} ${member.member_details?.member_code || ""}`.toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 6)
        : [];
    const activePlan = plans[isWalkIn ? "session" : selectedPlan];
    const currentPrice = activePlan ? Number(isStudent && activePlan.student_price != null ? activePlan.student_price : activePlan.price) : 0;
    const change = Math.max(0, Number(cashTendered || 0) - currentPrice);
    const selectedTransaction = transactions.find((item) => item.id === selectedTransactionId);
    const completeCustomer = isWalkIn ? memberSearch.trim().length >= 2 && guestPhone.trim().length >= 11 : Boolean(selectedMember);
    const canSubmit = completeCustomer && Boolean(activePlan) && (paymentMethod === "qrph" || Number(cashTendered) >= currentPrice);

    const setFieldError = (field, message) => setFieldErrors((current) => ({ ...current, [field]: message }));
    const validateWalkIn = () => {
        const result = validateWalkInCustomer({
            full_name: memberSearch, phone: guestPhone, email: guestEmail, notes: guestNotes,
            promo_code: promoCode, is_student: isStudent, student_id_checked: studentIdChecked,
        }, { plan: activePlan });
        setFieldErrors(Object.fromEntries(result.errors.map((item) => [item.field, item.message])));
        return result;
    };
    const checkCustomer = async () => {
        const result = validateWalkIn();
        if (!result.valid) return;
        try {
            const checked = await api("/clerk/walkins/validate", {
                method: "POST",
                body: { ...result.values, plan_code: "session" },
            });
            setCustomerCheck(checked);
        } catch (err) {
            if (err.status === 409) {
                setCustomerCheck({ member_match: err.member_match, returning: err.returning });
            } else if (err.status === 422 && err.errors?.length) {
                setFieldErrors(Object.fromEntries(err.errors.map((item) => [item.field, item.message])));
            } else {
                toast.error(err.message);
            }
        }
    };
    const fieldProps = (field) => ({
        "aria-invalid": Boolean(fieldErrors[field]),
        "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
    });
    const fieldMessage = (field) => fieldErrors[field] && <InlineError error={fieldErrors[field]} />;

    const submitPayment = async (event) => {
        event.preventDefault();
        if (!canSubmit) {
            setValidationMessage(isWalkIn ? "Enter the customer name, mobile number, and choose a payment method." : "Select a member, plan, and cash amount before recording the payment.");
            return;
        }
        if (isWalkIn) {
            const validation = validateWalkIn();
            if (!validation.valid) {
                document.getElementById(`${validation.errors[0].field}-input`)?.focus();
                return;
            }
            await checkCustomer();
            setReviewOpen(true);
            return;
        }
        setSaving(true);
        setValidationMessage("");
        try {
            if (preferences.paymentPrompt && !await confirm({ title: "Record payment?", message: `Record ${money(currentPrice)} for ${selectedMember?.full_name || memberSearch}?` })) return;
            const body = {
                plan_code: isWalkIn ? "session" : selectedPlan, member_id: isWalkIn ? undefined : selectedMember.id,
                full_name: isWalkIn ? memberSearch.trim() : undefined, guest_name: isWalkIn ? memberSearch.trim() : undefined,
                phone: isWalkIn ? guestPhone.trim() : undefined, guest_phone: isWalkIn ? guestPhone.trim() : undefined,
                email: isWalkIn ? guestEmail.trim() : undefined, guest_email: isWalkIn ? guestEmail.trim() : undefined,
                notes: isWalkIn ? guestNotes.trim() : undefined, is_student: isStudent, check_in_now: checkInNow,
                payment_method: paymentMethod, promo_code: promoCode || null, cash_tendered: paymentMethod === "cash" ? Number(cashTendered) : undefined, send_receipt: sendReceipt,
            };
            const endpoint = isWalkIn ? `/clerk/walkins/${paymentMethod}` : "/clerk/memberships";
            const result = await api(endpoint, { method: "POST", body });
            if (paymentMethod === "qrph" && result.payment_id) {
                setPendingPayment({ ...result, amountLabel: money(result.amount_total || currentPrice) });
                setQrClock(300);
                toast.info("QR Ph created. Waiting for payment.");
            } else {
                toast.success(`Payment recorded${result.receipt_number ? ` (${result.receipt_number})` : ""}.`);
                playTerminalAlert(preferences.audioAlerts);
                await loadPayments();
                setMemberSearch(""); setSelectedMemberId(""); setGuestPhone(""); setGuestEmail(""); setGuestNotes(""); setPromoCode(""); setCashTendered(""); setSelectedPlan(isWalkIn ? "session" : "");
            }
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const confirmWalkIn = async () => {
        setSaving(true);
        try {
            const validation = validateWalkIn();
            if (!validation.valid) {
                setReviewOpen(false);
                document.getElementById(`${validation.errors[0].field}-input`)?.focus();
                return;
            }
            const body = {
                plan_code: "session", full_name: validation.values.full_name, guest_name: validation.values.full_name,
                phone: validation.values.phone, guest_phone: validation.values.phone, email: validation.values.email || undefined,
                guest_email: validation.values.email || undefined, notes: validation.values.notes || undefined,
                is_student: validation.values.is_student, student_id_checked: validation.values.student_id_checked,
                check_in_now: checkInNow, payment_method: paymentMethod, promo_code: validation.values.promo_code,
                cash_tendered: paymentMethod === "cash" ? Number(cashTendered) : undefined, send_receipt: sendReceipt,
            };
            const result = await api(`/clerk/walkins/${paymentMethod}`, { method: "POST", body });
            setReviewOpen(false);
            if (paymentMethod === "qrph" && result.payment_id) {
                setPendingPayment({ ...result, amountLabel: money(result.amount_total || currentPrice) });
                setQrClock(300);
                toast.info("QR Ph created. Waiting for payment.");
            } else {
                toast.success(`Payment recorded${result.receipt_number ? ` (${result.receipt_number})` : ""}.`);
                playTerminalAlert(preferences.audioAlerts);
                await loadPayments();
                setMemberSearch(""); setSelectedMemberId(""); setGuestPhone(""); setGuestEmail(""); setGuestNotes(""); setPromoCode(""); setCashTendered(""); setSelectedPlan("session"); setIsStudent(false); setStudentIdChecked(false); setCustomerCheck(null);
            }
        } catch (err) {
            if (err.status === 422 && err.errors?.length) {
                setReviewOpen(false);
                setFieldErrors(Object.fromEntries(err.errors.map((item) => [item.field, item.message])));
                document.getElementById(`${err.errors[0].field}-input`)?.focus();
            } else toast.error(err.message);
        } finally { setSaving(false); }
    };

    const setMode = (nextMode) => setSearchParams({ mode: nextMode });
    const drawerAction = async (action) => {
        try {
            const result = action === "open"
                ? await api("/clerk/cash-drawer/open", { method: "POST", body: { opening_float: Number(drawerForm.amount) } })
                : await api("/clerk/cash-drawer/close", { method: "POST", body: { counted_cash: Number(drawerForm.counted), note: drawerForm.note } });
            setDrawer(result); setDrawerForm({ amount: "", counted: "", note: "" }); toast.success(action === "open" ? "Starting float recorded." : "End of day review completed.");
        } catch (err) { toast.error(err.message); }
    };

    if (loading) return <ClerkLayout><div className={styles.loadingHeader}><h1 className={styles.pageTitle}>Payments</h1><p className={styles.pageDesc}>Record payments and manage the daily cash drawer.</p></div><SkeletonCards count={5} /><SkeletonTable rows={6} cols={7} /></ClerkLayout>;

    return <ClerkLayout>
        <header className={styles.pageHeader}>
            <div><h1 className={styles.pageTitle}>Payments</h1><p className={styles.pageDesc}>Record payments and manage the daily cash drawer.</p></div>
            <div className={styles.headerActions}><span className={styles.timeBadge}><i className="fa-regular fa-calendar"></i>{new Date().toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" })}</span><div className={styles.segmented} role="group" aria-label="Payment type"><button className={mode === "walkin" ? styles.segmentActive : ""} onClick={() => setMode("walkin")} type="button">Walk-in session</button><button className={mode === "member" ? styles.segmentActive : ""} onClick={() => setMode("member")} type="button">Member payment</button></div></div>
        </header>
        {error && <InlineError error={error} onRetry={() => { setLoading(true); loadPayments().catch((err) => { setError(err.message); setLoading(false); }); }} />}

        <section className={styles.drawerStrip}>
            <div className={styles.drawerStripHeader}><div><span className={styles.eyebrow}>CASH DRAWER</span><strong>{drawer?.session ? "Open today" : "Not opened"}</strong></div><div className={styles.drawerButtons}><button type="button" className={styles.secondaryButton} onClick={() => setDrawerForm((form) => ({ ...form, mode: "open" }))}>Record Starting Float</button><button type="button" className={styles.primaryOutline} onClick={() => setDrawerForm((form) => ({ ...form, mode: "close" }))}>End of Day Review</button></div></div>
            <div className={styles.drawerStats}><Stat label="Starting float" value={money(drawer?.session?.opening_float)} /><Stat label="Cash today" value={money(drawer?.cashSales ?? stats?.cashCollected)} tone="success" /><Stat label="QR Ph / digital today" value={money(stats?.eWalletCollected)} tone="primary" /><Stat label="Total today" value={money(stats?.total ?? stats?.totalCollected)} /><Stat label="Expected in drawer" value={money(drawer?.expectedCash ?? stats?.cashCollected)} tone="primary" /></div>
            {drawerForm.mode && <div className={styles.drawerForm}><label>{drawerForm.mode === "open" ? "Starting float" : "Counted cash"}<input type="number" min="0" value={drawerForm.mode === "open" ? drawerForm.amount : drawerForm.counted} onChange={(event) => setDrawerForm((form) => ({ ...form, [form.mode === "open" ? "amount" : "counted"]: event.target.value }))} /></label>{drawerForm.mode === "close" && <label>Note (required for variance)<input value={drawerForm.note} onChange={(event) => setDrawerForm((form) => ({ ...form, note: event.target.value }))} /></label>}<button type="button" className={styles.primaryButton} onClick={() => drawerAction(drawerForm.mode)}>Save</button><button type="button" className={styles.textButton} onClick={() => setDrawerForm({ amount: "", counted: "", note: "" })}>Cancel</button></div>}
        </section>

        {pendingPayment && <section className={styles.qrCard}><QrPaymentPanel payment={pendingPayment} qrClassName={isWalkIn ? styles.walkInQrImage : undefined} countdown={qrClock} simulationEnabled={pendingPayment.simulation_enabled} onCancel={async () => { const endpoint = isWalkIn ? `/clerk/walkins/qrph/${pendingPayment.payment_id}/cancel` : `/clerk/payments/${pendingPayment.payment_id}/cancel`; await api(endpoint, { method: "POST" }); setPendingPayment(null); }} onGenerate={() => setPendingPayment(null)} onSimulate={async () => { const endpoint = isWalkIn ? `/clerk/walkins/qrph/${pendingPayment.payment_id}/simulate-paid` : `/clerk/payments/${pendingPayment.payment_id}/simulate-paid`; const result = await api(endpoint, { method: "POST" }); if (result.status === "paid") { setPendingPayment(null); toast.success(`Payment paid${result.receipt_number ? ` (${result.receipt_number})` : ""}.`); await loadPayments(); } else setPendingPayment((current) => ({ ...current, ...result })); }} /></section>}

        <form onSubmit={submitPayment} className={styles.workspace}>
            <div className={styles.steps}>
                <StepCard number="1" title={isWalkIn ? "Customer" : "Member"} hint={isWalkIn ? "Enter the guest details for today's visit." : "Search for a registered member."} complete={completeCustomer}>
                    {isWalkIn ? <div className={styles.fieldGrid}><label>Full name *<input id="full_name-input" className={`${styles.input} ${fieldErrors.full_name ? styles.inputError : ""}`} value={memberSearch} maxLength={80} onBlur={() => { const name = normalizeName(memberSearch); setMemberSearch(name); setFieldError("full_name", validateWalkInCustomer({ full_name: name, phone: guestPhone, email: guestEmail, notes: guestNotes, is_student: isStudent, student_id_checked: studentIdChecked }, { plan: activePlan }).errors.find((item) => item.field === "full_name")?.message); if (!fieldErrors.full_name) checkCustomer(); }} onChange={(event) => { const value = event.target.value.replace(/[^\p{L}\p{M} .'’-]/gu, "").replace(/\s+/g, " ").slice(0, 80); setMemberSearch(value); setCustomerCheck(null); setFieldError("full_name", ""); }} placeholder="Customer name" {...fieldProps("full_name")} />{fieldMessage("full_name")}</label><label>Mobile *<input id="phone-input" className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ""}`} value={formatPhone(guestPhone)} maxLength={13} onBlur={checkCustomer} onChange={(event) => { const value = event.target.value.replace(/\D/g, "").slice(0, 11); setGuestPhone(value); setCustomerCheck(null); setFieldError("phone", ""); }} placeholder="09XXXXXXXXX" inputMode="tel" {...fieldProps("phone")} />{fieldMessage("phone")}</label><label>Email optional<input id="email-input" className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`} value={guestEmail} onBlur={checkCustomer} onChange={(event) => { setGuestEmail(normalizeEmail(event.target.value)); setCustomerCheck(null); setFieldError("email", ""); }} placeholder="For the receipt" type="email" {...fieldProps("email")} />{fieldErrors.email?.startsWith("Did you mean") && <button type="button" className={styles.textButton} onClick={() => { const suggestion = validateWalkInCustomer({ full_name: memberSearch, phone: guestPhone, email: guestEmail, is_student: isStudent, student_id_checked: studentIdChecked }, { plan: activePlan }).errors.find((item) => item.field === "email")?.suggestion; if (suggestion) { setGuestEmail(suggestion); setFieldError("email", ""); } }}>{fieldErrors.email}</button>}{fieldErrors.email && !fieldErrors.email.startsWith("Did you mean") && fieldMessage("email")}</label><label>Notes<input id="notes-input" className={`${styles.input} ${fieldErrors.notes ? styles.inputError : ""}`} value={guestNotes} maxLength={200} onChange={(event) => { setGuestNotes(event.target.value); setFieldError("notes", ""); }} placeholder="Optional notes" {...fieldProps("notes")} /> <small className={styles.muted}>{guestNotes.length}/200</small>{fieldMessage("notes")}</label><label className={styles.switchLabel}><input type="checkbox" checked={isStudent} onChange={(event) => { setIsStudent(event.target.checked); setStudentIdChecked(false); setFieldError("student_id_checked", ""); }} /> Student rate</label>{isStudent && <label className={styles.switchLabel}><input id="student_id_checked-input" type="checkbox" checked={studentIdChecked} onChange={(event) => { setStudentIdChecked(event.target.checked); setFieldError("student_id_checked", ""); }} {...fieldProps("student_id_checked")} /> I checked a valid student ID</label>}<label className={styles.switchLabel}><input type="checkbox" checked={checkInNow} onChange={(event) => setCheckInNow(event.target.checked)} /> Check in now</label>{customerCheck?.returning && <p className={styles.infoLine}>Returning customer: {customerCheck.returning.visit_count || 0} previous visits.</p>}{customerCheck?.member_match && <p className={styles.infoLine}>This person has an active member plan. Use Member payment instead.</p>}</div> : <div className={styles.memberPicker}><div className={styles.searchWrap}><i className="fa-solid fa-magnifying-glass"></i><input className={styles.input} value={memberSearch} onChange={(event) => { setMemberSearch(event.target.value); setSelectedMemberId(""); }} placeholder="Search name, email, phone or member code" /></div>{matchingMembers.length > 0 && <div className={styles.memberResults}>{matchingMembers.map((member) => <button type="button" key={member.id} onClick={() => { setSelectedMemberId(member.id); setMemberSearch(member.full_name || member.email); }}>{member.full_name}<small>{member.member_details?.member_code || member.email} · {member.status_label || "No plan"}</small></button>)}</div>}{selectedMember && <div className={styles.selectedMember}><span className={styles.avatar}>{initials(selectedMember.full_name)}</span><span><strong>{selectedMember.full_name}</strong><small>{selectedMember.member_details?.member_code || "No member code"} · {selectedMember.membership?.membership_plans?.name || "No current plan"}{selectedMember.next_membership ? ` · Next: ${selectedMember.next_membership.membership_plans?.name || "Queued plan"}` : ""}</small></span><button type="button" onClick={() => { setSelectedMemberId(""); setMemberSearch(""); }}>Change</button></div>}{members.filter((member) => ["Expiring", "Expired"].includes(member.status_label)).slice(0, 4).length > 0 && !memberSearch && <div className={styles.quickPicks}><span>Needs renewal</span>{members.filter((member) => ["Expiring", "Expired"].includes(member.status_label)).slice(0, 4).map((member) => <button type="button" key={member.id} onClick={() => { setSelectedMemberId(member.id); setMemberSearch(member.full_name); }}>{member.full_name}</button>)}</div>}</div>}
                </StepCard>
                <StepCard number={isWalkIn ? "2" : "2"} title="Plan" hint={isWalkIn ? "A day pass is valid today until 11:59 PM." : "Choose the plan to add to this member."} complete={Boolean(activePlan)}>
                    <div className={styles.planList}>{Object.entries(plans).filter(([code]) => isWalkIn ? code === "session" : code !== "session").map(([code, plan]) => <PlanCard key={code} plan={plan} selected={selectedPlan === code || (isWalkIn && code === "session")} student={isStudent} onSelect={() => setSelectedPlan(code)} />)}</div><label>Promo code optional<input className={styles.input} value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder="Enter code" /></label>
                </StepCard>
                {!isWalkIn && <StepCard number="3" title="Coach" hint="Optional coaching add-on." complete><p className={styles.muted}>No coach selected. You can continue without an add-on.</p></StepCard>}
            </div>

            <aside className={styles.summaryCard}>
                <div className={styles.cardHeading}><div><span className={styles.eyebrow}>CHECKOUT</span><h2>Summary &amp; Payment</h2></div><span className={styles.neutralBadge}>{paymentMethod === "cash" ? "Cash" : "QR Ph"}</span></div>
                <div className={styles.summaryLines}><div><span>{activePlan?.name || "No plan selected"}</span><strong>{activePlan ? money(currentPrice) : "—"}</strong></div>{promoCode && <div><span>Promo discount</span><strong>Applied at checkout</strong></div>}</div>
                <div className={styles.totalLine}><span>Total payable</span><strong>{money(currentPrice)}</strong></div>
                <p className={styles.infoLine}><i className="fa-regular fa-calendar"></i>{isWalkIn ? "Valid today until 11:59 PM" : "Starts today or after the current plan ends"}</p>
                <div className={styles.paymentMethods}><button type="button" className={paymentMethod === "cash" ? styles.methodActive : ""} onClick={() => setPaymentMethod("cash")}><i className="fa-solid fa-money-bill"></i> Cash</button><button type="button" className={paymentMethod === "qrph" ? styles.methodActive : ""} onClick={() => setPaymentMethod("qrph")}><i className="fa-solid fa-qrcode"></i> QR Ph</button></div>
                {paymentMethod === "cash" && <div className={styles.cashGrid}><label>Cash tendered<input className={styles.input} value={cashTendered} onChange={(event) => setCashTendered(event.target.value)} type="number" min="0" placeholder="₱ 0.00" /></label><div><span>Change</span><strong className={change >= 0 && Number(cashTendered) >= currentPrice ? styles.change : styles.changeMuted}>{money(change)}</strong></div></div>}
                {paymentMethod === "cash" && <div className={styles.quickAmounts}>{[currentPrice, 500, 1000].filter((amount, index, list) => amount > 0 && list.indexOf(amount) === index).map((amount) => <button type="button" key={amount} onClick={() => setCashTendered(String(amount))}>{money(amount)}</button>)}</div>}
                <label className={styles.receiptCheck}><input type="checkbox" checked={sendReceipt} onChange={(event) => setSendReceipt(event.target.checked)} /> Send receipt {isWalkIn ? guestEmail || "when an email is provided" : selectedMember?.email || "to member email"}</label>
                {validationMessage && <InlineError error={validationMessage} />}
                <button className={styles.submitButton} type="submit" disabled={saving}>{saving ? "Processing..." : paymentMethod === "qrph" ? "Generate QR Ph" : isWalkIn ? "Record walk-in" : "Record payment"}</button>
            </aside>
        </form>

        <section className={styles.transactionsCard}>
            <div className={styles.transactionsHeader}><div><span className={styles.eyebrow}>PAYMENTS</span><h2>Transactions</h2></div><span className={styles.resultCount}>{transactions.length} shown</span></div>
            <div className={styles.toolbar}><div className={styles.searchWrap}><i className="fa-solid fa-magnifying-glass"></i><input className={styles.input} value={transactionSearch} onChange={(event) => { setPage(1); setTransactionSearch(event.target.value); }} placeholder="Search name, phone, email or receipt" /></div>{["today", "yesterday", "last-7", "this-month"].map((preset) => <button type="button" key={preset} className={datePreset === preset ? styles.filterActive : styles.filterButton} onClick={() => { setPage(1); setDatePreset(preset); }}>{preset === "last-7" ? "Last 7 days" : preset === "this-month" ? "This month" : preset[0].toUpperCase() + preset.slice(1)}</button>)}<select className={styles.select} value={transactionMethod} onChange={(event) => { setPage(1); setTransactionMethod(event.target.value); }}><option value="">All methods</option><option value="cash">Cash</option><option value="qrph">QR Ph</option></select><select className={styles.select} value={transactionStatus} onChange={(event) => { setPage(1); setTransactionStatus(event.target.value); }}><option value="">All status</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select><select className={styles.select} value={transactionType} onChange={(event) => { setPage(1); setTransactionType(event.target.value); }}><option value="">All types</option><option value="member">Member</option><option value="walkin">Walk-in</option></select></div>
            <div className={styles.tableWrap}><table><thead><tr><th>TIME</th><th>CUSTOMER</th><th>PLAN</th><th>AMOUNT</th><th>METHOD</th><th>STATUS</th><th>RECEIPT NO.</th><th>ACTIONS</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id} className={selectedTransactionId === transaction.id ? styles.rowSelected : ""} onClick={() => setSelectedTransactionId(transaction.id)}><td>{new Date(transaction.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" })}</td><td><span className={styles.customer}><span className={styles.avatar}>{initials(transaction.display_name)}</span><span><strong>{transaction.display_name}</strong><small>{transaction.customer_code ? `Walk-in WI-${transaction.customer_code}` : "Member"}</small></span></span></td><td>{transaction.plan_name}</td><td className={styles.amount}>{money(transaction.amount)}</td><td><span className={styles.methodBadge}>{transaction.method === "qrph" ? "QR Ph" : transaction.method}</span></td><td><span className={`${styles.statusBadge} ${transaction.status === "paid" ? styles.statusPaid : styles.statusPending}`}>{transaction.status}</span></td><td>{transaction.receipt_number || "—"}</td><td><div className={styles.rowActions}><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedTransactionId(transaction.id); }}>View receipt</button>{transaction.status === "paid" && <button type="button" onClick={async (event) => { event.stopPropagation(); try { await api(`/clerk/payments/${transaction.id}/resend-receipt`, { method: "POST" }); toast.success("Receipt email queued."); } catch (err) { toast.error(err.message); } }}>Resend</button>}{transaction.status === "pending" && <button type="button" onClick={async (event) => { event.stopPropagation(); try { await api(`/clerk/payments/${transaction.id}/cancel`, { method: "POST" }); toast.success("Pending QR cancelled."); await loadPayments(); } catch (err) { toast.error(err.message); } }}>Cancel QR</button>}</div></td></tr>)}</tbody></table>{!transactions.length && <div className={styles.emptyState}>No transactions match these filters.</div>}</div>
            <div className={styles.pagination}><span>{transactions.length ? `Page ${page}` : "No results"}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" disabled={transactions.length < 10} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
        </section>

        <aside className={styles.receiptDrawer} aria-live="polite">{selectedTransaction ? <><div className={styles.cardHeading}><div><span className={styles.eyebrow}>RECEIPT PREVIEW</span><h2>{selectedTransaction.receipt_number || "Pending payment"}</h2></div><button type="button" className={styles.textButton} onClick={() => setSelectedTransactionId("")}>Close</button></div><p className={styles.muted}>{selectedTransaction.display_name} · {selectedTransaction.plan_name}</p><div className={styles.receiptTotal}>{money(selectedTransaction.amount)}</div><span className={`${styles.statusBadge} ${selectedTransaction.status === "paid" ? styles.statusPaid : styles.statusPending}`}>{selectedTransaction.status}</span></> : <><i className="fa-regular fa-file-lines"></i><p>Select a transaction to preview its receipt.</p></>}</aside>
        {reviewOpen && <ClerkModal title="Review & confirm" icon="fa-clipboard-check" onClose={() => setReviewOpen(false)} labelledBy="walkin-review-title"><div className={styles.reviewDetails}><div><span>Customer</span><strong>{normalizeName(memberSearch)}</strong></div><div><span>Mobile</span><strong>{formatPhone(guestPhone)}</strong></div><div><span>Email</span><strong>{guestEmail || "No email - no receipt will be sent"}</strong></div><div><span>Student rate</span><strong>{isStudent ? "Yes" : "No"}</strong></div><div><span>Day pass</span><strong>{activePlan?.name || "Day pass"}</strong></div><div><span>Total</span><strong>{money(currentPrice)}</strong></div><div><span>Payment method</span><strong>{paymentMethod === "cash" ? "Cash" : "QR Ph"}</strong></div>{paymentMethod === "cash" && <div><span>Cash tendered / change</span><strong>{money(cashTendered)} / {money(change)}</strong></div>}</div><div className={styles.reviewActions}><button type="button" className={styles.textButton} onClick={() => setReviewOpen(false)}>Edit details</button><button type="button" className={styles.primaryButton} onClick={confirmWalkIn} disabled={saving}>{saving ? "Processing..." : "Confirm"}</button></div></ClerkModal>}
        {validationMessage && !canSubmit && <ClerkModal title="Required information" icon="fa-circle-exclamation" onClose={() => setValidationMessage("")} labelledBy="payment-validation-title"><p>{validationMessage}</p><button type="button" className={styles.primaryButton} onClick={() => setValidationMessage("")}>Return to payment</button></ClerkModal>}
    </ClerkLayout>;
}

function Stat({ label, value, tone = "" }) {
    return <div className={`${styles.stat} ${tone ? styles[`stat${tone[0].toUpperCase()}${tone.slice(1)}`] : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}
