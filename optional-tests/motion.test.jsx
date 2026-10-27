// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, render, screen, act, waitFor } from "@testing-library/react";

vi.mock("../src/lib/api", () => ({ api: vi.fn() }));
import { api } from "../src/lib/api";
import { useMinimumLoading, useApiData } from "../src/hooks/useApiData";
import { SkeletonKpiCards, SkeletonTable, SkeletonChart, SkeletonList, SkeletonPage, SkeletonCards, SkeletonForm, SkeletonText, Loadable } from "../src/components/ui/Skeleton";
import { barAnimation, buildBarOptions } from "../src/lib/chartDefaults";

describe("useMinimumLoading", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("shows immediately and keeps the skeleton up for the minimum time when data is fast", () => {
        const { result, rerender } = renderHook(({ a }) => useMinimumLoading(a, 300), { initialProps: { a: true } });
        expect(result.current).toBe(true);                       // immediate, no blank frame
        act(() => { vi.advanceTimersByTime(50); });
        rerender({ a: false });                                  // data arrived after 50ms
        expect(result.current).toBe(true);                       // still held: no flicker
        act(() => { vi.advanceTimersByTime(200); });
        expect(result.current).toBe(true);                       // 250ms < 300ms
        act(() => { vi.advanceTimersByTime(60); });
        expect(result.current).toBe(false);                      // released after 300ms total
    });

    it("hides right away when loading was already long", () => {
        const { result, rerender } = renderHook(({ a }) => useMinimumLoading(a, 300), { initialProps: { a: true } });
        act(() => { vi.advanceTimersByTime(1500); });
        rerender({ a: false });
        act(() => { vi.advanceTimersByTime(1); });
        expect(result.current).toBe(false);
    });

    it("never shows when nothing is loading", () => {
        const { result } = renderHook(() => useMinimumLoading(false, 300));
        expect(result.current).toBe(false);
    });
});

describe("useApiData", () => {
    beforeEach(() => api.mockReset());

    it("loads data, then keeps old data (refreshing) while the path changes", async () => {
        let resolveSecond;
        api.mockImplementationOnce(() => Promise.resolve({ rows: [1, 2] }))
           .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));
        const { result, rerender } = renderHook(({ p }) => useApiData(p, { minMs: 0 }), { initialProps: { p: "/a" } });
        expect(result.current.initialLoading).toBe(true);
        expect(result.current.data).toBe(null);
        await waitFor(() => expect(result.current.data).toEqual({ rows: [1, 2] }));
        expect(result.current.initialLoading).toBe(false);

        rerender({ p: "/a?range=7d" });                          // filter change
        expect(result.current.data).toEqual({ rows: [1, 2] });   // stale data stays on screen
        expect(result.current.refreshing).toBe(true);
        expect(result.current.initialLoading).toBe(false);       // so NO full skeleton on filter change
        await act(async () => { resolveSecond({ rows: [9] }); });
        await waitFor(() => expect(result.current.data).toEqual({ rows: [9] }));
        expect(result.current.refreshing).toBe(false);
    });

    it("reports errors and ignores a response that arrives after unmount", async () => {
        api.mockRejectedValueOnce(new Error("boom"));
        const { result } = renderHook(() => useApiData("/x", { minMs: 0 }));
        await waitFor(() => expect(result.current.error).toBe("boom"));

        let late;
        api.mockImplementationOnce(() => new Promise((r) => { late = r; }));
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { unmount } = renderHook(() => useApiData("/y", { minMs: 0 }));
        unmount();
        await act(async () => { late({ ok: 1 }); });
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it("does not call the API while disabled, and reload() refetches", async () => {
        api.mockResolvedValue({ n: 1 });
        const { result, rerender } = renderHook(({ e }) => useApiData("/z", { enabled: e, minMs: 0 }), { initialProps: { e: false } });
        expect(api).not.toHaveBeenCalled();
        rerender({ e: true });
        await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
        const calls = api.mock.calls.length;
        act(() => result.current.reload());
        await waitFor(() => expect(api.mock.calls.length).toBe(calls + 1));
    });
});

describe("Skeleton components", () => {
    it("render accessible loading regions with the requested counts", () => {
        const { container } = render(<><SkeletonKpiCards count={4} /><SkeletonTable rows={5} cols={4} /><SkeletonChart height={250} bars={10} /><SkeletonList rows={3} /></>);
        expect(container.querySelectorAll('[role="status"][aria-busy="true"]').length).toBe(4);
        expect(container.querySelectorAll(".fm-skel-card").length).toBe(4);
        expect(container.querySelectorAll(".fm-skel-table-row").length).toBe(6);        // 5 rows + header
        expect(container.querySelector(".fm-skel-chart").style.height).toBe("250px");   // same height as the real chart
        expect(container.querySelectorAll(".fm-skel-chart .fm-skel").length).toBe(10);
        expect(container.querySelectorAll(".fm-skel-list-row").length).toBe(3);
        expect(screen.getAllByText(/Loading/i).length).toBeGreaterThan(0);              // screen-reader text
    });

    it("Loadable swaps skeleton for content with the fade-in class", () => {
        const { rerender, container } = render(<Loadable loading skeleton={<div data-testid="sk" />}><p>Real data</p></Loadable>);
        expect(screen.getByTestId("sk")).toBeTruthy();
        rerender(<Loadable loading={false} skeleton={<div data-testid="sk" />}><p>Real data</p></Loadable>);
        expect(screen.queryByTestId("sk")).toBe(null);
        expect(container.querySelector(".fm-fade-in")?.textContent).toBe("Real data");
    });
});

describe("page-level skeletons", () => {
    it("SkeletonPage, cards, form and text render without errors", () => {
        const { container } = render(<><SkeletonPage /><SkeletonCards count={3} /><SkeletonForm fields={4} /><SkeletonText lines={3} /></>);
        expect(container.querySelector('[aria-label], [role="status"]')).toBeTruthy();
        expect(container.querySelectorAll(".fm-skel-card").length).toBeGreaterThanOrEqual(4 + 3);
        expect(container.querySelectorAll(".fm-skel-panel").length).toBeGreaterThanOrEqual(2);
    });
});

describe("chart defaults", () => {
    it("staggers bars only on the first draw, never on later updates", () => {
        const a = barAnimation(10);
        expect(a.delay({ type: "data", mode: "default", dataIndex: 4 })).toBeGreaterThan(0);
        expect(a.delay({ type: "data", mode: "default", dataIndex: 0 })).toBe(0);
        expect(a.delay({ type: "data", mode: "active", dataIndex: 4 })).toBe(0);        // hover is never delayed
        a.onComplete();                                                                  // first draw finished
        expect(a.delay({ type: "data", mode: "default", dataIndex: 4 })).toBe(0);        // updates are instant
    });

    it("each chart keeps its own flag", () => {
        const a = barAnimation(10), b = barAnimation(10);
        a.onComplete();
        expect(b.delay({ type: "data", mode: "default", dataIndex: 3 })).toBeGreaterThan(0);
    });

    it("turns animation off for reduced-motion users", () => {
        window.matchMedia = () => ({ matches: true });
        expect(barAnimation(10)).toBe(false);
        window.matchMedia = undefined;
    });

    it("uses Chart.js 4 option names (border.display, not drawBorder) and keeps the chart responsive", () => {
        const o = buildBarOptions({ count: 8, yMax: 50 });
        expect(o.scales.x.border.display).toBe(false);
        expect(o.scales.y.border.display).toBe(false);
        expect(JSON.stringify(o)).not.toContain("drawBorder");
        expect(o.maintainAspectRatio).toBe(false);
        expect(o.scales.y.max).toBe(50);
        expect(o.plugins.legend.display).toBe(false);
    });
});
