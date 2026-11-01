import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export const DEFAULT_TERMINAL_PREFERENCES = {
    audioAlerts: true,
    paymentPrompt: true,
    defaultPaymentMethod: "cash",
    defaultLandingPage: "dashboard",
    fastCheckinAutoFocus: true,
    autoClearCheckinSearch: true,
    openingFloat: 0,
};

const STORAGE_PREFIX = "fitmetrics.";
const preferenceKeys = Object.keys(DEFAULT_TERMINAL_PREFERENCES);

const readCache = () => preferenceKeys.reduce((result, key) => {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw === null) return result;
    try { result[key] = typeof DEFAULT_TERMINAL_PREFERENCES[key] === "number" ? Number(raw) : JSON.parse(raw); }
    catch { result[key] = raw; }
    return result;
}, {});

export function useTerminalPreferences() {
    const [preferences, setPreferences] = useState(() => ({ ...DEFAULT_TERMINAL_PREFERENCES, ...readCache() }));
    const [loading, setLoading] = useState(true);

    const save = useCallback(async (next) => {
        setPreferences(next);
        preferenceKeys.forEach((key) => localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(next[key])));
        try {
            const saved = await api("/clerk/settings/preferences", { method: "PATCH", body: next });
            setPreferences({ ...DEFAULT_TERMINAL_PREFERENCES, ...saved });
        } catch (error) {
            window.dispatchEvent(new CustomEvent("fitmetrics:preferences-error", { detail: error.message }));
        }
    }, []);

    useEffect(() => {
        api("/clerk/settings/preferences")
            .then((remote) => {
                const next = { ...DEFAULT_TERMINAL_PREFERENCES, ...remote };
                setPreferences(next);
                preferenceKeys.forEach((key) => localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(next[key])));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const updatePreference = (key, value) => save({ ...preferences, [key]: value });
    const resetPreferences = () => save({ ...DEFAULT_TERMINAL_PREFERENCES });
    return { preferences, loading, updatePreference, resetPreferences };
}

export function playTerminalAlert(enabled) {
    if (!enabled) return;
    try {
        const context = new window.AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.04, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.12);
    } catch { /* Audio is optional and may be blocked by the browser. */ }
}
