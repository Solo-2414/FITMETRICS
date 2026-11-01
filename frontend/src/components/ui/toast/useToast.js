import { createContext, useContext } from "react";
import { getFriendlyError } from "../../../lib/api";

export const ToastContext = createContext(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used inside <ToastProvider>");
    return context;
}

export const toastError = (error) => getFriendlyError(error);
