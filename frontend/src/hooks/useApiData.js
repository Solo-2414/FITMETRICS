import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

/**
 * Keeps a skeleton on screen for at least `minMs` so very fast responses do not flash it for a few milliseconds.
 * Shows the skeleton immediately when loading starts (no blank frame).
 */
export function useMinimumLoading(active, minMs = 300) {
    const [prev, setPrev] = useState(active);
    const [hold, setHold] = useState(active);
    const startedAt = useRef(0); // set in the effect below (Date.now() is impure during render)

    // "Adjust state during render" pattern: loading just (re)started -> keep the skeleton up.
    if (active !== prev) {
        setPrev(active);
        if (active) setHold(true);
    }

    useEffect(() => {
        if (active) startedAt.current = Date.now();
    }, [active]);

    useEffect(() => {
        if (active || !hold) return undefined;
        const remaining = Math.max(0, minMs - (Date.now() - startedAt.current));
        const timer = setTimeout(() => setHold(false), remaining);
        return () => clearTimeout(timer);
    }, [active, hold, minMs]);

    return active || hold;
}

/**
 * Fetch from the backend with api().
 *   const { data, error, showSkeleton, refreshing, reload } = useApiData("/admin/dashboard");
 *   if (showSkeleton) return <SkeletonTable />;
 *
 * - initialLoading: first load (no data yet)      -> show a skeleton
 * - refreshing:     re-fetch with data on screen  -> keep the data, dim it (class "fm-refreshing")
 * Pass `enabled: false` to wait, and change `path` (for example when a filter changes) to refetch.
 */
export function useApiData(path, { enabled = true, minMs = 300 } = {}) {
    const [reloadKey, setReloadKey] = useState(0);
    const requestKey = `${path}|${reloadKey}`;
    const [result, setResult] = useState({ key: null, data: null, error: "" });
    const [lastGood, setLastGood] = useState(null);

    useEffect(() => {
        if (!enabled || !path) return undefined;
        let cancelled = false;
        api(path)
            .then((data) => {
                if (cancelled) return;
                setResult({ key: requestKey, data, error: "" });
                setLastGood(data);
            })
            .catch((err) => {
                if (!cancelled) setResult({ key: requestKey, data: null, error: err.message || "Something went wrong." });
            });
        return () => {
            cancelled = true;
        };
    }, [path, enabled, requestKey]);

    const loading = enabled && result.key !== requestKey;
    const data = result.key === requestKey ? result.data : lastGood; // keep the old data while refetching
    const initialLoading = loading && lastGood === null;
    const showSkeleton = useMinimumLoading(initialLoading, minMs);

    return {
        data,
        error: result.key === requestKey ? result.error : "",
        loading,
        initialLoading,
        showSkeleton,
        refreshing: loading && lastGood !== null,
        reload: () => setReloadKey((k) => k + 1),
    };
}
