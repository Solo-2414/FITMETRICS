import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
    throw new Error(
        "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend/.env",
    );
}

// Fixed key so we always know which entry holds the session. Using a new key
// also ignores any old session left in localStorage from earlier runs.
const STORAGE_KEY = "fitmetrics-auth";

// false = tab-only (sessionStorage), true = survives browser restarts.
// Defaults to tab-only; signIn() switches it on for members only.
let persistent = false;

const authStorage = {
    getItem: (key) =>
        window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key),
    setItem: (key, value) => {
        // Token refreshes must stay where the session already lives.
        const inSession = window.sessionStorage.getItem(key) !== null;
        const inLocal = window.localStorage.getItem(key) !== null;
        const useLocal = inSession ? false : inLocal ? true : persistent;
        (useLocal ? window.localStorage : window.sessionStorage).setItem(key, value);
    },
    removeItem: (key) => {
        window.sessionStorage.removeItem(key);
        window.localStorage.removeItem(key);
    },
};

/** Call right before storing a new session: true for members, false for staff. */
export function setSessionPersistence(shouldPersist) {
    persistent = shouldPersist;
    authStorage.removeItem(STORAGE_KEY); // clear any previous user's copy
}

/** True when the current session is stored in the long-lived localStorage. */
export const isSessionPersisted = () =>
    window.localStorage.getItem(STORAGE_KEY) !== null;

export const supabase = createClient(url, anonKey, {
    auth: {
        storage: authStorage,
        storageKey: STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
    },
});

export async function hasAdminPasskey() {
    const { data, error } = await supabase.auth.getClaims();
    if (error) throw error;
    const claims = data?.claims;
    return Array.isArray(claims?.amr)
        && claims.amr.some((entry) =>
            entry === "passkey" || entry?.method === "passkey",
        );
}