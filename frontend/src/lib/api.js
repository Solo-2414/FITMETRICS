import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function api(path, { method = "GET", body } = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const isFormData = body instanceof FormData;
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 503 && json.maintenance) {
            window.dispatchEvent(new CustomEvent("fitmetrics:maintenance", { detail: json }));
        }
        const error = new Error(json.error || json.message || `Request failed (${res.status})`);
        error.maintenance = json.maintenance === true;
        throw error;
    }
    return json;
}

export async function downloadApi(path, { method = "GET", body } = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Request failed (${res.status})`);
    }
    return res.blob();
}
