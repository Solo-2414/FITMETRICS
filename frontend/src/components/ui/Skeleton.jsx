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

/** Wraps real content so it fades in softly when it replaces a skeleton. */
export function Loadable({ loading, skeleton, children, className = "" }) {
    if (loading) return skeleton;
    return <div className={`fm-fade-in ${className}`}>{children}</div>;
}
