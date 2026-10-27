import {
    Chart as ChartJS, CategoryScale, LinearScale, BarController, LineController, DoughnutController,
    BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";

ChartJS.register(
    CategoryScale, LinearScale, BarController, LineController, DoughnutController,
    BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler,
);

export const CHART_COLORS = {
    primary: "#38bdf8", warn: "#f59e0b", green: "#10b981", danger: "#f87171",
    text: "#94a3b8", grid: "rgba(51, 65, 85, 0.45)", tooltipBg: "#1e293b", tooltipBorder: "#334155",
};

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Bars rise from the baseline one after another on FIRST draw only.
 * Later updates (range change) morph quickly with no stagger. Each call keeps its own "already played" flag,
 * so build the options ONCE per chart (useMemo), not on every render.
 */
export function barAnimation(count = 12) {
    if (prefersReducedMotion()) return false;
    let played = false;
    const step = Math.min(45, 450 / Math.max(count, 1));
    return {
        duration: 650,
        easing: "easeOutQuart",
        onComplete: () => { played = true; },
        delay: (ctx) => (ctx.type === "data" && ctx.mode === "default" && !played ? ctx.dataIndex * step : 0),
    };
}

/** Shared dark-theme options for bar charts. */
export function buildBarOptions({ count = 12, yMax, yTicks, stacked = false, tooltipLabel } = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: barAnimation(count),
        interaction: { mode: "index", intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: CHART_COLORS.tooltipBg,
                titleColor: "#f8fafc",
                bodyColor: CHART_COLORS.text,
                borderColor: CHART_COLORS.tooltipBorder,
                borderWidth: 1,
                padding: 10,
                ...(tooltipLabel ? { callbacks: { label: tooltipLabel } } : {}),
            },
        },
        scales: {
            x: {
                stacked,
                grid: { display: false },
                border: { display: false }, // Chart.js 4 (drawBorder:false only worked in v3)
                ticks: { color: CHART_COLORS.text, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 8 },
            },
            y: {
                stacked,
                beginAtZero: true,
                grace: "8%",
                ...(yMax ? { max: yMax } : {}),
                grid: { color: CHART_COLORS.grid },
                border: { display: false },
                ticks: { color: CHART_COLORS.text, font: { size: 10 }, precision: 0, ...(yTicks ? { callback: yTicks } : {}) },
            },
        },
    };
}
