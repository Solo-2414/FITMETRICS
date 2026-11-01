/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import styles from "./ConfirmDialog.module.css";

export const ConfirmContext = createContext(null);

export default function ConfirmProvider({ children }) {
    const [request, setRequest] = useState(null);
    const lastFocused = useRef(null);
    const confirm = useCallback((options) => new Promise((resolve) => {
        lastFocused.current = document.activeElement;
        setRequest({ ...options, resolve });
    }), []);
    const close = useCallback((result) => {
        request?.resolve(result);
        setRequest(null);
        window.setTimeout(() => lastFocused.current?.focus?.(), 0);
    }, [request]);

    useEffect(() => {
        if (!request) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") close(false);
            if (event.key !== "Tab") return;
            const focusable = event.currentTarget.querySelectorAll("button");
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        const dialog = document.querySelector(`[aria-labelledby="confirm-title"]`);
        dialog?.querySelector("button")?.focus();
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [request, close]);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {request && (
                <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(false); }}>
                    <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                        <h2 id="confirm-title">{request.title || "Please confirm"}</h2>
                        <p>{request.message}</p>
                        <div className={styles.actions}>
                            <button type="button" onClick={() => close(false)}>Cancel</button>
                            <button type="button" className={request.danger ? styles.danger : ""} onClick={() => close(true)}>{request.confirmLabel || "Confirm"}</button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
