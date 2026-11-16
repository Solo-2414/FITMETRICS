import { useEffect, useRef } from "react";
import styles from "../../pages/clerk/ClerkMemberRegistration.module.css";

export default function ClerkModal({ title, icon, children, footer, onClose, labelledBy }) {
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const returnFocusRef = useRef(document.activeElement);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const returnFocus = returnFocusRef.current;
        document.body.style.overflow = "hidden";
        panelRef.current?.focus();
        const onKeyDown = (event) => {
            if (event.key === "Escape") onCloseRef.current();
            if (event.key !== "Tab" || !panelRef.current) return;
            const focusable = panelRef.current.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); returnFocus?.focus?.(); };
    }, []);
    return <div className={`modal d-block ${styles.registrationModalOverlay}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered" onClick={(event) => event.stopPropagation()}>
            <div className={`modal-content ${styles.registrationModalPanel}`} ref={panelRef} tabIndex={-1}>
                <div className={styles.registrationModalHeader}><h2 className="modal-title fs-5" id={labelledBy}><i className={`fa-solid ${icon} text-primary me-2`}></i>{title}</h2><button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onClose}></button></div>
                <div className={styles.registrationModalBody}>{children}</div>
                {footer && <div className={styles.registrationModalFooter}>{footer}</div>}
            </div>
        </div>
    </div>;
}
