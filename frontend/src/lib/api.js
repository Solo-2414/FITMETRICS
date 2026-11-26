import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function getFriendlyError(error) {
    if (typeof error === "string") return error;
    const status = error?.status;
    if (!status || error?.name === "TypeError" || error?.message === "Failed to fetch") {
        return "Can't reach the server. Check your connection and try again.";
    }
    if (error?.code === "AI_BUSY") {
        const retryAfter = Number(error.retryAfter);
        return Number.isSafeInteger(retryAfter) && retryAfter > 0
            ? `The AI assistant is busy. Please retry in ${retryAfter} seconds.`
            : "The AI assistant is busy. Please try again shortly.";
    }
    if (error?.code === "AI_RATE_LIMITED") {
        const retryAfter = Number(error.retryAfter);
        return Number.isSafeInteger(retryAfter) && retryAfter > 0
            ? `The AI request limit has been reached. Please retry in ${retryAfter} seconds.`
            : "The AI request limit has been reached. Please try again later.";
    }
    if (error?.code === "AI_DISABLED" || error?.code === "AI_NOT_CONFIGURED") {
        return error.message || "The AI assistant is not available right now.";
    }
    if (status === 401) return "Your session expired. Please sign in again.";
    if (status === 403) return "You don't have permission to do that.";
    if (status === 404) return "We couldn't find that record.";
    if (status === 409) return error.message || "That request conflicts with existing data.";
    if (status === 422) {
        return error.message || error.errors?.[0]?.message || "Please check the information you entered.";
    }
    if (status === 429) return "Too many attempts. Please wait a moment.";
    if (status >= 500) return "Something went wrong on our side. Please try again.";
    return error.message || "Something went wrong. Please try again.";
}

export async function api(path, { method = "GET", body, signal } = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const isFormData = body instanceof FormData;
    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
        signal,
        });
    } catch (error) {
        window.dispatchEvent(new CustomEvent("fitmetrics:system-error", {
            detail: { message: "Can't reach the server. Check your connection and try again." },
        }));
        throw error;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 503 && json.maintenance) {
            window.dispatchEvent(new CustomEvent("fitmetrics:maintenance", { detail: json }));
        }
        const error = new Error(json.error || json.message || `Request failed (${res.status})`);
        error.status = res.status;
        error.code = json.code;
        error.requestId = json.requestId;
        error.field = json.field;
        error.errors = json.errors;
        error.member = json.member;
        error.member_match = json.member_match;
        error.returning = json.returning;
        error.staff = json.staff === true;
        error.matches = json.matches;
        error.payment = json.payment;
        error.expires_at = json.expires_at;
        error.maintenance = json.maintenance === true;
        const retryAfter = Number(json.retryAfter || res.headers.get("Retry-After"));
        if (Number.isSafeInteger(retryAfter) && retryAfter > 0) error.retryAfter = retryAfter;
        if (Number.isSafeInteger(json.remainingQuota)) error.remainingQuota = json.remainingQuota;
        throw error;
    }
    return json;
}

export const requestPasswordResetOtp = (email) =>
    api("/auth/password-reset/request", { method: "POST", body: { email } });

export const verifyPasswordResetOtp = (email, code) =>
    api("/auth/password-reset/verify", { method: "POST", body: { email, code } });

export const confirmPasswordReset = (email, resetToken, newPassword) =>
    api("/auth/password-reset/confirm", {
        method: "POST",
        body: { email, resetToken, newPassword },
    });

export async function apiText(path) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${API_URL}${path}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (!res.ok) {
        const text = await res.text();
        const error = new Error(text || `Request failed (${res.status})`);
        error.status = res.status;
        throw error;
    }
    return res.text();
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
    const disposition = res.headers.get("Content-Disposition") || "";
    const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plainFilename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
    const filename = encodedFilename ? decodeURIComponent(encodedFilename) : plainFilename || null;
    return { blob: await res.blob(), filename };
}
