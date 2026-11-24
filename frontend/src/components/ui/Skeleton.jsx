import "./Skeleton.css";

const px = (v) => (typeof v === "number" ? `${v}px` : v);

// Deterministic "random" widths/heights so skeletons look natural but never jump between renders.
const WIDTHS = [72, 54, 84, 46, 64, 78, 50, 68];
const BARS = [38, 62, 46, 82, 58, 92, 70, 48, 66, 36, 54, 44, 76, 60];
const TEXT_WIDTHS = [220, 176, 198, 148, 208, 164, 188, 156];

/** One pulse placeholder. */
export function Skeleton({ w = "100%", h = 14, r = 8, className = "", style }) {
    return (
        <span
            className={`fm-skel ${className}`}
            style={{ width: px(w), height: px(h), borderRadius: px(r), ...style }}
            aria-hidden="true"
        />
    );
}

/** Announces "Loading" to screen readers and marks the area busy. */
export function SkeletonRegion({ label = "Loading", className = "", children }) {
    return (
        <div className={className} role="status" aria-live="polite" aria-busy="true">
            <span className="fm-skel-sr">{label}...</span>
            {children}
        </div>
    );
}

export function SkeletonText({ lines = 3, lastWidth = "60%", gap = 10 }) {
    return (
        <div style={{ display: "grid", gap }}>
            {Array.from({ length: lines }, (_, i) => (
                <Skeleton
                    key={i}
                    h={12}
                    w={i === lines - 1 ? lastWidth : `min(${TEXT_WIDTHS[i % TEXT_WIDTHS.length]}px, 100%)`}
                />
            ))}
        </div>
    );
}

/** Row of KPI cards. Same grid classes your pages already use. */
export function SkeletonKpiCards({
    count = 4,
    colClass = "col-12 col-sm-6 col-xl-3",
    className = "row g-3 mb-4",
    labels = [],
    icons = [],
}) {
    return (
        <SkeletonRegion label="Loading summary" className={className}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={colClass}>
                    <div className="fm-skel-card">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            {labels[i] ? <span className="fm-skel-kpi-label">{labels[i]}</span> : <Skeleton w="55%" h={12} />}
                            {icons[i] ? <i className={`fa-solid ${icons[i]} fm-skel-kpi-icon`} aria-hidden="true" /> : <Skeleton w={36} h={36} r={10} />}
                        </div>
                        <Skeleton w="42%" h={28} className="mb-2" />
                        <Skeleton w="68%" h={10} />
                    </div>
                </div>
            ))}
        </SkeletonRegion>
    );
}

/** Placeholder with the SAME height as the real chart, so nothing shifts when the chart appears. */
export function SkeletonChart({ height = 250, bars = 12 }) {
    return (
        <SkeletonRegion label="Loading chart">
            <div className="fm-skel-chart" style={{ height }}>
                {Array.from({ length: bars }, (_, i) => (
                    <Skeleton key={i} h={`${BARS[i % BARS.length]}%`} w="auto" r={4} />
                ))}
            </div>
        </SkeletonRegion>
    );
}

export function SkeletonTable({
    rows = 4,
    cols = 5,
    headers = [],
    cellTypes = [],
    className = "",
}) {
    return (
        <SkeletonRegion label="Loading table" className={className}>
            <div className="table-responsive">
                <table className="table fm-skel-table">
                    <thead><tr>
                        {Array.from({ length: cols }, (_, c) => (
                            <th scope="col" key={c}>{headers[c] || <Skeleton h={10} w="68%" />}</th>
                        ))}
                    </tr></thead>
                    <tbody>{Array.from({ length: rows }, (_, r) => (
                        <tr key={r}>
                            {Array.from({ length: cols }, (_, c) => {
                                const type = cellTypes[c] || "text";
                                const width = `${WIDTHS[(r + c) % WIDTHS.length]}%`;
                                return <td key={c}>{type === "badge" ? (
                                    <Skeleton h={22} w="68%" r={999} />
                                ) : type === "action" ? (
                                    <Skeleton h={30} w="58%" r={6} />
                                ) : (
                                    <Skeleton h={12} w={width} />
                                )}</td>;
                            })}
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </SkeletonRegion>
    );
}

export function SkeletonList({ rows = 4, avatar = false }) {
    return (
        <SkeletonRegion label="Loading list">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="fm-skel-list-row">
                    {avatar && <Skeleton w={40} h={40} r={999} />}
                    <div style={{ flex: 1, display: "grid", gap: 8 }}>
                        <Skeleton w={`${WIDTHS[i % WIDTHS.length]}%`} h={12} />
                        <Skeleton w={`${Math.max(30, WIDTHS[(i + 3) % WIDTHS.length] - 20)}%`} h={10} />
                    </div>
                </div>
            ))}
        </SkeletonRegion>
    );
}

/** Grid of cards (plans, videos, workouts...). */
export function SkeletonCards({ count = 6, colClass = "col-12 col-md-6 col-xl-4", height = 180, className = "row g-4" }) {
    return (
        <SkeletonRegion label="Loading" className={className}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={colClass}>
                    <div className="fm-skel-card">
                        <Skeleton h={height * 0.45} r={10} className="mb-3" />
                        <Skeleton w="70%" h={14} className="mb-2" />
                        <Skeleton w="45%" h={10} />
                    </div>
                </div>
            ))}
        </SkeletonRegion>
    );
}

/** Label + input pairs (profile and settings forms). */
export function SkeletonForm({ fields = 6, cols = 2 }) {
    return (
        <SkeletonRegion label="Loading form">
            <div className="fm-skel-panel" style={{ display: "grid", gap: 18, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {Array.from({ length: fields }, (_, i) => (
                    <div key={i} style={{ display: "grid", gap: 8 }}>
                        <Skeleton w="35%" h={10} />
                        <Skeleton h={40} r={8} />
                    </div>
                ))}
            </div>
        </SkeletonRegion>
    );
}

function SkeletonPanel({ children, className = "" }) {
    return <div className={`fm-skel-panel ${className}`}>{children}</div>;
}

export function SkeletonRegistration() {
    const field = (width = "100%") => <div className="fm-skel-registration-field"><Skeleton w="28%" h={10} /><Skeleton className="fm-skel-registration-input" w={width} r={8} /></div>;
    const panel = (children, className = "") => <div className={`fm-skel-registration-panel ${className}`}><div className="fm-skel-registration-header"><Skeleton w={12} h={12} r={3} /><Skeleton w="34%" h={14} /></div><div className="fm-skel-registration-body">{children}</div></div>;
    return <SkeletonRegion label="Loading registration" className="row g-4 mb-4">
        <div className="col-12 col-xl-8 d-flex flex-column gap-4">
            {panel(<><div className="d-grid gap-3">{field()}<div className="row g-3"><div className="col-12 col-md-6">{field()}</div><div className="col-12 col-md-6">{field()}</div></div><div className="row g-3"><div className="col-12 col-md-6">{field()}</div><div className="col-12 col-md-6">{field()}</div></div><div className="row g-3"><div className="col-12 col-md-6">{field()}</div><div className="col-12 col-md-6">{field()}</div></div></div></>)}
            {panel(<div className="row g-3"><div className="col-12 col-sm-6"><div className="fm-skel-panel fm-skel-registration-plan"><Skeleton w="48%" h={12} className="mb-2" /><Skeleton w="30%" h={10} /><Skeleton w="38%" h={22} className="mt-3" /></div></div><div className="col-12 col-sm-6"><div className="fm-skel-panel fm-skel-registration-plan"><Skeleton w="48%" h={12} className="mb-2" /><Skeleton w="30%" h={10} /><Skeleton w="38%" h={22} className="mt-3" /></div></div><div className="col-12 col-sm-6"><div className="fm-skel-panel fm-skel-registration-plan"><Skeleton w="48%" h={12} className="mb-2" /><Skeleton w="30%" h={10} /><Skeleton w="38%" h={22} className="mt-3" /></div></div></div>)}
            {panel(<div className="fm-skel-panel"><div className="d-flex justify-content-between align-items-center gap-3"><div className="d-grid gap-2 flex-grow-1"><Skeleton w="42%" h={12} /><Skeleton w="68%" h={10} /></div><Skeleton w={200} h={40} r={8} /></div></div>)}
        </div>
        <div className="col-12 col-xl-4 d-flex flex-column gap-4">
            {panel(<><div className="d-flex justify-content-between"><Skeleton w="42%" h={11} /><Skeleton w={52} h={12} /></div><div className="d-flex justify-content-between align-items-center border-top border-bottom py-3"><Skeleton w="40%" h={12} /><Skeleton w={86} h={28} /></div><div className="d-grid gap-2"><Skeleton w="28%" h={10} /><div className="d-flex gap-2"><Skeleton className="flex-grow-1" h={54} r={8} /><Skeleton className="flex-grow-1" h={54} r={8} /></div></div><div className="row g-3"><div className="col-6">{field()}</div><div className="col-6">{field()}</div></div><div className="fm-skel-panel"><Skeleton w="72%" h={12} className="mb-2" /><Skeleton w="84%" h={10} /></div></>)}
            <div className="fm-skel-registration-panel fm-skel-registration-action"><div className="fm-skel-registration-body"><Skeleton h={40} r={8} /><Skeleton w="82%" h={10} /></div></div>
        </div>
    </SkeletonRegion>;
}

export function SkeletonMembership({ styles = {} }) {
    const cls = (name) => styles[name] || "";
    const step = (number, title, hint, children) => (
        <section className={cls("stepCard")}>
            <div className={cls("stepHeader")}><span className={cls("stepNumber")}>{number}</span><div><h3>{title}</h3><p>{hint}</p></div></div>
            {children}
        </section>
    );
    const planCard = (coach = false, key) => (
        <div key={key} className={`${cls(coach ? "coachCard" : "planCard")} ${cls("cardDisabled")}`} aria-hidden="true">
            <Skeleton w={18} h={18} r={999} />
            <div className="flex-grow-1"><Skeleton w="64%" h={13} className="mb-2" /><Skeleton w="38%" h={11} /></div>
            <Skeleton w={72} h={16} />
        </div>
    );
    const tableRows = Array.from({ length: 4 }, (_, row) => (
        <tr key={row}>
            <td><div className={cls("memberCell")}><Skeleton w={36} h={36} r={999} /><div><Skeleton w={120} h={12} className="mb-2" /><Skeleton w={150} h={10} /></div></div></td>
            <td><Skeleton w={112} h={12} /><Skeleton w={86} h={10} className="mt-2" /></td>
            <td><Skeleton w={84} h={22} r={999} /></td>
            <td><Skeleton w={72} h={12} /><Skeleton w={58} h={10} className="mt-2" /></td>
            <td><Skeleton w={72} h={22} r={999} /></td>
            <td><div className={cls("rowActions")}><Skeleton w={68} h={30} r={6} /><Skeleton w={68} h={30} r={6} /></div></td>
        </tr>
    ));
    return <SkeletonRegion label="Loading membership">
        <div className={cls("workspace")}>
            <div className={cls("selectorColumn")}>
                {step("1", "Member", "Search or choose a member who needs renewal.", <div className={cls("memberPicker")}>
                    <Skeleton h={42} r={8} />
                    <div className={cls("quickPicks")}><span>Needs renewal</span>{[0, 1, 2].map((item) => <div className="d-flex align-items-center gap-2" key={item}><Skeleton w={34} h={34} r={999} /><div className="flex-grow-1"><Skeleton w="62%" h={11} className="mb-2" /><Skeleton w="38%" h={9} /></div></div>)}</div>
                </div>)}
                {step("2", "Plan", "Choose the membership duration and rate.", <><div className={cls("studentDiscountToggle")}><Skeleton w={16} h={16} r={4} /><div><strong>Student discount</strong><small>Apply the student rate to this renewal.</small></div></div><div className={cls("planGrid")}>{[0, 1, 2, 3].map((item) => planCard(false, item))}</div></>)}
                {step("3", "Coach (optional)", "Add personal coaching or continue without one.", <div className={cls("coachGrid")}>{[0, 1, 2].map((item) => planCard(true, item))}</div>)}
            </div>
            <aside className={cls("summaryCard")}>
                <div className={cls("summaryHeader")}><div><h3>Summary &amp; Payment</h3><p>Review the amount before confirming.</p></div><i className="fa-solid fa-receipt" aria-hidden="true" /></div>
                <div className={cls("summaryMember")}><Skeleton w={38} h={38} r={999} /><Skeleton w="58%" h={12} /></div>
                <div className={cls("breakdown")}><div><span>Plan</span><Skeleton w={84} h={12} /></div><div><span>Coach add-on</span><Skeleton w={72} h={12} /></div><div><span>Student discount</span><Skeleton w={60} h={12} /></div><div className={cls("totalLine")}><span>Total</span><Skeleton w={92} h={20} /></div></div>
                <div className={cls("ruleBox")}><i className="fa-solid fa-circle-info" aria-hidden="true" /><Skeleton w="88%" h={11} /></div>
                <div className={cls("paymentMethods")}><span className={cls("methodSelected")}>Cash</span><span>QR Ph</span></div>
                <div className={cls("cashBox")}><span className={cls("formLabel")}>Cash tendered</span><Skeleton h={40} r={7} /><div className={cls("quickAmounts")}><Skeleton w={54} h={26} r={6} /><Skeleton w={62} h={26} r={6} /><Skeleton w={62} h={26} r={6} /></div></div>
                <Skeleton h={42} r={7} />
            </aside>
        </div>
        <section className={cls("tableSection")}>
            <div className={cls("tableToolbar")}><div className={cls("tableSearch")}><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><Skeleton w="78%" h={12} /></div><Skeleton className={cls("tableSelect")} w={150} h={40} r={8} /><Skeleton className={cls("tableSelect")} w={180} h={40} r={8} /></div>
            <div className={cls("statusTabs")}>{["All", "Active", "Expiring", "Expired", "Upcoming", "No plan", "Suspended"].map((label) => <span key={label}>{label} <Skeleton w={20} h={10} className="fm-skel-inline" /></span>)}</div>
            <div className={cls("tableWrap")}><table className={`table ${cls("customTable")}`}><thead><tr>{["MEMBER", "CURRENT PLAN", "COACH", "EXPIRY", "STATUS", "ACTIONS"].map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{tableRows}</tbody></table></div>
            <div className={cls("mobileCards")}>{[0, 1, 2].map((item) => <article className={cls("mobileMemberCard")} key={item}><div className={cls("memberCell")}><Skeleton w={36} h={36} r={999} /><div><Skeleton w={120} h={12} className="mb-2" /><Skeleton w={150} h={10} /></div><Skeleton w={64} h={20} r={999} /></div><div className={cls("mobileDetails")}>{["Plan", "Expiry", "Coach"].map((label) => <span key={label}>{label} <Skeleton w={84} h={11} /></span>)}</div><div className={cls("rowActions")}><Skeleton w={68} h={30} r={6} /><Skeleton w={68} h={30} r={6} /></div></article>)}</div>
            <footer className={cls("tableFooter")}><Skeleton w={120} h={11} /><Skeleton w={82} h={30} r={6} /><div className={cls("pager")}><Skeleton w={65} h={30} r={6} /><Skeleton w={32} h={11} /><Skeleton w={65} h={30} r={6} /></div></footer>
        </section>
    </SkeletonRegion>;
}

export function SkeletonPayments() {
    return <SkeletonRegion label="Loading payments">
        <div className="fm-skel-panel mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3"><div><span className="fm-skel-section-label">CASH DRAWER</span><strong className="d-block text-white mt-1">Today&apos;s drawer</strong></div><div className="d-flex gap-2"><Skeleton w={144} h={36} r={7} /><Skeleton w={144} h={36} r={7} /></div></div>
            <div className="row g-2">{["Starting float", "Cash today", "QR Ph / digital today", "Total for this period", "Expected in drawer"].map((label) => <div className="col-6 col-xl" key={label}><div className="fm-skel-panel"><span className="fm-skel-kpi-label">{label}</span><Skeleton w={98} h={18} className="mt-2" /></div></div>)}</div>
        </div>
        <div className="d-flex flex-column gap-3">
            <div className="fm-skel-panel"><div className="d-flex gap-3 align-items-start mb-3"><Skeleton w={28} h={28} r={999} /><div><strong className="text-white">Customer</strong><p className="text-secondary mb-0 small">Enter customer details for this payment.</p></div></div><div className="row g-3"><div className="col-12 col-md-6"><Skeleton w={88} h={11} className="mb-2" /><Skeleton h={40} r={7} /></div><div className="col-12 col-md-6"><Skeleton w={64} h={11} className="mb-2" /><Skeleton h={40} r={7} /></div></div></div>
            <div className="fm-skel-panel"><div className="d-flex gap-3 align-items-start mb-3"><Skeleton w={28} h={28} r={999} /><div><strong className="text-white">Plan</strong><p className="text-secondary mb-0 small">Choose the plan for this payment.</p></div></div><div className="d-grid gap-2"><Skeleton h={54} r={8} /><Skeleton h={54} r={8} /></div></div>
            <div className="row g-3"><div className="col-12 col-lg-7"><div className="fm-skel-panel"><div className="d-flex gap-3 align-items-start mb-3"><Skeleton w={28} h={28} r={999} /><div><strong className="text-white">Coach (optional)</strong><p className="text-secondary mb-0 small">Add coaching or continue without one.</p></div></div><SkeletonText lines={2} /></div></div><div className="col-12 col-lg-5"><div className="fm-skel-panel h-100"><div className="d-flex justify-content-between mb-4"><div><span className="fm-skel-section-label">CHECKOUT</span><strong className="d-block text-white mt-1">Summary &amp; Payment</strong></div><Skeleton w={56} h={24} r={8} /></div><SkeletonText lines={3} /><div className="d-flex gap-2 my-3"><Skeleton className="flex-grow-1" h={40} r={7} /><Skeleton className="flex-grow-1" h={40} r={7} /></div><Skeleton h={42} r={7} /></div></div></div>
        </div>
        <div className="fm-skel-panel mt-4">
            <div className="d-flex justify-content-between mb-3"><div><span className="fm-skel-section-label">PAYMENTS</span><h2 className="h5 text-white mt-1">Transactions</h2></div><Skeleton w={76} h={12} /></div>
            <div className="d-flex flex-wrap gap-2 mb-3"><Skeleton w={220} h={38} r={7} />{["Today", "Yesterday", "Last 7 days", "This month"].map((label) => <span className="fm-skel-filter" key={label}>{label}</span>)}<Skeleton w={116} h={38} r={7} /><Skeleton w={116} h={38} r={7} /></div>
            <SkeletonTable rows={4} cols={8} headers={["Time", "Customer", "Plan", "Amount", "Method", "Status", "Receipt no.", "Actions"]} cellTypes={["text", "text", "text", "text", "badge", "badge", "text", "action"]} />
        </div>
    </SkeletonRegion>;
}

export function SkeletonMemberTable() {
    return <SkeletonRegion label="Loading members"><SkeletonPanel><SkeletonTable rows={4} cols={7} headers={["Member", "Contact", "Plan & coach", "Joined", "Expiration", "Status", "Actions"]} cellTypes={["text", "text", "text", "text", "text", "badge", "action"]} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAttendance() {
    return <SkeletonRegion label="Loading attendance"><SkeletonKpiCards count={4} colClass="col-6 col-xl-3" /><div className="row g-4 mb-4"><div className="col-12 col-xl-7"><SkeletonPanel><SkeletonText lines={6} /></SkeletonPanel></div><div className="col-12 col-xl-5"><SkeletonPanel><SkeletonText lines={6} /></SkeletonPanel></div></div><SkeletonPanel><SkeletonTable rows={4} cols={6} headers={["Member", "In", "Out", "Method", "Status", "Duration"]} cellTypes={["text", "text", "text", "text", "badge", "text"]} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonSettings({ styles = {} }) {
    const cls = (name) => styles[name] || "";
    const card = (title, description, icon, iconClass, children) => (
        <div className={cls("settingsCard")}>
            <div className={cls("cardHeader")}><div className="d-flex align-items-center gap-3"><div className={cls(iconClass)}><i className={`fa-solid ${icon}`} aria-hidden="true" /></div><div><h3 className={cls("cardTitle")}>{title}</h3><p className={cls("cardDesc")}>{description}</p></div></div></div>
            <div className={cls("cardBody")}>{children}</div>
        </div>
    );
    const field = (label, height = 40) => <div><label className={cls("formLabel")}>{label}</label><Skeleton h={height} r={8} /></div>;
    return <SkeletonRegion label="Loading settings"><div className="row g-4 mb-5">
        <div className="col-12 col-xl-8 d-flex flex-column gap-4">
            {card("Personal Information", "Update your contact details", "fa-id-badge", "iconBoxPrimary", <><div className="row g-3 mb-3"><div className="col-12 col-md-6">{field("First Name")}</div><div className="col-12 col-md-6">{field("Last Name")}</div></div>{field("Staff Email Address")}<div className="mt-3">{field("Contact Phone")}<Skeleton w={170} h={36} r={7} className="mt-3" /></div></>)}
            {card("Security & Password", "Ensure your account remains secure", "fa-lock", "iconBoxWarning", <>{field("Current Password")}<div className="row g-3 mt-1 mb-3"><div className="col-12 col-md-6">{field("New Password")}</div><div className="col-12 col-md-6">{field("Confirm New Password")}</div></div><div className="d-flex gap-2"><Skeleton w={132} h={36} r={7} /><Skeleton w={170} h={36} r={7} /></div></>)}
        </div>
        <div className="col-12 col-xl-4 d-flex flex-column gap-4">
            <div className={cls("settingsCard")}><div className={cls("cardHeader")}><span className={cls("panelLabel")}>PROFILE PICTURE</span><h3 className={cls("cardTitle")}>Staff Avatar</h3></div><div className={`${cls("cardBody")} d-flex flex-column align-items-center`}><Skeleton w={128} h={128} r={999} /><Skeleton w={150} h={18} className="mt-3 mb-2" /><span className={cls("roleBadge")}>Front Desk Staff</span><p className="text-secondary mt-2 mb-4 small">Max file size: 5MB (JPG, PNG)</p><div className="d-flex gap-2 w-100"><Skeleton className="flex-grow-1" h={38} r={7} /><Skeleton w={42} h={38} r={7} /></div></div></div>
            {card("Terminal Preferences", "Local browser settings", "fa-sliders", "iconBoxSuccess", <><div className="d-flex justify-content-between align-items-center mb-4"><div><strong className="d-block text-white">Audio Alerts</strong><small className="text-secondary">Play sound on new QR scan check-ins</small></div><Skeleton w={42} h={24} r={999} /></div><div className="d-flex justify-content-between align-items-center mb-4"><div><strong className="d-block text-white">Payment Confirmations</strong><small className="text-secondary">Show double-check prompt before completing transactions</small></div><Skeleton w={42} h={24} r={999} /></div>{field("Default payment method")}<small className={cls("helperText")}>Preselect this method at the payment terminal.</small></>)}
        </div>
    </div></SkeletonRegion>;
}

export function SkeletonMemberDashboard() {
    return <SkeletonRegion label="Loading dashboard">
        <div className="fm-skel-panel p-4 mb-4">
            <span className="fm-skel-static-tag"><i className="fa-solid fa-location-dot" aria-hidden="true" /> Local Community Member</span>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mt-3 gap-3">
                <div><h1 className="h3 text-white mb-2">Welcome, <Skeleton w={88} h={28} className="fm-skel-inline" /></h1><p className="text-secondary mb-0">Keep up the momentum! <Skeleton w={32} h={14} className="fm-skel-inline" /> visits logged so far.</p></div>
                <Skeleton w={140} h={40} r={8} />
            </div>
        </div>
        <SkeletonKpiCards count={3} colClass="col-12 col-md-4" labels={["Current Plan", "Total Visits", "Membership Expiration"]} icons={["fa-id-card", "fa-chart-line", "fa-calendar-xmark"]} />
        <div className="row g-4">
            <div className="col-12 col-lg-8">
                <SkeletonPanel className="mb-4"><span className="fm-skel-section-label">TODAY&apos;S ROUTINE</span><Skeleton w="min(290px, 100%)" h={22} className="mt-2 mb-4" /><div className="row g-3">{Array.from({ length: 3 }, (_, i) => <div className="col-12 col-md-6" key={i}><div className="fm-skel-panel"><Skeleton w="68%" h={16} className="mb-2" /><Skeleton w="48%" h={11} className="mb-3" /><Skeleton w="82%" h={10} /></div></div>)}</div><div className="border-top border-secondary pt-3 mt-4 d-flex justify-content-between"><Skeleton w="56%" h={12} /><Skeleton w={150} h={12} /></div></SkeletonPanel>
                <SkeletonPanel><span className="fm-skel-section-label">ATTENDANCE LOG</span><div className="d-flex justify-content-between align-items-center mb-3"><strong className="text-white">Recent Gym Visits</strong><Skeleton w={120} h={12} /></div><SkeletonTable rows={3} cols={4} headers={["Date", "Check-in time", "Check-out time", "Method"]} cellTypes={["text", "text", "text", "badge"]} /></SkeletonPanel>
            </div>
            <div className="col-12 col-lg-4"><SkeletonPanel><span className="fm-skel-section-label">COMMUNITY BOARD</span><h4 className="text-white mt-2 mb-3">Gym Notices</h4><SkeletonList rows={2} /></SkeletonPanel></div>
        </div>
    </SkeletonRegion>;
}

export function SkeletonMemberProfile() {
    return <SkeletonRegion label="Loading profile"><div className="mb-4"><h1 className="h2 text-white mb-2">My Profile</h1><p className="text-secondary">Update your personal information, membership details, and training notes for the gym staff.</p></div><SkeletonPanel className="mb-4"><div className="d-flex justify-content-between align-items-center"><div><Skeleton w={190} h={24} className="mb-2" /><Skeleton w={220} h={12} className="mb-2" /><Skeleton w={250} h={12} /></div><div className="d-flex gap-3"><Skeleton w={110} h={78} r={8} /><Skeleton w={110} h={78} r={8} /></div></div></SkeletonPanel><div className="row g-4"><div className="col-12 col-lg-8"><SkeletonPanel><SkeletonForm fields={5} cols={2} /></SkeletonPanel><SkeletonPanel className="mt-4"><SkeletonForm fields={3} cols={1} /></SkeletonPanel><SkeletonPanel className="mt-4"><SkeletonText lines={3} /></SkeletonPanel></div><div className="col-12 col-lg-4"><SkeletonPanel className="mb-4"><Skeleton w={104} h={104} r={999} className="mx-auto" /><Skeleton w={140} h={16} className="mx-auto mt-3 mb-3" /><div className="d-flex gap-2"><Skeleton className="flex-grow-1" h={38} r={8} /><Skeleton w={40} h={38} r={8} /></div></SkeletonPanel><SkeletonPanel><SkeletonText lines={6} /></SkeletonPanel></div></div></SkeletonRegion>;
}

export function SkeletonMemberMembership() {
    return <SkeletonRegion label="Loading membership">
        <div className="mb-4"><h1 className="h2 text-white mb-2">Membership &amp; Passes</h1><p className="text-secondary">View your current subscription status, gym pass rates, and personal coaching fees. All transactions are handled directly by our staff.</p></div>
        <div className="row mb-5"><div className="col-12"><SkeletonPanel>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3"><span className="fm-skel-static-tag">CURRENT SUBSCRIPTION</span><Skeleton w={170} h={25} r={999} /></div>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-4"><div><Skeleton w="min(240px, 100%)" h={30} className="mb-2" /><Skeleton w="min(420px, 100%)" h={12} /><Skeleton w="min(360px, 100%)" h={12} className="mt-2" /></div><Skeleton w={120} h={42} /></div>
            <div className="row g-3 mb-4">{[0, 1].map((item) => <div className="col-12 col-md-6" key={item}><div className="fm-skel-panel d-flex align-items-center gap-3"><Skeleton w={42} h={42} r={10} /><div className="flex-grow-1"><span className="fm-skel-kpi-label">{item ? "Access Rhythm" : "Assigned Coach Add-on"}</span><Skeleton w="min(150px, 100%)" h={15} className="mt-2" /></div><Skeleton w={82} h={14} /></div></div>)}</div>
            <p className="text-secondary border-top border-secondary pt-3 mb-0">Membership renewals and coach reassignments are processed by the clerk.</p>
        </SkeletonPanel></div></div>
        <div className="mb-4 mt-5"><span className="fm-skel-section-label">TRANSPARENT LOCAL PRICING</span><h2 className="h4 text-white mt-2">Analyn&apos;s Fitness Gym Membership Rates</h2><p className="text-secondary">No lock-in contracts, no hidden registration fees. Just pure gym floor access.</p></div>
        <div className="row g-4 mb-5">{Array.from({ length: 4 }, (_, i) => <div key={i} className="col-12 col-md-6 col-xl-3"><div className="fm-skel-card"><div className="d-flex justify-content-between mb-3"><Skeleton w="62%" h={18} /><Skeleton w={24} h={24} r={999} /></div><Skeleton w="82%" h={11} className="mb-2" /><Skeleton w="68%" h={11} className="mb-4" /><Skeleton w="44%" h={28} className="mb-2" /><Skeleton w={92} h={22} r={999} className="mb-4" />{[0, 1, 2].map((line) => <div className="d-flex align-items-center gap-2 mb-2" key={line}><i className="fa-regular fa-circle-check text-secondary" aria-hidden="true" /><Skeleton w={`${68 - line * 8}%`} h={11} /></div>)}</div></div>)}</div>
        <div className="mb-4 mt-5"><span className="fm-skel-section-label">PERSONAL GUIDANCE &amp; FORM CORRECTION</span><h2 className="h4 text-white mt-2">Available Coaches &amp; Personal Coaching Rates</h2><p className="text-secondary">Add one-on-one coaching to your membership for form correction, workout programming, and encouragement.</p></div>
        <div className="row g-4">{[0, 1].map((item) => <div className="col-12 col-lg-6" key={item}><SkeletonPanel><div className="d-flex align-items-center gap-3 mb-4"><Skeleton w={64} h={64} r={999} /><div><Skeleton w={106} h={11} className="mb-2" /><Skeleton w={174} h={20} className="mb-2" /><Skeleton w={140} h={11} /></div></div><SkeletonPanel className="mb-4"><Skeleton w={220} h={11} className="mb-2" /><Skeleton w={120} h={21} /></SkeletonPanel><SkeletonText lines={3} /></SkeletonPanel></div>)}</div>
    </SkeletonRegion>;
}

export function SkeletonMemberAttendance({ styles = {}, year, month, monthYearLabel }) {
    const cls = (name) => styles[name] || "";
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();
    const days = [
        ...Array.from({ length: firstDay }, (_, index) => ({ day: previousMonthDays - firstDay + index + 1, current: false })),
        ...Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, current: true })),
    ];
    const trailingDays = (7 - (days.length % 7)) % 7;
    for (let index = 1; index <= trailingDays; index += 1) days.push({ day: index, current: false });
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()).split("-").map(Number);

    return <SkeletonRegion label="Loading attendance">
        <SkeletonKpiCards count={4} colClass="col-12 col-sm-6 col-xl-3" labels={["Total Visits This Month", "Consistency Streak", "Most Active Time", "Current Week Progress"]} icons={["fa-calendar-check", "fa-fire", "fa-clock", "fa-arrow-trend-up"]} />
        <div className="row g-4 mb-4">
            <div className="col-12 col-lg-8">
                <div className={`${cls("panelCard")} h-100 p-4 d-flex flex-column`}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                        <div><h3 className={cls("panelTitle")}>{monthYearLabel} Calendar Flow</h3><p className={cls("panelDesc")}>Highlighted dots mark completed workout sessions</p></div>
                        <div className="d-flex gap-3 text-secondary" style={{ fontSize: "0.75rem" }}><span><span className={cls("dotActive")} /> Visited</span><span><span className={cls("dotInactive")} /> Rest Day</span></div>
                    </div>
                    <div className={cls("calendarGrid")}>
                        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <div key={day} className={cls("calHeader")}>{day}</div>)}
                        {days.map((entry, index) => <div key={`${entry.current ? "current" : "other"}-${index}`} className={entry.current ? `${cls("calCell")} ${today[0] === year && today[1] === month + 1 && today[2] === entry.day ? cls("calCellToday") : ""}` : cls("calCellEmpty")}>{entry.day}</div>)}
                    </div>
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-top border-secondary pt-3 mt-auto text-secondary" style={{ fontSize: "0.75rem" }}>
                        <span className="text-success"><i className="fa-regular fa-face-smile" /> Great habit! You are in the top 15% most consistent members this month.</span>
                        <span className="mt-2 mt-sm-0">Target: 20 Visits Goal</span>
                    </div>
                </div>
            </div>
            <div className="col-12 col-lg-4">
                <div className={`${cls("instructionsCard")} p-4`}>
                    <div className="d-flex align-items-center gap-3 mb-4"><i className="fa-regular fa-circle-question fs-5 text-secondary" /><h3 className="m-0 text-white">How to Check In</h3></div>
                    <div className="d-flex align-items-start gap-3 mb-4"><div className={cls("stepNumber")}>1</div><div><h5 className="text-white mb-1">Give your Name</h5><p className="mb-0 text-secondary">Inform the staff at the counter upon arrival.</p></div></div>
                    <div className="d-flex align-items-start gap-3 mb-4"><div className={cls("stepNumberActive")}>2</div><div><h5 className="text-white mb-1">You are ready to train!</h5><p className="mb-0 text-secondary">Your visit is logged instantly in your history log below.</p></div></div>
                </div>
            </div>
        </div>
        <div className={`${cls("tableCard")} p-4`}>
            <div className="d-flex align-items-center gap-3 mb-4"><h3 className={cls("panelTitle")}>Visit Logs</h3><Skeleton w={72} h={20} r={999} /></div>
            <SkeletonTable rows={4} cols={7} headers={["DATE", "TIME IN", "TIME OUT", "DURATION", "CHECK-IN METHOD", "RECORDED BY", "STATUS"]} cellTypes={["text", "text", "text", "text", "text", "text", "badge"]} />
            <div className="d-flex align-items-center gap-1 mt-4"><span className="text-secondary">Showing</span><Skeleton w={24} h={11} /><span className="text-secondary">visits for {monthYearLabel}</span></div>
        </div>
    </SkeletonRegion>;
}

export function SkeletonMemberBilling() {
    return <SkeletonRegion label="Loading billing"><div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"><div><h1 className="h2 text-white mb-2">Billing &amp; Receipts</h1><p className="text-secondary">Review your payments, upcoming monthly renewals, and instant copies of gym receipts.</p></div><Skeleton w={230} h={38} r={8} /></div><SkeletonKpiCards count={3} colClass="col-12 col-md-4" labels={["CURRENT ACCOUNT BALANCE", "NEXT RENEWAL DATE", "EXPECTED RENEWAL AMOUNT"]} icons={["fa-clock", "fa-calendar", "fa-arrow-trend-up"]} /><div className="row g-4"><div className="col-12 col-lg-8"><SkeletonPanel><h3 className="text-white mb-2">Payment History</h3><Skeleton w="min(290px, 100%)" h={12} className="mb-4" /><SkeletonTable rows={4} cols={7} headers={["Receipt #", "Date", "Item / service", "Method", "Amount", "Status", "Actions"]} cellTypes={["text", "text", "text", "badge", "text", "badge", "action"]} /></SkeletonPanel></div><div className="col-12 col-lg-4"><SkeletonPanel><h3 className="text-white mb-3">Upcoming Payments</h3><SkeletonText lines={4} /></SkeletonPanel></div></div></SkeletonRegion>;
}

export function SkeletonMemberWorkoutPlan() {
    return (
        <SkeletonRegion label="Loading workout plan">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3">
                <div style={{ display: "grid", gap: 10, flex: 1 }}>
                    <span className="fm-skel-static-tag"><i className="fa-solid fa-layer-group" aria-hidden="true" /> Active Program · Current Cycle</span>
                    <h1 className="h2 text-white">My Workout Routine &amp; Weekly Schedule</h1>
                    <p className="text-secondary mb-0">Personalized training split at Analyn&apos;s Fitness Gym</p>
                </div>
                <div className="d-flex flex-column flex-sm-row gap-2"><Skeleton w={156} h={40} r={8} /><Skeleton w={126} h={40} r={8} /></div>
            </div>
            <div className="mb-5">
                <div className="d-flex justify-content-between align-items-center mb-3"><h4 className="text-white">Weekly Training Matrix</h4><span className="text-secondary small">Click day to view or edit exercises</span></div>
                <div className="d-grid fm-skel-week-grid">
                    {Array.from({ length: 7 }, (_, i) => (
                        <div className="fm-skel-card p-3" key={i}><span className="fm-skel-section-label">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i]}</span><Skeleton w="72%" h={16} className="mt-2 mb-2" /><Skeleton w="56%" h={10} className="mb-3" /><Skeleton w="84%" h={10} /></div>
                    ))}
                </div>
            </div>
            <div className="row g-4 mt-2">
                <div className="col-12 col-lg-8"><SkeletonPanel className="mb-4"><div className="d-flex align-items-center gap-3 mb-4"><Skeleton w={44} h={44} r={10} /><div><Skeleton w={200} h={18} className="mb-2" /><Skeleton w={160} h={11} /></div></div><div className="d-flex flex-column gap-3">{Array.from({ length: 3 }, (_, i) => <SkeletonPanel key={i}><div className="d-flex justify-content-between mb-3"><div className="d-flex align-items-center gap-3"><Skeleton w={28} h={28} r={999} /><div><Skeleton w="min(180px, 100%)" h={16} className="mb-2" /><Skeleton w={120} h={11} /></div></div><Skeleton w={32} h={32} r={7} /></div><div className="row g-2">{[0, 1, 2, 3].map((field) => <div className="col-6 col-sm-3" key={field}><div className="fm-skel-panel"><Skeleton w="65%" h={10} className="mb-2" /><Skeleton w="80%" h={14} /></div></div>)}</div></SkeletonPanel>)}</div></SkeletonPanel></div>
                <div className="col-12 col-lg-4"><SkeletonPanel className="mb-4"><Skeleton w={160} h={18} className="mb-3" /><SkeletonText lines={4} /></SkeletonPanel><SkeletonPanel><Skeleton w={140} h={18} className="mb-3" /><SkeletonText lines={4} /></SkeletonPanel></div>
            </div>
        </SkeletonRegion>
    );
}

export function SkeletonNotifications() {
    return <SkeletonNotificationRows />;
}

export function SkeletonNotificationRows({ rows = 5 }) {
    return <SkeletonRegion label="Loading notifications">
        <div className="fm-skel-stack">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="fm-skel-panel d-flex align-items-start gap-3">
                    <Skeleton w={42} h={42} r={10} />
                    <div className="flex-grow-1">
                        <div className="d-flex justify-content-between gap-3 mb-2">
                            <Skeleton w={`${58 + (i % 3) * 8}%`} h={14} />
                            <Skeleton w={52} h={10} />
                        </div>
                        <Skeleton w={`${72 - (i % 2) * 10}%`} h={11} className="mb-2" />
                        <Skeleton w={38} h={10} />
                    </div>
                </div>
            ))}
        </div>
    </SkeletonRegion>;
}

export function SkeletonAdminSettings({ styles = {} }) {
    const cls = (name) => styles[name] || "";
    const field = (label, height = 40) => <div className="mb-3"><label className={cls("formLabel")}>{label}</label><Skeleton h={height} r={8} /></div>;
    const card = (title, description, icon, iconClass, children) => (
        <div className={cls("settingsCard")}>
            <div className={cls("cardHeader")}><div className="d-flex align-items-center gap-3"><div className={cls(iconClass)}><i className={`fa-solid ${icon}`} aria-hidden="true" /></div><div><h3 className={cls("cardTitle")}>{title}</h3><p className={cls("cardDesc")}>{description}</p></div></div></div>
            <div className={cls("cardBody")}>{children}</div>
        </div>
    );
    return <SkeletonRegion label="Loading settings">
        <div className="row g-4 mb-5">
            <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                {card("Business Details", "Core facility identity & contact", "fa-store", "iconBoxPrimary", <>{field("Gym Name")}{field("Branch Address")}{field("Contact Phone")}{field("Contact Email")}</>)}
                {card("Operating Hours", "Schedule visible to all members", "fa-clock", "iconBoxPrimary", <><label className={cls("formLabel")}>Monday to Saturday</label><div className="d-flex align-items-center gap-2 mb-4"><Skeleton className="flex-grow-1" h={40} /><span className="text-secondary">to</span><Skeleton className="flex-grow-1" h={40} /></div><label className={cls("formLabel")}>Sunday</label><div className="d-flex align-items-center gap-2"><Skeleton className="flex-grow-1" h={40} /><span className="text-secondary">to</span><Skeleton className="flex-grow-1" h={40} /></div></>)}
            </div>
            <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                {card("Front Desk & Portals", "Daily operations & member access rules", "fa-desktop", "iconBoxSuccess", <><label className={cls("formLabel")}>Default Expiration Reminder</label><Skeleton h={40} className="mb-3" /><label className={cls("formLabel")}>Preferred Payment Modes</label><div className={cls("checkboxGroup")}>{["Cash", "GCash (Direct QR Scan)", "Maya (Direct QR Scan)", "QR Ph (GCash, Maya, bank apps)"].map((label) => <div className={cls("checkboxLabel")} key={label}><span>{label}</span><Skeleton w={16} h={16} r={4} /></div>)}</div><label className={`${cls("formLabel")} mt-3`}>Member Portal Configurations</label>{["Allow Member Registrations", "Display Live Floor Capacity"].map((label) => <div className="d-flex justify-content-between align-items-center mb-3" key={label}><span className="text-white">{label}</span><Skeleton w={42} h={24} r={999} /></div>)}</>)}
            </div>
            <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                {card("Website Maintenance", "Schedule downtime & offline mode", "fa-hammer", "iconBoxWarning", <><div className="d-flex justify-content-between align-items-center mb-3"><strong className="text-warning">Enable Maintenance Mode</strong><Skeleton w={42} h={24} r={999} /></div><p className={cls("helperText")}>Activating this restricts member portal access. Only Admins can log in.</p>{field("Schedule Maintenance (Optional)")}{field("Public Offline Message", 86)}</>)}
                {card("System Backups", "Storage & local resilience", "fa-database", "iconBoxSecondary", <><div className={cls("backupBox")}><span className="text-secondary small">Data Export</span><Skeleton w="70%" h={20} className="my-2" /><p className="text-secondary small mb-0">Exported CSV files from approved operational tables.</p></div><div className={cls("storageBox")}><div className="d-flex justify-content-between mb-3"><span>System Status</span><Skeleton w={60} h={11} /></div><div className="d-flex justify-content-between mb-2"><span>Database size</span><Skeleton w={52} h={11} /></div><Skeleton h={8} r={999} className="mb-2" /><Skeleton w="72%" h={10} /><Skeleton className="mt-3" h={40} r={8} /></div></>)}
            </div>
        </div>
        <section className={`${cls("settingsCard")} mt-4`}>
            <div className={cls("cardHeader")}><h3 className={cls("cardTitle")}>Business &amp; receipts</h3><p className={cls("cardDesc")}>Optional details used on payment receipts</p></div>
            <div className="row g-3 p-4">{["Legal business name", "Business address", "TIN", "Receipt series prefix", "Support email", "Support phone", "BIR permit note", "Receipt footer note", "VAT status"].map((label) => <div className="col-12 col-md-6" key={label}><label className={cls("formLabel")}>{label}</label><Skeleton h={40} r={8} /></div>)}</div>
        </section>
    </SkeletonRegion>;
}

export function SkeletonAdminDashboard() {
    return <SkeletonRegion label="Loading dashboard"><SkeletonKpiCards count={4} /><div className="row g-4"><div className="col-12 col-xl-8"><SkeletonPanel><SkeletonChart height={250} /></SkeletonPanel></div><div className="col-12 col-xl-4"><SkeletonPanel><SkeletonList rows={3} /></SkeletonPanel></div></div><SkeletonPanel className="mt-4"><SkeletonTable rows={4} cols={4} headers={["Member name & ID", "Plan", "Check-in time", "Recorded by"]} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAdminAnalytics({ rows = 5, cols = 5 }) {
    return <SkeletonRegion label="Loading analytics"><SkeletonKpiCards count={3} colClass="col-12 col-md-4" /><div className="row g-4"><div className="col-12 col-xl-7"><SkeletonPanel><SkeletonChart height={320} /></SkeletonPanel></div><div className="col-12 col-xl-5"><SkeletonPanel><SkeletonText lines={8} /></SkeletonPanel></div></div><SkeletonPanel className="mt-4"><SkeletonTable rows={rows} cols={cols} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAdminPlans() {
    return <SkeletonRegion label="Loading plans"><SkeletonKpiCards count={3} colClass="col-12 col-md-4" /><SkeletonCards count={4} colClass="col-12 col-md-6 col-xl-3" height={180} /></SkeletonRegion>;
}

export function SkeletonAdminAnnouncements() {
    return <SkeletonRegion label="Loading announcements"><SkeletonKpiCards count={3} colClass="col-12 col-md-4" /><SkeletonPanel><SkeletonList rows={4} avatar={false} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAdminUsers() {
    return <SkeletonRegion label="Loading users"><SkeletonKpiCards count={4} /><SkeletonPanel><SkeletonTable rows={4} cols={5} headers={["User", "Role", "Contact", "Status", "Actions"]} cellTypes={["text", "badge", "text", "badge", "action"]} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAdminWalkIns() {
    return <SkeletonRegion label="Loading walk-in customers"><SkeletonKpiCards count={3} /><SkeletonPanel><SkeletonTable rows={4} cols={6} headers={["Customer", "Phone", "Email", "Visits", "Last visit", "Actions"]} cellTypes={["text", "text", "text", "text", "text", "action"]} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAdminReports() {
    return <SkeletonRegion label="Loading reports"><SkeletonKpiCards count={4} /><SkeletonPanel><SkeletonTable rows={4} cols={6} headers={["Report name", "Date filter", "Generated by", "Format", "Timestamp", "Action"]} cellTypes={["text", "text", "text", "badge", "text", "action"]} /></SkeletonPanel></SkeletonRegion>;
}

/** Wraps real content so it fades in softly when it replaces a skeleton. */
export function Loadable({ loading, skeleton, children, className = "" }) {
    if (loading) return skeleton;
    return <div className={`fm-fade-in ${className}`}>{children}</div>;
}

export function SkeletonCheckIn() {
    return (
        <SkeletonRegion label="Loading check-in">
            <div className="fm-skel-checkin-content">
                <Skeleton w="34%" h={32} className="fm-skel-checkin-title" />
                <Skeleton w="72%" h={12} className="fm-skel-checkin-copy" />
                <Skeleton w="40%" h={12} className="fm-skel-checkin-label" />
                <Skeleton h={50} r={10} />
                <div className="d-flex align-items-center gap-2 mt-3">
                    <Skeleton w={16} h={16} r={4} />
                    <Skeleton w="58%" h={12} />
                </div>
                <Skeleton h={48} r={10} className="fm-skel-checkin-button" />
            </div>
        </SkeletonRegion>
    );
}

export function SkeletonMemberCheckIn() {
    return (
        <SkeletonRegion label="Loading gym check-in">
            <SkeletonText lines={2} lastWidth="72%" gap={8} />
        </SkeletonRegion>
    );
}
