/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { playTerminalAlert, useTerminalPreferences } from "../hooks/useTerminalPreferences";

const ClerkDataContext = createContext(null);

function usePoller(loader, interval = 30000) {
    const [value, setValue] = useState(null);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const reload = useCallback(async (background = false) => {
        if (!navigator.onLine) return;
        if (background) setRefreshing(true);
        else setError("");
        try {
            const next = await loader();
            setValue(next);
            setLastUpdated(new Date());
            setError("");
            return next;
        } catch (loadError) {
            setError(loadError.message);
            throw loadError;
        } finally {
            setRefreshing(false);
        }
    }, [loader]);

    useEffect(() => {
        reload().catch(() => {});
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible" && navigator.onLine) reload(true).catch(() => {});
        }, interval);
        return () => window.clearInterval(timer);
    }, [interval, reload]);

    return { value, error, refreshing, lastUpdated, reload };
}

export function ClerkDataProvider({ children }) {
    const preferencesState = useTerminalPreferences();
    const { preferences } = preferencesState;
    const dashboardPoller = usePoller(useCallback(() => api("/clerk/dashboard"), []));
    const notificationPoller = usePoller(useCallback(() => api("/clerk/notifications/summary?limit=5"), []));
    const cashDrawerPoller = usePoller(useCallback(() => api("/clerk/cash-drawer/today"), []));
    const reloadNotifications = notificationPoller.reload;
    const previousUnread = useRef(0);
    const loadedNotifications = useRef(false);

    useEffect(() => {
        const unread = notificationPoller.value?.unread;
        if (typeof unread !== "number") return;
        if (loadedNotifications.current && unread > previousUnread.current) {
            playTerminalAlert(preferences.audioAlerts);
        }
        loadedNotifications.current = true;
        previousUnread.current = unread;
    }, [notificationPoller.value, preferences.audioAlerts]);

    useEffect(() => {
        const handleChanged = () => reloadNotifications(true).catch(() => {});
        window.addEventListener("fitmetrics:notifications-changed", handleChanged);
        window.addEventListener("fitmetrics:attendance-changed", handleChanged);
        return () => {
            window.removeEventListener("fitmetrics:notifications-changed", handleChanged);
            window.removeEventListener("fitmetrics:attendance-changed", handleChanged);
        };
    }, [reloadNotifications]);

    const value = useMemo(() => ({
        preferences: preferencesState,
        dashboard: dashboardPoller.value,
        dashboardError: dashboardPoller.error,
        dashboardRefreshing: dashboardPoller.refreshing,
        dashboardLastUpdated: dashboardPoller.lastUpdated,
        reloadDashboard: dashboardPoller.reload,
        notificationSummary: notificationPoller.value,
        notificationError: notificationPoller.error,
        reloadNotifications: notificationPoller.reload,
        cashDrawer: cashDrawerPoller.value,
        cashDrawerError: cashDrawerPoller.error,
        reloadCashDrawer: cashDrawerPoller.reload,
    }), [cashDrawerPoller.error, cashDrawerPoller.reload, cashDrawerPoller.value, dashboardPoller.error, dashboardPoller.lastUpdated, dashboardPoller.refreshing, dashboardPoller.reload, dashboardPoller.value, notificationPoller.error, notificationPoller.reload, notificationPoller.value, preferencesState]);

    return <ClerkDataContext.Provider value={value}>{children}</ClerkDataContext.Provider>;
}

export function useClerkData() {
    const context = useContext(ClerkDataContext);
    if (!context) throw new Error("useClerkData must be used inside ClerkDataProvider");
    return context;
}
