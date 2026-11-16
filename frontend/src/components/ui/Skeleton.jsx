import "./Skeleton.css";

const px = (v) => (typeof v === "number" ? `${v}px` : v);

// Deterministic "random" widths/heights so skeletons look natural but never jump between renders.
const WIDTHS = [72, 54, 84, 46, 64, 78, 50, 68];
const BARS = [38, 62, 46, 82, 58, 92, 70, 48, 66, 36, 54, 44, 76, 60];

/** One shimmering block. */
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
                <Skeleton key={i} h={12} w={i === lines - 1 ? lastWidth : "100%"} />
            ))}
        </div>
    );
}

/** Row of KPI cards. Same grid classes your pages already use. */
export function SkeletonKpiCards({ count = 4, colClass = "col-12 col-sm-6 col-xl-3", className = "row g-3 mb-4" }) {
    return (
        <SkeletonRegion label="Loading summary" className={className}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={colClass}>
                    <div className="fm-skel-card">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Skeleton w="55%" h={12} />
                            <Skeleton w={36} h={36} r={10} />
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

export function SkeletonTable({ rows = 6, cols = 5, header = true }) {
    const template = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
    return (
        <SkeletonRegion label="Loading table">
            {header && (
                <div className="fm-skel-table-row" style={template}>
                    {Array.from({ length: cols }, (_, c) => (
                        <Skeleton key={c} h={10} w="45%" />
                    ))}
                </div>
            )}
            {Array.from({ length: rows }, (_, r) => (
                <div key={r} className="fm-skel-table-row" style={template}>
                    {Array.from({ length: cols }, (_, c) => (
                        <Skeleton key={c} h={12} w={`${WIDTHS[(r + c) % WIDTHS.length]}%`} />
                    ))}
                </div>
            ))}
        </SkeletonRegion>
    );
}

export function SkeletonList({ rows = 4, avatar = true }) {
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

/** Whole-page placeholder (sidebar + header + cards + panel). Use while the signed-in profile is loading. */
export function SkeletonPage() {
    return (
        <SkeletonRegion label="Loading page" className="d-flex" >
            <div className="d-none d-lg-block" style={{ width: 250, minHeight: "100vh", padding: 20, borderRight: "1px solid var(--card-stroke-color, #334155)" }}>
                <Skeleton w={150} h={22} className="mb-4" />
                {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} h={36} r={10} className="mb-2" />
                ))}
            </div>
            <div style={{ flex: 1, padding: 24, minWidth: 0 }}>
                <Skeleton w={220} h={28} className="mb-2" />
                <Skeleton w={340} h={12} className="mb-4" />
                <SkeletonKpiCards count={4} />
                <div className="fm-skel-panel">
                    <SkeletonTable rows={5} cols={4} />
                </div>
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

export function SkeletonMembership() {
    return <SkeletonRegion label="Loading membership"><div className="row g-4"><div className="col-12 col-xl-8"><SkeletonPanel><SkeletonText lines={4} /></SkeletonPanel><SkeletonPanel><SkeletonText lines={5} /></SkeletonPanel><SkeletonPanel><SkeletonText lines={4} /></SkeletonPanel></div><div className="col-12 col-xl-4"><SkeletonPanel><SkeletonText lines={9} /></SkeletonPanel></div></div><SkeletonPanel className="mt-4"><SkeletonTable rows={7} cols={6} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonPayments() {
    return <SkeletonRegion label="Loading payments"><SkeletonKpiCards count={5} colClass="col-12 col-sm-6 col-xl-3"/><div className="row g-4"><div className="col-12 col-xl-8"><SkeletonPanel><SkeletonText lines={9} /></SkeletonPanel><SkeletonPanel><SkeletonText lines={7} /></SkeletonPanel></div><div className="col-12 col-xl-4"><SkeletonPanel><SkeletonText lines={8} /></SkeletonPanel></div></div><SkeletonPanel className="mt-4"><SkeletonTable rows={6} cols={7} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonMemberTable() {
    return <SkeletonRegion label="Loading members"><SkeletonPanel><SkeletonTable rows={7} cols={7} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAttendance() {
    return <SkeletonRegion label="Loading attendance"><SkeletonKpiCards count={4} colClass="col-6 col-xl-3" /><div className="row g-4 mb-4"><div className="col-12 col-xl-7"><SkeletonPanel><SkeletonText lines={6} /></SkeletonPanel></div><div className="col-12 col-xl-5"><SkeletonPanel><SkeletonText lines={6} /></SkeletonPanel></div></div><SkeletonPanel><SkeletonTable rows={7} cols={6} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonSettings() {
    return <SkeletonRegion label="Loading settings"><div className="row g-4"><div className="col-12 col-xl-7"><SkeletonPanel><SkeletonForm fields={5} cols={1} /></SkeletonPanel><SkeletonPanel className="mt-4"><SkeletonForm fields={4} cols={1} /></SkeletonPanel></div><div className="col-12 col-xl-5"><SkeletonPanel><SkeletonForm fields={6} cols={1} /></SkeletonPanel></div></div></SkeletonRegion>;
}

export function SkeletonMemberDashboard() {
    return <SkeletonRegion label="Loading dashboard"><SkeletonPanel className="mb-4"><SkeletonText lines={3} /></SkeletonPanel><SkeletonKpiCards count={3} colClass="col-12 col-md-4" /><div className="row g-4"><div className="col-12 col-lg-8"><SkeletonPanel><SkeletonText lines={10} /></SkeletonPanel><SkeletonPanel className="mt-4"><SkeletonTable rows={4} cols={3} /></SkeletonPanel></div><div className="col-12 col-lg-4"><SkeletonPanel><SkeletonList rows={4} /></SkeletonPanel></div></div></SkeletonRegion>;
}

export function SkeletonMemberProfile() {
    return <SkeletonRegion label="Loading profile"><SkeletonPanel className="mb-4"><SkeletonText lines={4} /></SkeletonPanel><div className="row g-4"><div className="col-12 col-lg-8"><SkeletonPanel><SkeletonForm fields={8} cols={2} /></SkeletonPanel></div><div className="col-12 col-lg-4"><SkeletonPanel><SkeletonText lines={8} /></SkeletonPanel></div></div></SkeletonRegion>;
}

export function SkeletonMemberMembership() {
    return <SkeletonRegion label="Loading membership"><SkeletonPanel className="mb-5"><SkeletonText lines={8} /></SkeletonPanel><SkeletonText lines={3} /><SkeletonCards count={4} colClass="col-12 col-md-6 col-xl-3" height={150} /></SkeletonRegion>;
}

export function SkeletonMemberAttendance() {
    return <SkeletonRegion label="Loading attendance"><SkeletonKpiCards count={2} colClass="col-12 col-md-6" /><div className="row g-4"><div className="col-12 col-lg-5"><SkeletonPanel><SkeletonText lines={8} /></SkeletonPanel></div><div className="col-12 col-lg-7"><SkeletonPanel><SkeletonTable rows={6} cols={5} /></SkeletonPanel></div></div></SkeletonRegion>;
}

export function SkeletonMemberBilling() {
    return <SkeletonRegion label="Loading billing"><SkeletonPanel className="mb-4"><SkeletonText lines={3} /></SkeletonPanel><SkeletonKpiCards count={3} colClass="col-12 col-md-4" /><SkeletonPanel><SkeletonTable rows={6} cols={5} /></SkeletonPanel></SkeletonRegion>;
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

export function SkeletonVideoLibrary() {
    return <SkeletonRegion label="Loading video library" className="row g-4"><SkeletonVideoCard count={6} colClass="col-12 col-md-6 col-lg-4" /></SkeletonRegion>;
}

function SkeletonVideoCard({ count = 6, colClass = "col-12 col-md-6 col-xl-4" }) {
    return Array.from({ length: count }, (_, i) => (
        <div key={i} className={colClass}>
            <div className="fm-skel-card p-0 overflow-hidden">
                <Skeleton h={150} r={0} />
                <div className="p-3">
                    <Skeleton w="82%" h={16} className="mb-2" />
                    <Skeleton w="56%" h={11} />
                </div>
                <div className="d-flex justify-content-between align-items-center px-3 pb-3">
                    <Skeleton w={52} h={10} />
                    <Skeleton w={28} h={28} r={999} />
                </div>
            </div>
        </div>
    ));
}

export function SkeletonAdminSettings() {
    return <SkeletonRegion label="Loading settings"><div className="row g-4 mb-5"><div className="col-12 col-xl-4"><SkeletonPanel><SkeletonText lines={7} /></SkeletonPanel></div><div className="col-12 col-xl-4"><SkeletonPanel><SkeletonText lines={8} /></SkeletonPanel></div><div className="col-12 col-xl-4"><SkeletonPanel><SkeletonText lines={7} /></SkeletonPanel></div></div><SkeletonPanel><SkeletonText lines={5} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAdminVideos() {
    return <SkeletonRegion label="Loading video tutorials" className="row g-4"><SkeletonVideoCard count={6} /></SkeletonRegion>;
}

export function SkeletonAdminDashboard() {
    return <SkeletonRegion label="Loading dashboard"><SkeletonKpiCards count={4} /><div className="row g-4"><div className="col-12 col-xl-8"><SkeletonPanel><SkeletonChart height={250} /></SkeletonPanel></div><div className="col-12 col-xl-4"><SkeletonPanel><SkeletonList rows={3} /></SkeletonPanel></div></div><SkeletonPanel className="mt-4"><SkeletonTable rows={5} cols={4} /></SkeletonPanel></SkeletonRegion>;
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
    return <SkeletonRegion label="Loading users"><SkeletonKpiCards count={4} /><SkeletonPanel><SkeletonTable rows={8} cols={5} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAdminWalkIns() {
    return <SkeletonRegion label="Loading walk-in customers"><SkeletonKpiCards count={3} /><SkeletonPanel><SkeletonTable rows={8} cols={6} /></SkeletonPanel></SkeletonRegion>;
}

export function SkeletonAdminReports() {
    return <SkeletonRegion label="Loading reports"><SkeletonKpiCards count={4} /><SkeletonPanel><SkeletonTable rows={5} cols={6} /></SkeletonPanel></SkeletonRegion>;
}

/** Wraps real content so it fades in softly when it replaces a skeleton. */
export function Loadable({ loading, skeleton, children, className = "" }) {
    if (loading) return skeleton;
    return <div className={`fm-fade-in ${className}`}>{children}</div>;
}
