import { useEffect, useRef } from "react";

export default function useDialogA11y(open, onClose) {
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return undefined;
        const dialog = dialogRef.current;
        const focusableSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
        const previousFocus = document.activeElement;
        dialog?.querySelector(focusableSelector)?.focus();
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                onCloseRef.current();
                return;
            }
            if (event.key !== "Tab" || !dialog) return;
            const focusable = [...dialog.querySelectorAll(focusableSelector)].filter((element) => !element.disabled);
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
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            previousFocus?.focus?.();
        };
    }, [open]);

    return dialogRef;
}
