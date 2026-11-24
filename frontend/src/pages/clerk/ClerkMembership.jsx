/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ClerkModal from "../../components/clerk/ClerkModal";
import QrPaymentPanel from "../../components/clerk/payments/QrPaymentPanel";
import { api, getFriendlyError } from "../../lib/api";
import { normalizeQrPayment } from "../../lib/qrPayment";
import { dateValue } from "../../lib/dates";
import { useToast } from "../../components/ui/toast/useToast";
import InlineError from "../../components/ui/InlineError";
import { Skeleton, SkeletonMembership } from "../../components/ui/Skeleton";
import styles from "./ClerkMembership.module.css";

const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
const formatDate = (value) => value ? dateFormatter.format(new Date(`${value}T00:00:00+08:00`)) : "—";
const isoDate = (value) => value ? new Date(`${value}T00:00:00+08:00`).toISOString() : "";
const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
const statusNames = ["", "active", "expiring", "expired", "upcoming", "no-membership", "suspended"];
const statusLabels = { "": "All", active: "Active", expiring: "Expiring", expired: "Expired", upcoming: "Upcoming", "no-membership": "No plan", suspended: "Suspended" };
const genericCoachNote = "External coach contact; communicate through the provided external platform";
const coachAmount = (coach) => Number(coach?.addon_amount ?? coach?.monthly_price ?? coach?.price ?? 0);

function relativeExpiry(value) {
    if (!value) return "No expiry";
    const target = new Date(`${value}T00:00:00+08:00`);
    const days = Math.round((target - new Date(`${dateValue()}T00:00:00+08:00`)) / 86400000);
    if (days < 0) return `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
    if (days === 0) return "expires today";
    return `in ${days} day${days === 1 ? "" : "s"}`;
}

function MemberAvatar({ name }) {
    return <span className={styles.memberAvatar} aria-hidden="true">{initials(name)}</span>;
}

function StatusBadge({ status }) {
    const tone = status === "Expired" ? styles.statusDanger : status === "Expiring" ? styles.statusWarning : status === "Active" ? styles.statusSuccess : styles.statusMuted;
    return <span className={`${styles.statusBadge} ${tone}`}>{status}</span>;
}

function StepCard({ number, title, hint, complete, children, className = "" }) {
    return <section className={`${styles.stepCard} ${className}`}>
        <div className={styles.stepHeader}><span className={styles.stepNumber}>{number}</span><div><h3>{title}</h3><p>{hint}</p></div>{complete && <i className={`fa-solid fa-circle-check ${styles.stepComplete}`} aria-label="Complete"></i>}</div>
        {children}
    </section>;
}

function PlanCard({ plan, selected, student, onSelect, disabled }) {
    const price = student && plan.student_price != null ? plan.student_price : plan.price;
    const perDay = Number(price) && plan.duration_days ? `about ${money(Number(price) / Number(plan.duration_days))} per day` : "Gym access plan";
    return <label className={`${styles.planCard} ${selected ? styles.cardSelected : ""} ${disabled ? styles.cardDisabled : ""}`}>
        <input type="radio" name="renewal-plan" checked={selected} onChange={() => onSelect(plan.code)} disabled={disabled} />
        <span className={styles.radioIndicator}>{selected && <i className="fa-solid fa-check"></i>}</span>
        <span className={styles.cardTopline}><strong>{plan.name}</strong><span>{plan.duration_days} days</span></span>
        <strong className={styles.cardPrice}>{money(price)}</strong>
        {student && plan.student_price != null ? <span className={styles.ratePill}>Student rate</span> : plan.student_price != null && <span className={styles.ratePill}>Student {money(plan.student_price)}</span>}
        <small>{perDay}</small>
    </label>;
}

function CoachCard({ coach, selected, onSelect, disabled }) {
    const amount = coachAmount(coach);
    const note = coach?.notes || coach?.bio;
    return <label className={`${styles.coachCard} ${selected ? styles.cardSelected : ""} ${disabled ? styles.cardDisabled : ""}`}>
        <input type="radio" name="renewal-coach" checked={selected} onChange={() => onSelect(coach?.id || "")} disabled={disabled} />
        <span className={styles.radioIndicator}>{selected && <i className="fa-solid fa-check"></i>}</span>
        <MemberAvatar name={coach?.display_name} />
        <strong>{coach?.display_name || "No coach"}</strong>
        <span className={styles.coachPrice}>{amount > 0 ? `+${money(amount)} add-on` : "No extra fee"}</span>
        {!amount && coach?.id && <small className={styles.mutedHint}>Price not set</small>}
        {note && note !== genericCoachNote && <small className={styles.coachNote}>{note}</small>}
        {coach?.external_contact_url && <a className={styles.contactLink} href={coach.external_contact_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} aria-label={`Contact ${coach.display_name}`}><i className="fa-solid fa-arrow-up-right-from-square"></i></a>}
    </label>;
}

function MemberCard({ member, onChange, disabled }) {
    const status = member.status_label || "No plan";
    return <div className={styles.selectedMemberCard}>
        <MemberAvatar name={member.full_name} />
        <div className={styles.memberCardDetails}><strong>{member.full_name}</strong><span>{member.member_code || "No member code"} · {member.email || "No email"}</span><span>{member.membership?.membership_plans?.name || "No current plan"} · {formatDate(member.membership?.end_date)} ({relativeExpiry(member.membership?.end_date)})</span></div>
        <StatusBadge status={status} />
        {member.is_student && <span className={styles.studentTag}>Student</span>}
        {!disabled && <button type="button" className={styles.changeButton} onClick={onChange}>Change</button>}
    </div>;
}

function MemberPicker({ member, search, results, quickPicks, searching, disabled, missing, onSearch, onSelect, onChange }) {
    const [open, setOpen] = useState(false);
    if (member) return <MemberCard member={member} onChange={onChange} disabled={disabled} />;
    return <div className={styles.memberPicker}>
        <div className={`${styles.inputGroup} ${missing ? styles.inputError : ""}`}><i className={`fa-solid fa-magnifying-glass ${styles.searchIconAligned}`}></i><input aria-label="Search member" className={styles.formInputGroup} value={search} disabled={disabled} placeholder="Search name, email, phone or member code" onChange={(event) => onSearch(event.target.value)} onFocus={() => setOpen(true)} /></div>
        {open && search && <div className={styles.memberResults}>{searching && <span className={styles.resultMessage}>Searching...</span>}{!searching && results.map((row) => <button type="button" key={row.id} onClick={() => { onSelect(row); setOpen(false); }}><MemberAvatar name={row.full_name} /><span><strong>{row.full_name}</strong><small>{row.member_code || row.email} · {row.status_label}</small></span></button>)}{!searching && !results.length && <span className={styles.resultMessage}>No members found.</span>}</div>}
        {!search && quickPicks.length > 0 && <div className={styles.quickPicks}><span>Needs renewal</span>{quickPicks.slice(0, 5).map((row) => <button type="button" key={row.id} onClick={() => onSelect(row)}><MemberAvatar name={row.full_name} /><span><strong>{row.full_name}</strong><small>{relativeExpiry(row.membership?.end_date)}</small></span></button>)}</div>}
        {missing && <small className={styles.fieldError}>Select a member.</small>}
    </div>;
}

function RenewalSummary({ member, plan, coach, quote, quoteLoading, rule, disabled, method, onMethod, cashTendered, onCashTendered, total, change, shortBy, onSubmit, saving, onCancel, onSimulate, onGenerate, payment, clock, qrphEnabled, conflict, onResume, onCancelConflict }) {
    const quickAmounts = [500, 1000, 2000].filter((amount) => amount >= total);
    if (payment) return <div className={`${styles.summaryCard} ${styles.paymentWaiting}`}><div className={styles.summaryHeader}><h3>Payment waiting</h3><span className={styles.lockNote}><i className="fa-solid fa-lock"></i> Selectors locked</span></div><QrPaymentPanel payment={payment} countdown={Math.max(0, Math.floor((new Date(payment.qr_expires_at).getTime() - clock) / 1000))} simulationEnabled={payment.simulation_enabled} onCancel={onCancel} onGenerate={onGenerate} onSimulate={onSimulate} /></div>;
    return <aside className={styles.summaryCard}>
        <div className={styles.summaryHeader}><div><h3>Summary & Payment</h3><p>Review the amount before confirming.</p></div><i className="fa-solid fa-receipt"></i></div>
        <div className={styles.summaryMember}>{member ? <><MemberAvatar name={member.full_name} /><span><strong>{member.full_name}</strong><small>{member.status_label || "No plan"}</small></span></> : <span className={styles.placeholder}><i className="fa-regular fa-user"></i> No member selected</span>}</div>
        <div className={styles.breakdown}><div><span>Plan</span><strong>{plan?.name || "—"} {quoteLoading && <i className="fa-solid fa-spinner fa-spin"></i>}</strong></div><div><span>Coach add-on</span><strong>{coach ? money(quote?.coachAddonAmount) : "—"}</strong></div><div><span>Student discount</span><strong>{quote?.discount ? `-${money(quote.discount)}` : "—"}</strong></div><div className={styles.totalLine}><span>Total</span><strong>{money(total)}</strong></div></div>
        <div className={styles.ruleBox}><i className="fa-solid fa-circle-info"></i><span>{rule}</span><button type="button" title="Renewals start today when there is no active plan, or after the current plan ends."><i className="fa-regular fa-circle-question"></i><span className="visually-hidden">How renewals work</span></button></div>
        <div className={styles.paymentMethods}><label className={method === "cash" ? styles.methodSelected : ""}><input type="radio" name="payment-method" checked={method === "cash"} onChange={() => onMethod("cash")} disabled={disabled} /><i className="fa-solid fa-money-bill-wave"></i> Cash</label><label className={`${method === "qrph" ? styles.methodSelected : ""} ${!qrphEnabled ? styles.methodUnavailable : ""}`} title={!qrphEnabled ? "QR Ph is turned off in Settings" : undefined}><input type="radio" name="payment-method" checked={method === "qrph"} onChange={() => onMethod("qrph")} disabled={disabled || !qrphEnabled} /><i className="fa-solid fa-qrcode"></i> QR Ph</label></div>
        {!qrphEnabled && <small className={styles.paymentMethodError}>QR Ph is turned off in Settings.</small>}
        {method === "cash" && <div className={styles.cashBox}><label className={styles.formLabel}>Cash tendered</label><div className={styles.currencyInput}><span>₱</span><input type="number" min="0" step="0.01" value={cashTendered} onChange={(event) => onCashTendered(event.target.value)} placeholder="0.00" /></div><div className={styles.quickAmounts}><button type="button" onClick={() => onCashTendered(String(total))}>Exact</button>{quickAmounts.map((amount) => <button type="button" key={amount} onClick={() => onCashTendered(String(amount))}>₱{amount.toLocaleString()}</button>)}</div>{shortBy > 0 ? <div className={styles.shortBy}>Short by {money(shortBy)}</div> : <div className={styles.changeBox}>Change <strong>{money(change)}</strong></div>}</div>}
        {conflict ? <div className={styles.pendingConflict}><strong>Previous QR payment found</strong><span>Resume the previous QR or cancel it before starting this renewal.</span><button type="button" className={styles.actionButton} onClick={onResume}>Resume previous QR</button><button type="button" className={styles.secondaryActionButton} onClick={onCancelConflict}>Cancel it and start a new one</button></div> : <button type="button" className={styles.actionButton} onClick={onSubmit} disabled={saving}>{saving ? "Processing..." : method === "qrph" ? "Generate QR Ph" : "Process renewal"} <i className="fa-solid fa-arrow-right"></i></button>}
    </aside>;
}

function MembershipRow({ row, onRenew, onRemind, highlighted, locked, reminding }) {
    const status = row.status_label || "No plan";
    const noEmail = !row.email;
    const noActivePlan = !["Active", "Expiring"].includes(status);
    const reminderDisabled = noEmail || noActivePlan;
    const reason = noEmail ? "No email on file" : "No active plan to remind about";
    return <tr className={highlighted ? styles.rowHighlighted : ""}><td><div className={styles.memberCell}><MemberAvatar name={row.full_name} /><div><strong title={row.full_name}>{row.full_name}</strong><small title={row.email || "No email"}>{row.email || "No email"}</small></div></div></td><td><strong>{row.membership?.membership_plans?.name || "No plan"}</strong>{row.membership?.queued && <small className={styles.nextPlan}>Next: {row.membership.membership_plans?.name} from {formatDate(row.membership.start_date)}</small>}</td><td>{row.membership?.coaches?.display_name ? <span className={styles.coachChip}>{row.membership.coaches.display_name}</span> : <span className="text-secondary">No coach</span>}</td><td><span className={row.status_label === "Expired" ? styles.expiryDanger : row.status_label === "Expiring" ? styles.expiryWarning : ""} title={isoDate(row.membership?.end_date)}>{formatDate(row.membership?.end_date)}</span><small className={styles.relativeExpiry}>{relativeExpiry(row.membership?.end_date)}</small></td><td><StatusBadge status={status} /></td><td><div className={styles.rowActions}><button type="button" className={styles.renewButton} disabled={locked} onClick={() => onRenew(row)}><i className="fa-solid fa-rotate"></i> Renew</button><button type="button" className={styles.remindButton} disabled={reminderDisabled || reminding} title={reminderDisabled ? reason : "Send expiry reminder"} onClick={() => onRemind(row)}><i className="fa-regular fa-bell"></i> {reminding ? "Sending..." : "Remind"}</button></div></td></tr>;
}

function MembershipCard({ row, onRenew, onRemind, locked, reminding }) {
    const status = row.status_label || "No plan";
    return <article className={styles.mobileMemberCard}><div className={styles.memberCell}><MemberAvatar name={row.full_name} /><div><strong>{row.full_name}</strong><small>{row.email || "No email"}</small></div><StatusBadge status={status} /></div><div className={styles.mobileDetails}><span>Plan <strong>{row.membership?.membership_plans?.name || "No plan"}</strong></span><span>Expiry <strong>{formatDate(row.membership?.end_date)}</strong><small>{relativeExpiry(row.membership?.end_date)}</small></span><span>Coach <strong>{row.membership?.coaches?.display_name || "No coach"}</strong></span></div><div className={styles.rowActions}><button type="button" className={styles.renewButton} disabled={locked} onClick={() => onRenew(row)}><i className="fa-solid fa-rotate"></i> Renew</button><button type="button" className={styles.remindButton} disabled={!row.email || reminding} onClick={() => onRemind(row)}><i className="fa-regular fa-bell"></i> {reminding ? "Sending..." : "Remind"}</button></div></article>;
}

export default function ClerkMembership() {
    const [params] = useSearchParams();
    const renewalRef = useRef(null);
    const planRef = useRef(null);
    const [plans, setPlans] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [paymentModes, setPaymentModes] = useState(null);
    const [tableRows, setTableRows] = useState([]);
    const [quickPicks, setQuickPicks] = useState([]);
    const [counts, setCounts] = useState({});
    const [totalMembers, setTotalMembers] = useState(0);
    const [member, setMember] = useState(null);
    const [memberSearch, setMemberSearch] = useState("");
    const [memberResults, setMemberResults] = useState([]);
    const [isStudent, setIsStudent] = useState(false);
    const [planCode, setPlanCode] = useState("");
    const [coachId, setCoachId] = useState("");
    const [method, setMethod] = useState("cash");
    const [cashTendered, setCashTendered] = useState("");
    const [quote, setQuote] = useState(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [payment, setPayment] = useState(null);
    const [pendingConflict, setPendingConflict] = useState(null);
    const [clock, setClock] = useState(() => Date.now());
    const globalToast = useToast();
    const [modal, setModal] = useState(false);
    const [missing, setMissing] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searching, setSearching] = useState(false);
    const [remindingId, setRemindingId] = useState("");
    const [error, setError] = useState("");
    const [tableError, setTableError] = useState("");
    const [tableFilters, setTableFilters] = useState({ search: "", status: "", plan: "", sort: "status", order: "asc", page: 1, limit: 10 });
    const [highlightedId, setHighlightedId] = useState("");
    const showToast = useCallback((next) => globalToast[next.type](next.error ? getFriendlyError(next.error) : next.message), [globalToast]);

    const loadTable = async (filters = tableFilters) => {
        const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
        const result = await api(`/clerk/members?${query}`);
        setTableRows(result.rows || []);
        setCounts(result.counts || {});
        setTotalMembers(Number(result.total || 0));
        setTableError("");
    };
    const loadQuickPicks = async () => {
        const [expired, expiring] = await Promise.all([
            api("/clerk/members?status=expired&page=1&limit=5"),
            api("/clerk/members?status=expiring&page=1&limit=5"),
        ]);
        const merged = [...(expired.rows || []), ...(expiring.rows || [])];
        setQuickPicks(merged.filter((row, index, rows) => rows.findIndex((item) => item.id === row.id) === index).slice(0, 5));
    };
    useEffect(() => {
        Promise.all([api("/clerk/plans"), api("/clerk/coaches"), api("/clerk/settings"), loadTable({ ...tableFilters, page: 1 }), loadQuickPicks()])
            .then(([planRows, coachRows, settings]) => {
                setPlans(planRows.filter((plan) => plan.code !== "session"));
                setCoaches(coachRows);
                setPaymentModes(Array.isArray(settings.payment_modes) ? settings.payment_modes : []);
                const initialMemberId = params.get("member");
                if (initialMemberId) api(`/clerk/members?search=${encodeURIComponent(initialMemberId)}&page=1&limit=8`).then((result) => {
                    const selected = (result.rows || []).find((row) => row.id === initialMemberId);
                    if (selected) { setMember(selected); setIsStudent(Boolean(selected.is_student)); setMemberSearch(selected.full_name); }
                }).catch(() => {});
            })
            .catch((err) => { setTableError(err.message); setError(err.message); })
            .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (!memberSearch.trim() || member?.full_name === memberSearch) return undefined;
        const timer = setTimeout(() => {
            setSearching(true);
            api(`/clerk/members?search=${encodeURIComponent(memberSearch.trim())}&page=1&limit=8`)
                .then((result) => setMemberResults(result.rows || []))
                .catch((err) => showToast({ type: "error", message: err.message }))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [memberSearch, member?.full_name, showToast]);
    useEffect(() => {
        if (!planCode) { setQuote(null); setQuoteLoading(false); return undefined; }
        let current = true;
        setQuoteLoading(true);
        const timer = setTimeout(() => api("/clerk/payments/quote", { method: "POST", body: { plan_code: planCode, is_student: isStudent, coach_id: coachId || null } })
            .then((result) => { if (current) setQuote(result); }).catch((err) => { if (current) showToast({ type: "error", message: err.message }); }).finally(() => { if (current) setQuoteLoading(false); }), 300);
        return () => { current = false; clearTimeout(timer); };
    }, [planCode, coachId, isStudent, showToast]);
    useEffect(() => {
        if (!payment?.payment_id) return undefined;
        const clockTimer = setInterval(() => setClock(Date.now()), 1000);
        const timer = setInterval(() => api(`/clerk/payments/${payment.payment_id}/status`).then((result) => {
            if (result.status === "paid") {
                const renewedId = member?.id;
                setPayment(null); showToast({ type: "success", message: `Renewal paid. Receipt ${result.receipt_number || ""}`.trim() });
                setPlanCode(""); setCoachId(""); setCashTendered(""); setQuote(null); setMember(null); setMemberSearch("");
                loadTable(); loadQuickPicks(); setHighlightedId(renewedId || ""); window.setTimeout(() => setHighlightedId(""), 3000);
            } else if (result.error_message) {
                setPayment((current) => ({ ...current, status: result.status }));
                showToast({ type: "error", message: result.error_message });
            } else if (result.status && result.status !== "pending") setPayment((current) => ({ ...current, status: result.status }));
        }).catch((err) => showToast({ type: "error", message: err.message })), 2500);
        return () => { clearInterval(timer); clearInterval(clockTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payment?.payment_id]);
    const filteredPlans = useMemo(() => plans.filter((plan) => plan.account_eligible !== false), [plans]);
    const selectedPlan = filteredPlans.find((plan) => plan.code === planCode);
    const selectedCoach = coaches.find((coach) => coach.id === coachId);
    const qrphEnabled = paymentModes?.includes("qrph") === true;
    const total = Number(quote?.total || 0);
    const change = Math.max(0, Number(cashTendered || 0) - total);
    const shortBy = Math.max(0, total - Number(cashTendered || 0));
    const currentStatus = member?.membership?.derived_status || member?.membership?.status_label || "No plan";
    const rule = member?.membership?.end_date && ["Active", "Expiring"].includes(currentStatus) ? `Starts after the current plan ends on ${formatDate(member.membership.end_date)}` : "Starts today";
    const chooseMember = (value) => { setPendingConflict(null); setMember(value); setIsStudent(Boolean(value.is_student)); setMemberSearch(value.full_name); setMemberResults([]); setMissing((current) => ({ ...current, member: false })); };
    const choosePlan = (code) => { setPendingConflict(null); setPlanCode(code); setMissing((current) => ({ ...current, plan: false })); window.setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); };
    const chooseFromTable = (row) => { if (payment) return; chooseMember(row); renewalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); window.setTimeout(() => planRef.current?.focus(), 350); };
    const resetWorkspace = () => { setPlanCode(""); setCoachId(""); setCashTendered(""); setQuote(null); setMember(null); setIsStudent(false); setMemberSearch(""); setMissing({}); };
    const validation = () => {
        const next = { member: !member, plan: !planCode, cash: method === "cash" && (!cashTendered || shortBy > 0) };
        setMissing(next);
        if (Object.values(next).some(Boolean)) { setModal(true); return false; }
        return true;
    };
    const submit = async () => {
        if (payment) return;
        if (method === "qrph" && !qrphEnabled) {
            showToast({ type: "error", message: "QR Ph is turned off in Settings." });
            return;
        }
        if (!validation()) return;
        setSaving(true);
        try {
            const result = await api("/clerk/memberships", { method: "POST", body: { member_id: member.id, plan_code: planCode, coach_id: coachId || null, is_student: isStudent, payment_method: method, cash_tendered: method === "cash" ? Number(cashTendered) : null } });
            if (method === "qrph") {
                try {
                    setPayment({ ...normalizeQrPayment(result), qrClassName: styles.qrImage });
                    setPendingConflict(null);
                } catch {
                    if (result?.payment_id) await api(`/clerk/payments/${result.payment_id}/cancel`, { method: "POST" }).catch(() => {});
                    showToast({ type: "error", message: "Could not create the QR. Try again." });
                }
            }
            else {
                const renewedId = member.id;
                showToast({ type: "success", message: `Cash renewal recorded for ${member.full_name}.` });
                resetWorkspace(); await loadTable(); await loadQuickPicks(); setHighlightedId(renewedId); window.setTimeout(() => setHighlightedId(""), 3000);
            }
        } catch (err) {
            if (err.status === 409 && err.payment) setPendingConflict(err.payment);
            else showToast({ type: "error", message: err.message });
        } finally { setSaving(false); }
    };
    const resumePendingPayment = async () => {
        try {
            const result = await api(`/clerk/payments/${pendingConflict.payment_id}/qr`);
            setPayment({ ...normalizeQrPayment({ ...result, qr_image_url: result.qr_image_url || result.image_url }), qrClassName: styles.qrImage });
            setPendingConflict(null);
        } catch (err) { showToast({ type: "error", message: err.message }); }
    };
    const cancelPendingConflict = async () => {
        try {
            await api(`/clerk/payments/${pendingConflict.payment_id}/cancel`, { method: "POST" });
            setPendingConflict(null);
            showToast({ type: "success", message: "Previous QR payment cancelled." });
        } catch (err) { showToast({ type: "error", message: err.message }); }
    };
    const cancelPayment = async () => {
        if (!payment?.payment_id) return;
        try { await api(`/clerk/payments/${payment.payment_id}/cancel`, { method: "POST" }); setPayment(null); showToast({ type: "success", message: "QR payment cancelled." }); }
        catch (err) { showToast({ type: "error", message: err.message }); }
    };
    const sendReminder = async (row) => {
        if (remindingId) return;
        setRemindingId(row.id);
        try { await api(`/clerk/members/${row.id}/expiry-reminder`, { method: "POST", body: { membership_id: row.membership?.id } }); showToast({ type: "success", message: `Expiry reminder sent to ${row.full_name}.` }); }
        catch (err) { showToast({ type: "error", message: err.message }); }
        finally { setRemindingId(""); }
    };
    const updateFilters = (next) => { setTableFilters(next); window.clearTimeout(updateFilters.timer); updateFilters.timer = window.setTimeout(() => loadTable(next).catch((err) => setTableError(err.message)), next.search !== tableFilters.search ? 300 : 0); };
    const tablePages = Math.max(1, Math.ceil(totalMembers / tableFilters.limit));
    const tableStart = totalMembers ? ((tableFilters.page - 1) * tableFilters.limit) + 1 : 0;
    const tableEnd = Math.min(totalMembers, tableFilters.page * tableFilters.limit);

    if (loading) return <><header className={styles.pageHeader}><h1 className={styles.pageTitle}>Membership</h1><p className={styles.pageDesc}>Manage member plans and counter renewals</p><p className={styles.pageSummary}><Skeleton w={52} h={12} className="fm-skel-inline" /> members · <Skeleton w={32} h={12} className="fm-skel-inline" /> active · <Skeleton w={36} h={12} className="fm-skel-inline" /> expiring · <Skeleton w={32} h={12} className="fm-skel-inline" /> expired</p></header><SkeletonMembership styles={styles} /></>;
    return <>
        {error && <InlineError error={error} />}
        <header className={styles.pageHeader}><h1 className={styles.pageTitle}>Membership</h1><p className={styles.pageDesc}>Manage member plans and counter renewals</p><p className={styles.pageSummary}>{totalMembers} members · {counts.active || 0} active · {counts.expiring || 0} expiring · {counts.expired || 0} expired</p></header>
        <div className={`${styles.workspace} ${payment ? styles.workspaceLocked : ""}`} ref={renewalRef}>
            <div className={styles.selectorColumn}>
                <StepCard number="1" title="Member" hint="Search or choose a member who needs renewal." complete={Boolean(member)}>
                    <MemberPicker member={member} search={memberSearch} results={memberResults} quickPicks={quickPicks} searching={searching} disabled={Boolean(payment)} missing={missing.member} onSearch={(value) => { setMemberSearch(value); setMember(null); setIsStudent(false); setMemberResults([]); }} onSelect={chooseMember} onChange={() => { setMember(null); setIsStudent(false); setMemberSearch(""); }} />
                </StepCard>
                <StepCard number="2" title="Plan" hint="Choose the membership duration and rate." complete={Boolean(planCode)} className={missing.plan ? styles.stepError : ""}>
                    <label className={styles.studentDiscountToggle}><input type="checkbox" checked={isStudent} onChange={(event) => setIsStudent(event.target.checked)} disabled={Boolean(payment) || !member} /><span><strong>Student discount</strong><small>Apply the student rate to this renewal.</small></span></label>
                    <div className={styles.planGrid} ref={planRef} tabIndex={-1}>{filteredPlans.map((plan) => <PlanCard key={plan.id} plan={plan} student={isStudent} selected={plan.code === planCode} onSelect={choosePlan} disabled={Boolean(payment)} />)}</div>
                    {missing.plan && <small className={styles.fieldError}>Select a plan.</small>}
                </StepCard>
                <StepCard number="3" title="Coach (optional)" hint="Add personal coaching or continue without one." complete={coachId !== ""}>
                    <div className={styles.coachGrid}><CoachCard selected={!coachId} onSelect={() => setCoachId("")} disabled={Boolean(payment)} />{coaches.map((coach) => <CoachCard key={coach.id} coach={coach} selected={coach.id === coachId} onSelect={setCoachId} disabled={Boolean(payment)} />)}</div>
                </StepCard>
            </div>
            <RenewalSummary member={member} plan={selectedPlan} coach={selectedCoach} quote={quote} quoteLoading={quoteLoading} rule={rule} disabled={Boolean(payment)} method={method} onMethod={setMethod} cashTendered={cashTendered} onCashTendered={setCashTendered} total={total} change={change} shortBy={shortBy} onSubmit={submit} saving={saving} onCancel={cancelPayment} onGenerate={() => setPayment(null)} onSimulate={() => api(`/clerk/payments/${payment?.payment_id}/simulate-paid`, { method: "POST" }).catch((err) => showToast({ type: "error", message: err.message }))} payment={payment} clock={clock} qrphEnabled={qrphEnabled} conflict={pendingConflict} onResume={resumePendingPayment} onCancelConflict={cancelPendingConflict} />
        </div>
        <section className={styles.tableSection}>
            <div className={styles.tableToolbar}><div className={styles.tableSearch}><i className={`fa-solid ${tableFilters.search ? "fa-spinner fa-spin" : "fa-magnifying-glass"}`}></i><input value={tableFilters.search} onChange={(event) => updateFilters({ ...tableFilters, search: event.target.value, page: 1 })} placeholder="Search members" aria-label="Search members" />{tableFilters.search && <button type="button" onClick={() => updateFilters({ ...tableFilters, search: "", page: 1 })} aria-label="Clear search">×</button>}</div><select className={styles.tableSelect} value={tableFilters.plan} onChange={(event) => updateFilters({ ...tableFilters, plan: event.target.value, page: 1 })}><option value="">All plans</option>{filteredPlans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}</option>)}</select><select className={styles.tableSelect} value={`${tableFilters.sort}:${tableFilters.order}`} onChange={(event) => { const [sort, order] = event.target.value.split(":"); updateFilters({ ...tableFilters, sort, order, page: 1 }); }}><option value="status:asc">Needs attention first</option><option value="name:asc">Name A-Z</option><option value="expiry:asc">Expiry soonest</option><option value="joined:desc">Newest joined</option></select></div>
            <div className={styles.statusTabs}>{statusNames.map((status) => <button type="button" className={`${tableFilters.status === status ? styles.statusActive : ""} ${!(counts[status || "all"] || 0) ? styles.statusDim : ""}`} key={status || "all"} onClick={() => updateFilters({ ...tableFilters, status, page: 1 })}>{statusLabels[status]} <b>{counts[status || "all"] || 0}</b></button>)}</div>
            {tableError ? <div className={styles.tableError}><span>Could not load members.</span><button type="button" onClick={() => loadTable().catch((err) => setTableError(err.message))}>Retry</button></div> : <><div className={styles.tableWrap}><table className={`table ${styles.customTable}`}><thead><tr><th>MEMBER</th><th>CURRENT PLAN</th><th>COACH</th><th>EXPIRY</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{tableRows.map((row) => <MembershipRow key={row.id} row={row} highlighted={row.id === highlightedId} onRenew={chooseFromTable} onRemind={sendReminder} />)}{!tableRows.length && <tr><td colSpan="6" className={styles.emptyState}>No members match. <button type="button" onClick={() => updateFilters({ ...tableFilters, search: "", status: "", plan: "", page: 1 })}>Clear filters</button></td></tr>}</tbody></table></div><div className={styles.mobileCards}>{tableRows.map((row) => <MembershipCard key={row.id} row={row} onRenew={chooseFromTable} onRemind={sendReminder} />)}</div></>}
            <footer className={styles.tableFooter}><span>Showing {tableStart}-{tableEnd} of {totalMembers} members</span><label>Rows<select value={tableFilters.limit} onChange={(event) => updateFilters({ ...tableFilters, limit: Number(event.target.value), page: 1 })}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label><div className={styles.pager}><button type="button" disabled={tableFilters.page <= 1} onClick={() => updateFilters({ ...tableFilters, page: tableFilters.page - 1 })}>Previous</button><span>{tableFilters.page} / {tablePages}</span><button type="button" disabled={tableFilters.page >= tablePages} onClick={() => updateFilters({ ...tableFilters, page: tableFilters.page + 1 })}>Next</button></div></footer>
        </section>
        {modal && <ClerkModal title="Please complete the required information" icon="fa-circle-exclamation" onClose={() => setModal(false)} labelledBy="renewal-validation-title"><p className="text-secondary">Complete the highlighted sections before continuing.</p>{missing.member && <button type="button" className={styles.missingRow} onClick={() => { setModal(false); renewalRef.current?.scrollIntoView({ behavior: "smooth" }); }}>Member</button>}{missing.plan && <button type="button" className={styles.missingRow} onClick={() => { setModal(false); planRef.current?.scrollIntoView({ behavior: "smooth" }); planRef.current?.focus(); }}>Plan</button>}{missing.cash && <button type="button" className={styles.missingRow} onClick={() => setModal(false)}>Tendered amount</button>}</ClerkModal>}
    </>;
}
