import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { ToastContext } from "./useToast";
import toastReducer, { initialToastState } from "./toastReducer";
import styles from "./Toast.module.css";

const iconByType = {
    success: "fa-circle-check",
    error: "fa-circle-exclamation",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
};

function ToastItem({ toast, dismiss }) {
    const timerRef = useRef(null);
    const remainingRef = useRef(toast.duration);
    const startedRef = useRef(0);

    const startTimer = useCallback(() => {
        if (!toast.duration) return;
        startedRef.current = Date.now();
        timerRef.current = window.setTimeout(() => dismiss(toast.id), remainingRef.current);
    }, [dismiss, toast.duration, toast.id]);

    const pauseTimer = useCallback(() => {
        if (!timerRef.current) return;
        window.clearTimeout(timerRef.current);
        remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedRef.current));
        timerRef.current = null;
    }, []);

    useEffect(() => {
        startTimer();
        return () => window.clearTimeout(timerRef.current);
    }, [startTimer]);

    const role = toast.type === "warning" || toast.type === "error" ? "alert" : "status";
    return (
        <div
            className={`${styles.toast} ${styles[toast.type]}`}
            role={role}
            onMouseEnter={pauseTimer}
            onMouseLeave={startTimer}
            onFocus={pauseTimer}
            onBlur={startTimer}
        >
            <span className={styles.icon} aria-hidden="true"><i className={`fa-solid ${iconByType[toast.type]}`} /></span>
            <div className={styles.content}>
                {toast.title && <strong>{toast.title}</strong>}
                <span>{toast.message}</span>
                {toast.action && <button type="button" className={styles.action} onClick={toast.action.onClick}>{toast.action.label}</button>}
            </div>
            <button type="button" className={styles.close} aria-label="Close notification" onClick={() => dismiss(toast.id)}>×</button>
        </div>
    );
}

export default function ToastProvider({ children }) {
    const [state, dispatch] = useReducer(toastReducer, initialToastState);
    const nextIdRef = useRef(0);
    const add = useCallback((type, message, options = {}) => {
        const toast = typeof message === "string" ? { type, message, ...options } : { type, ...message };
        if (!toast.id) toast.id = `toast-${Date.now()}-${nextIdRef.current += 1}`;
        dispatch({ type: "add", toast });
        return toast.id;
    }, []);
    const value = useMemo(() => ({
        success: (message, options) => add("success", message, options),
        error: (message, options) => add("error", message, options),
        warning: (message, options) => add("warning", message, options),
        info: (message, options) => add("info", message, options),
        dismiss: (id) => dispatch({ type: "dismiss", id }),
        clear: () => dispatch({ type: "clear" }),
    }), [add]);

    useEffect(() => {
        const onSystemError = (event) => value.error(event.detail?.message || "Something went wrong on our side. Please try again.");
        window.addEventListener("fitmetrics:system-error", onSystemError);
        return () => window.removeEventListener("fitmetrics:system-error", onSystemError);
    }, [value]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className={styles.container} aria-live="polite" aria-label="Notifications">
                {state.visible.map((toast) => <ToastItem key={toast.id} toast={toast} dismiss={value.dismiss} />)}
            </div>
        </ToastContext.Provider>
    );
}
