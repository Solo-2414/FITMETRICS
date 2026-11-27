import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import styles from "./CheckIn.module.css";
import { SkeletonCheckIn } from "../components/ui/Skeleton";
import { toastError, useToast } from "../components/ui/toast/useToast";

const DEVICE_KEY = "fitmetrics-checkin-device";
const PHONE_KEY = "fitmetrics-checkin-phone";
const getDevice = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(DEVICE_KEY) || "null");
        if (saved?.id) return saved;
    } catch {
        localStorage.removeItem(DEVICE_KEY);
    }
    const value = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    localStorage.setItem(DEVICE_KEY, JSON.stringify(value));
    return value;
};

const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 12);
    if (digits.startsWith("63")) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`.trim();
    return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`.trim() : digits;
};

export default function CheckIn() {
    const [params] = useSearchParams();
    const inputRef = useRef(null);
    const token = params.get("t") || "";
    const [station, setStation] = useState(() => token
        ? { loading: true, valid: false, error: "" }
        : { loading: false, valid: false, error: "This QR code is no longer valid. Ask the front desk for the current code." });
    const [phone, setPhone] = useState(localStorage.getItem(PHONE_KEY) || "");
    const [remember, setRemember] = useState(Boolean(localStorage.getItem(PHONE_KEY)));
    const [step, setStep] = useState("phone");
    const [lookup, setLookup] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [code, setCode] = useState("");
    const toast = useToast();

    useEffect(() => {
        if (!token) {
            return;
        }
        api(`/public/checkin/station?t=${encodeURIComponent(token)}`)
            .then((result) => setStation({ loading: false, ...result, error: result.valid ? "" : "This QR code is no longer valid. Ask the front desk for the current code." }))
            .catch((requestError) => setStation({ loading: false, valid: false, error: requestError.message }));
    }, [token]);

    const validPhone = useMemo(() => /^(?:09\d{9}|9\d{9}|63\d{10})$/.test(phone.replace(/\D/g, "")), [phone]);
    const submitPhone = async (event) => {
        event.preventDefault();
        if (!validPhone) {
            setError("Enter a valid Philippine mobile number.");
            inputRef.current?.focus();
            return;
        }
        setBusy(true);
        setError("");
        try {
            const device = getDevice();
            const result = await api("/public/checkin/lookup", { method: "POST", body: { t: token, phone, device_id: device.id, device_secret: device.secret } });
            if (!["ready", "already_in"].includes(result.status)) {
                toast.error(result.message || "We couldn't find an active membership for this number. Please see the front desk.");
                return;
            }
            if (remember) localStorage.setItem(PHONE_KEY, phone);
            else localStorage.removeItem(PHONE_KEY);
            setLookup(result);
            setStep(result.needs_verification ? "verify" : "confirm");
        } catch (requestError) {
            toast.error(toastError(requestError));
        } finally {
            setBusy(false);
        }
    };
    const sendCode = async () => {
        setBusy(true);
        try {
            const result = await api("/public/checkin/send-code", { method: "POST", body: { t: token, phone, confirm_token: lookup.confirm_token } });
            if (result.status === "needs_clerk") throw new Error(result.message);
            setStep("verify");
        } catch (requestError) {
            toast.error(toastError(requestError));
        } finally {
            setBusy(false);
        }
    };
    const verifyCode = async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
            const device = getDevice();
            const result = await api("/public/checkin/verify-code", { method: "POST", body: { t: token, phone, code, device_id: device.id, confirm_token: lookup.confirm_token } });
            localStorage.setItem(DEVICE_KEY, JSON.stringify({ ...device, secret: result.device_secret }));
            setLookup({ ...lookup, confirm_token: result.confirm_token, needs_verification: false });
            setStep("confirm");
        } catch (requestError) {
            toast.error(toastError(requestError));
        } finally {
            setBusy(false);
        }
    };
    const confirm = async () => {
        setBusy(true);
        try {
            const result = await api("/public/checkin/confirm", { method: "POST", body: { confirm_token: lookup.confirm_token, device_id: getDevice().id } });
            setLookup({ ...lookup, ...result });
            setStep("done");
        } catch (requestError) {
            toast.error(toastError(requestError));
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className={styles.page}>
            <section className={styles.card} aria-live="polite">
                <img src="/logo-no-bg.png" alt="Analyn's Fitness Gym" className={styles.logo} />
                <p className={styles.eyebrow}>{station.gym_name || "Analyn's Fitness Gym"}</p>
                {station.loading && <SkeletonCheckIn />}
                {!station.loading && !station.valid && <div className={styles.error}>{station.error}</div>}
                {!station.loading && station.valid && station.phone_checkin_enabled === false && <div className={styles.error}>Phone check-in is temporarily unavailable. Please see the front desk.</div>}
                {!station.loading && station.valid && station.phone_checkin_enabled !== false && step === "phone" && (
                    <form onSubmit={submitPhone}>
                        <h1>Check in</h1>
                        <p className={styles.muted}>Enter your mobile number to continue.</p>
                        <label htmlFor="mobile">Mobile number</label>
                        <input id="mobile" ref={inputRef} inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" value={formatPhone(phone)} onChange={(event) => setPhone(event.target.value)} />
                        <label className={styles.check}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember this number on this phone</label>
                        {error && <div className={styles.error} data-field-error="Philippine mobile number validation">{error}</div>}
                        <button disabled={busy} type="submit">{busy ? "Checking..." : "Continue"}</button>
                    </form>
                )}
                {step === "confirm" && lookup && (
                    <div>
                        <h1>Hi {lookup.display_name}!</h1>
                        <p className={styles.muted}>{lookup.plan_name}<br />Valid until {lookup.valid_until}</p>
                        <button disabled={busy} onClick={confirm}>{busy ? "Saving..." : lookup.action === "check_out" ? "Check out" : "Check in"}</button>
                        <button className={styles.link} onClick={() => { setStep("phone"); setLookup(null); }}>Not you?</button>
                    </div>
                )}
                {step === "verify" && lookup && (
                    <div>
                        <h1>Verify your phone</h1>
                        <p className={styles.muted}>We sent a 6-digit code to {lookup.masked_email || "your email on file"}.</p>
                        <form onSubmit={verifyCode}>
                            <label htmlFor="checkin-code">Email code</label>
                            <input id="checkin-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
                            <button disabled={busy || code.length !== 6} type="submit">{busy ? "Verifying..." : "Verify code"}</button>
                        </form>
                        <button className={styles.link} disabled={busy} onClick={sendCode}>Email me a code</button>
                    </div>
                )}
                {step === "done" && lookup && (
                    <div className={styles.done}>
                        <div className={styles.successIcon}>✓</div>
                        <h1>{lookup.status === "checked_out" ? "Checked out" : "You're checked in"}</h1>
                        <p className={styles.muted}>{lookup.status === "checked_out" ? `Duration: ${lookup.duration_minutes} minutes` : "Enjoy your workout!"}</p>
                    </div>
                )}
            </section>
        </main>
    );
}
