import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Calls your Express backend with the current user's access token.
 *   const members = await api("/users?role=member");
 *   await api("/users", { method: "POST", body: { email, password, ... } });
 */
export async function api(path, { method = "GET", body } = {}) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
}
