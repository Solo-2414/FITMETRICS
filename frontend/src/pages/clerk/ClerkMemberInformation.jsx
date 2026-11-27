import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ClerkModal from "../../components/clerk/ClerkModal";
import { api, getFriendlyError } from "../../lib/api";
import { useToast } from "../../components/ui/toast/useToast";
import InlineError from "../../components/ui/InlineError";
import { Skeleton, SkeletonRegion } from "../../components/ui/Skeleton";
import styles from "./ClerkMemberInformation.module.css";

const initialFilters = { search: "", status: "", plan: "", coach: "", student: "", joined_from: "", joined_to: "", sort: "name", order: "asc", page: 1, limit: 10 };
const statusNames = ["", "active", "expiring", "expired", "upcoming", "no-membership", "suspended"];
const statusLabels = { "": "All", active: "Active", expiring: "Expiring", expired: "Expired", upcoming: "Upcoming", "no-membership": "No plan", suspended: "Suspended" };
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
const getInitials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
const formatDate = (value) => value ? dateFormatter.format(new Date(`${value}T00:00:00+08:00`)) : "—";
const formatPhone = (value = "") => { const text = String(value || ""); const digits = text.replace(/\D/g, ""); return digits.length === 11 ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : text || "—"; };
const dateValue = (offset = 0) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const current = new Date(Date.UTC(Number(parts.find((part) => part.type === "year").value), Number(parts.find((part) => part.type === "month").value) - 1, Number(parts.find((part) => part.type === "day").value) + offset));
    return current.toISOString().slice(0, 10);
};
const queryFrom = (filters) => Object.entries(filters).filter(([, value]) => value !== "" && value !== null).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
const filtersFrom = (params) => ({ ...initialFilters, ...Object.fromEntries(params.entries()), page: Number(params.get("page") || 1), limit: Number(params.get("limit") || 10) });

function useMemberList(filters, setFilters, params, setParams) {
    const [result, setResult] = useState({ rows: [], total: 0, page: 1, limit: 10, counts: {} });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const requestRef = useRef(0);
    const hasRowsRef = useRef(false);
    const syncedQueryRef = useRef(params.toString());
    useEffect(() => {
        const timer = setTimeout(() => {
            const requestId = ++requestRef.current;
            const queryString = queryFrom(filters);
            syncedQueryRef.current = queryString;
            setParams(new URLSearchParams(queryString), { replace: true });
            setRefreshing(hasRowsRef.current);
            api(`/clerk/members?${queryString}`).then((nextResult) => {
                if (requestId === requestRef.current) { setResult(nextResult); hasRowsRef.current = nextResult.rows.length > 0; setError(""); }
            }).catch((err) => { if (requestId === requestRef.current) setError(err.message); })
                .finally(() => { if (requestId === requestRef.current) { setLoading(false); setRefreshing(false); } });
        }, filters.search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [filters, setParams]);
    useEffect(() => {
        const next = filtersFrom(params);
        if (params.toString() !== syncedQueryRef.current) {
            syncedQueryRef.current = params.toString();
            setFilters(next);
        }
    }, [params, setFilters]);
    return { result, loading, refreshing, error, retry: () => setFilters((current) => ({ ...current })) };
}

function FiltersPanel({ open, plans, coaches, filters, onChange, onReset, onClose }) {
    const panelRef = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const closeOnKey = (event) => { if (event.key === "Escape") onClose(); };
        const closeOutside = (event) => { if (!panelRef.current?.contains(event.target)) onClose(); };
        document.addEventListener("keydown", closeOnKey);
        document.addEventListener("mousedown", closeOutside);
        return () => { document.removeEventListener("keydown", closeOnKey); document.removeEventListener("mousedown", closeOutside); };
    }, [open, onClose]);
    if (!open) return null;
    const dateError = filters.joined_from && filters.joined_to && filters.joined_to < filters.joined_from;
    return <div className={styles.filterPanel} ref={panelRef} role="dialog" aria-label="Member filters">
        <div className={styles.filterPanelHeader}><strong>Filters</strong><button type="button" onClick={onClose} aria-label="Close filters">×</button></div>
        <label>Plan<select value={filters.plan} onChange={(event) => onChange("plan", event.target.value)}><option value="">All plans</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
        <label>Coach<select value={filters.coach} onChange={(event) => onChange("coach", event.target.value)}><option value="">All coaches</option>{coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.display_name}</option>)}</select></label>
        <label>Member type<select value={filters.student} onChange={(event) => onChange("student", event.target.value)}><option value="">All members</option><option value="true">Students</option><option value="false">Non-students</option></select></label>
        <fieldset><legend>Joined</legend><div className={styles.dateChips}>{[["", "Any time"], [dateValue(), "Today"], [dateValue(-6), "Last 7 days"], [dateValue(-29), "Last 30 days"], [dateValue(new Date().getDate() * -1 + 1), "This month"]].map(([value, label]) => <button type="button" key={label} className={filters.joined_from === value && !filters.joined_to ? styles.chipActive : ""} onClick={() => { onChange("joined_from", value); onChange("joined_to", value ? (label === "Today" ? value : dateValue()) : ""); }}>{label}</button>)}<button type="button" className={filters.joined_from && filters.joined_to ? styles.chipActive : ""} onClick={() => onChange("joined_from", filters.joined_from || dateValue(-29))}>Custom</button></div>
            {(filters.joined_from || filters.joined_to) && <div className={styles.dateFields}><label>From<input type="date" value={filters.joined_from} onChange={(event) => onChange("joined_from", event.target.value)} /></label><label>To<input type="date" min={filters.joined_from || undefined} value={filters.joined_to} onChange={(event) => onChange("joined_to", event.target.value)} /></label></div>}
            {dateError && <small className={styles.fieldError}>To cannot be earlier than From.</small>}
        </fieldset>
        <div className={styles.filterPanelActions}><button type="button" className={styles.secondaryButton} onClick={onReset}>Reset</button><button type="button" className={styles.primaryButton} onClick={onClose} disabled={Boolean(dateError)}>Apply</button></div>
    </div>;
}

function StatusTabs({ counts, active, onChange }) {
    return <div className={styles.statusTabs} role="tablist">{statusNames.filter((status) => !status || ["active", "expiring", "expired"].includes(status) || counts[status] > 0).map((status) => <button type="button" role="tab" aria-selected={active === status} className={active === status ? styles.statusTabActive : ""} key={status || "all"} onClick={() => onChange("status", status)}><span className={`${styles.statusDot} ${styles[`dot${status || "all"}`]}`}></span>{statusLabels[status]} <b>{counts[status || "all"] || 0}</b></button>)}</div>;
}

function ActiveChips({ filters, plans, coaches, onChange, onClear }) {
    const chips = [];
    if (filters.search) chips.push(["Search", filters.search, "search"]);
    if (filters.plan) chips.push(["Plan", plans.find((plan) => plan.id === filters.plan)?.name || filters.plan, "plan"]);
    if (filters.coach) chips.push(["Coach", coaches.find((coach) => coach.id === filters.coach)?.display_name || filters.coach, "coach"]);
    if (filters.student) chips.push(["", filters.student === "true" ? "Students" : "Non-students", "student"]);
    if (filters.joined_from || filters.joined_to) chips.push(["Joined", `${formatDate(filters.joined_from)} - ${formatDate(filters.joined_to)}`, "joined"]);
    return chips.length ? <div className={styles.activeChips}>{chips.map(([label, value, key]) => <button type="button" key={key} onClick={() => { if (key === "joined") { onChange("joined_from", ""); onChange("joined_to", ""); } else onChange(key, ""); }}>{label && `${label}: `}{value} ×</button>)}<button type="button" className={styles.clearLink} onClick={onClear}>Clear all</button></div> : null;
}

function StatusBadge({ status }) { return <span className={`${styles.statusBadge} ${styles[`badge${status.replace(/\s/g, "")}`] || ""}`}><span className={styles.statusDot}></span>{status}</span>; }
function Expiry({ value, status }) { if (!value) return <span className={styles.muted}>—</span>; const days = Math.round((new Date(`${value}T00:00:00+08:00`) - new Date(`${dateValue()}T00:00:00+08:00`)) / 86400000); const relative = days < 0 ? `expired ${Math.abs(days)} days ago` : days === 0 ? "today" : `in ${days} days`; return <span className={status === "Expired" ? styles.expiryExpired : status === "Expiring" ? styles.expirySoon : ""} title={value}>{formatDate(value)}<small>{relative}</small></span>; }
function MemberContent({ member, onSend, sending, onRenew }) {
    const name = member.full_name || "Unnamed member"; const plan = member.membership?.membership_plans?.name; const coach = member.membership?.coaches?.display_name;
    return <><div className={styles.memberCell}><span className={`${styles.avatar} ${styles[`avatar${name.charCodeAt(0) % 4}`]}`}>{getInitials(name)}</span><span><strong>{name}</strong><small className={!member.email ? styles.warningText : ""}>{member.email || "No email"}</small></span></div><div className={styles.contactCell}><span>{formatPhone(member.phone)}</span>{member.member_details?.member_code && <small>{member.member_details.member_code}</small>}</div><div><strong>{plan || <span className={styles.mutedPill}>No plan</span>}</strong>{coach ? <small className={styles.coach}><i className="fa-solid fa-user"></i>{coach}</small> : <small className={styles.muted}>No coach</small>}</div><div title={member.joined_date || ""}>{formatDate(member.joined_date)}</div><div><Expiry value={member.membership?.end_date} status={member.status_label} /></div><div><StatusBadge status={member.status_label} /></div><div className={styles.actions}><button type="button" title={member.email ? "Send info email" : "No email on file"} aria-label={member.email ? "Send info email" : "No email on file"} disabled={!member.email || sending === member.id} onClick={() => onSend(member)}><i className={`fa-solid ${sending === member.id ? "fa-spinner fa-spin" : "fa-envelope"}`}></i></button><button type="button" title="Renew membership" aria-label="Renew membership" onClick={() => onRenew(member)}><i className="fa-solid fa-arrows-rotate"></i></button></div></>;
}
function MembersTable({ rows, onSend, sending, onRenew }) { return <><div className={styles.desktopTable}><div className={styles.tableHeader}>{["Member", "Contact", "Plan & coach", "Joined", "Expiration", "Status", "Actions"].map((heading) => <span key={heading}>{heading}</span>)}</div>{rows.map((member) => <div className={styles.tableRow} key={member.id}><MemberContent member={member} onSend={onSend} sending={sending} onRenew={onRenew} /></div>)}</div><div className={styles.mobileCards}>{rows.map((member) => <article key={member.id}><div className={styles.cardTop}><MemberContent member={member} onSend={onSend} sending={sending} onRenew={onRenew} /></div></article>)}</div></>; }
function MembersLoading() {
    const rows = Array.from({ length: 4 }, (_, index) => index);
    const rowContent = (index) => <>
        <div className={styles.memberCell}>
            <Skeleton w={38} h={38} r={999} />
            <span><Skeleton w={index % 2 ? 104 : 132} h={12} /><Skeleton w={index % 2 ? 86 : 100} h={10} className="mt-1" /></span>
        </div>
        <div className={styles.contactCell}><Skeleton w="78%" h={11} /><Skeleton w="52%" h={10} className="mt-1" /></div>
        <div><Skeleton w="68%" h={11} /><Skeleton w="52%" h={10} className="mt-1" /></div>
        <div><Skeleton w={78} h={11} /></div>
        <div><Skeleton w={80} h={11} /><Skeleton w={54} h={10} className="mt-1" /></div>
        <div><Skeleton w={76} h={22} r={999} /></div>
        <div className={styles.actions}><Skeleton w={32} h={32} r={7} /><Skeleton w={32} h={32} r={7} /></div>
    </>;
    return <SkeletonRegion label="Loading members">
        <div className={styles.desktopTable}>
            <div className={styles.tableHeader}>{["Member", "Contact", "Plan & coach", "Joined", "Expiration", "Status", "Actions"].map((heading) => <span key={heading}>{heading}</span>)}</div>
            {rows.map((index) => <div className={styles.tableRow} key={index}>{rowContent(index)}</div>)}
        </div>
        <div className={styles.mobileCards}>
            {rows.slice(0, 3).map((index) => <article key={index}><div className={styles.cardTop}>{rowContent(index)}</div></article>)}
        </div>
    </SkeletonRegion>;
}
function Pagination({ result, filters, update }) { const pages = Math.ceil(result.total / result.limit); const visible = Array.from({ length: pages }, (_, index) => index + 1).filter((page) => page === 1 || page === pages || Math.abs(page - result.page) <= 1); let previous = 0; const items = visible.flatMap((page) => { const output = previous && page - previous > 1 ? ["…", page] : [page]; previous = page; return output; }); return <footer className={styles.footer}><span aria-live="polite">Showing {result.total ? (result.page - 1) * result.limit + 1 : 0}-{Math.min(result.page * result.limit, result.total)} of {result.total} members</span><div className={styles.footerControls}><label>Rows<select value={filters.limit} onChange={(event) => update("limit", Number(event.target.value))}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label><button type="button" disabled={result.page <= 1} onClick={() => update("page", result.page - 1)}>Previous</button>{items.map((item, index) => item === "…" ? <span key={`${item}-${index}`}>…</span> : <button type="button" className={item === result.page ? styles.currentPage : ""} key={item} onClick={() => update("page", item)}>{item}</button>)}<button type="button" disabled={result.page >= pages} onClick={() => update("page", result.page + 1)}>Next</button></div></footer>; }

export default function ClerkMemberInformation() {
    const navigate = useNavigate(); const [params, setParams] = useSearchParams(); const [filters, setFilters] = useState(() => filtersFrom(params)); const [plans, setPlans] = useState([]); const [coaches, setCoaches] = useState([]); const [showFilters, setShowFilters] = useState(false); const [modalMember, setModalMember] = useState(null); const [sending, setSending] = useState("");     const toast = useToast();
    const { result, loading, refreshing, error, retry } = useMemberList(filters, setFilters, params, setParams);
    useEffect(() => { Promise.all([api("/clerk/plans"), api("/clerk/coaches")]).then(([loadedPlans, loadedCoaches]) => { setPlans(loadedPlans); setCoaches(loadedCoaches); }).catch((err) => toast.error(getFriendlyError(err))); }, [toast]);
    useEffect(() => { const onKey = (event) => { if (event.key === "/" && document.activeElement?.tagName !== "INPUT") { event.preventDefault(); document.querySelector("#member-search")?.focus(); } }; document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, []);
    const update = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));
    const clear = () => setFilters(initialFilters);
    const activeFilterCount = ["plan", "coach", "student", "joined_from", "joined_to"].filter((key) => filters[key]).length;
    const sendInfo = async () => { const member = modalMember; setModalMember(null); setSending(member.id); try { const delivery = await api(`/clerk/members/${member.id}/information-email`, { method: "POST" }); toast.success(delivery.sent ? `Information email sent to ${member.full_name}.` : `Information email queued for ${member.full_name}.`); } catch (err) { toast.error(getFriendlyError(err)); } finally { setSending(""); } };
    return <><header className={styles.pageHeader}><div><h1 className={styles.pageTitle}>Member Information</h1><p className={styles.pageDesc}>Search, view, and manage registered gym members</p><p className={styles.summary}>{result.counts.all || 0} members · {result.counts.active || 0} active · {result.counts.expiring || 0} expiring · {result.counts.expired || 0} expired</p></div><button className={styles.btnPrimaryOutline} onClick={() => navigate("/clerk/member-registration")}><i className="fa-solid fa-user-plus"></i> Register New Member</button></header>
        <section className={styles.toolbar}><div className={styles.toolbarRow}><div className={styles.searchBox}><i className={`fa-solid ${loading && filters.search ? "fa-spinner fa-spin" : "fa-magnifying-glass"}`}></i><input id="member-search" value={filters.search} onChange={(event) => update("search", event.target.value)} onKeyDown={(event) => event.key === "Escape" && update("search", "")} placeholder="Search by name, email, phone or member code" aria-label="Search members" />{filters.search && <button type="button" onClick={() => update("search", "")} aria-label="Clear search">×</button>}</div><label className={styles.sortControl}>Sort by<select value={`${filters.sort}:${filters.order}`} onChange={(event) => { const [sort, order] = event.target.value.split(":"); setFilters((current) => ({ ...current, sort, order, page: 1 })); }}><option value="name:asc">Name A-Z</option><option value="joined:desc">Newest joined</option><option value="expiry:asc">Soonest expiry</option><option value="status:asc">Status</option></select></label><button type="button" className={styles.filterButton} onClick={() => setShowFilters((value) => !value)}><i className="fa-solid fa-sliders"></i> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button><FiltersPanel open={showFilters} plans={plans} coaches={coaches} filters={filters} onChange={update} onReset={clear} onClose={() => setShowFilters(false)} /></div><StatusTabs counts={result.counts} active={filters.status} onChange={update} /></section>
        <ActiveChips filters={filters} plans={plans} coaches={coaches} onChange={update} onClear={clear} />
        {error && <InlineError error={error} onRetry={retry} />}
        <div className={`${styles.tableCard} ${refreshing ? "fm-refreshing" : ""}`}>{loading ? <MembersLoading /> : result.rows.length ? <MembersTable rows={result.rows} onSend={setModalMember} sending={sending} onRenew={(member) => navigate(`/clerk/membership?member=${member.id}`)} /> : <div className={styles.emptyState}><i className="fa-solid fa-users-slash"></i><strong>No members match these filters</strong><span>Try adjusting your search or filters.</span><button type="button" onClick={clear}>Clear filters</button></div>}</div>
        <Pagination result={result} filters={filters} update={update} />
        {modalMember && <ClerkModal title="Send member information?" icon="fa-envelope" labelledBy="member-email-title" onClose={() => setModalMember(null)} footer={<><button type="button" className={styles.secondaryButton} onClick={() => setModalMember(null)}>Cancel</button><button type="button" className={styles.primaryButton} onClick={sendInfo}>Send email</button></>}><p>Send the latest information to <strong>{modalMember.full_name}</strong>?</p><p className={styles.muted}>{modalMember.email}</p></ClerkModal>}
    </>;
}
