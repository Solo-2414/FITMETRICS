import { useEffect, useRef, useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import styles from "./ClerkSettings.module.css";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { SkeletonForm } from "../../components/ui/Skeleton";

export default function ClerkSettings() {
    const { profile, refreshProfile } = useAuth();
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(true);
    const [phone, setPhone] = useState("");
    const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
    const [preferences, setPreferences] = useState(() => ({
        audioAlerts: localStorage.getItem("fitmetrics.audioAlerts") !== "false",
        paymentPrompt: localStorage.getItem("fitmetrics.paymentPrompt") !== "false",
    }));
    const fileInput = useRef(null);
    useEffect(() => {
        api("/clerk/settings").then(setSettings).catch((err) => setError(err.message)).finally(() => setLoading(false));
    }, []);
    useEffect(() => { setPhone(profile?.phone || ""); }, [profile?.phone]);
    const names = (profile?.full_name || "").trim().split(/\s+/);
    const firstName = names.shift() || "";
    const lastName = names.join(" ");
    const initials = (profile?.full_name || "Clerk").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const savePhone = async () => {
        try { await api("/me", { method: "PATCH", body: { phone } }); await refreshProfile(); setSuccess("Profile updated."); setError(""); } catch (err) { setError(err.message); setSuccess(""); }
    };
    const updatePassword = async () => {
        if (passwords.next !== passwords.confirm) { setError("New passwords do not match."); return; }
        try { await api("/me/password", { method: "POST", body: { current_password: passwords.current, new_password: passwords.next } }); setPasswords({ current: "", next: "", confirm: "" }); setSuccess("Password updated."); setError(""); } catch (err) { setError(err.message); setSuccess(""); }
    };
    const uploadAvatar = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Choose a JPG or PNG image under 5MB."); return; }
        const body = new FormData(); body.append("avatar", file);
        try { await api("/me/avatar", { method: "POST", body }); await refreshProfile(); setSuccess("Profile photo updated."); setError(""); } catch (err) { setError(err.message); setSuccess(""); }
    };
    const removeAvatar = async () => {
        try { await api("/me/avatar", { method: "DELETE" }); await refreshProfile(); setSuccess("Profile photo removed."); setError(""); } catch (err) { setError(err.message); setSuccess(""); }
    };
    const setPreference = (key, value) => { setPreferences((current) => ({ ...current, [key]: value })); localStorage.setItem(`fitmetrics.${key}`, String(value)); };
    if (loading) {
        return <ClerkLayout>
            <h1 className={styles.pageTitle}>Account Settings</h1>
            <p className={styles.pageDesc}>Manage your staff profile, security credentials, and terminal preferences</p>
            <SkeletonForm fields={6} />
        </ClerkLayout>;
    }
    return (
        <ClerkLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Account Settings</h1>
                    <p className={styles.pageDesc}>
                        Manage your staff profile, security credentials, and
                        terminal preferences
                    </p>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
                <div
                    className="row g-4 mb-5"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className="col-12 col-xl-8 d-flex flex-column gap-4">
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex align-items-center gap-3">
                                    <div className={styles.iconBoxPrimary}>
                                        <i className="fa-regular fa-id-badge"></i>
                                    </div>
                                    <div>
                                        <h3 className={styles.cardTitle}>
                                            Personal Information
                                        </h3>
                                        <p className={styles.cardDesc}>
                                            Update your contact details
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className="row g-3 mb-3">
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInputDisabled}
                                            value={firstName}
                                            disabled
                                        />
                                        <span className={styles.helperText}>
                                            Name changes require admin approval
                                        </span>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInputDisabled}
                                            value={lastName}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Staff Email Address
                                    </label>
                                    <div className={styles.inputGroup}>
                                        <input
                                            type="email"
                                            className={styles.formInputDisabled}
                                            value={profile?.email || ""}
                                            disabled
                                        />
                                        <i className="fa-regular fa-envelope"></i>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Contact Phone
                                    </label>
                                    <div className={styles.inputGroup}>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            value={phone}
                                            onChange={(event) => setPhone(event.target.value)}
                                        />
                                        <i className="fa-solid fa-phone"></i>
                                    </div>
                                    <button type="button" className={styles.btnSave} onClick={savePhone}>Save Contact Phone</button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex align-items-center gap-3">
                                    <div className={styles.iconBoxWarning}>
                                        <i className="fa-solid fa-lock"></i>
                                    </div>
                                    <div>
                                        <h3 className={styles.cardTitle}>
                                            Security & Password
                                        </h3>
                                        <p className={styles.cardDesc}>
                                            Ensure your account remains secure
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className="mb-4">
                                    <label className={styles.formLabel}>
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        className={styles.formInput}
                                        placeholder="Enter current password"
                                        value={passwords.current}
                                        onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))}
                                    />
                                </div>
                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            className={styles.formInput}
                                            placeholder="Enter new password"
                                            value={passwords.next}
                                            onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            className={styles.formInput}
                                            placeholder="Confirm new password"
                                            value={passwords.confirm}
                                            onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={styles.btnOutlineWarning}
                                    onClick={updatePassword}
                                >
                                    <i className="fa-solid fa-shield-halved"></i>{" "}
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className={styles.panelLabel}>
                                        PROFILE PICTURE
                                    </span>
                                </div>
                                <h3 className={styles.cardTitle}>
                                    Staff Avatar
                                </h3>
                            </div>

                            <div className={styles.cardBody}>
                                <div className="d-flex flex-column align-items-center justify-content-center py-2">
                                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="Clerk Avatar" className={styles.largeAvatar} /> : <div className={styles.largeAvatar}>{initials}</div>}
                                    <h4
                                        className="mt-3 mb-1 text-white"
                                        style={{
                                            fontFamily: "var(--heading-font)",
                                            fontSize: "1.1rem",
                                            fontWeight: "700",
                                        }}
                                    >
                                        {profile?.full_name || "Clerk"}
                                    </h4>
                                    <span className={styles.roleBadge}>
                                        Front Desk Staff
                                    </span>
                                    <p
                                        className="text-secondary mb-4 mt-2"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        Max file size: 5MB (JPG, PNG)
                                    </p>

                                    <div className="d-flex gap-2 w-100">
                                        <input ref={fileInput} type="file" accept="image/jpeg,image/png" onChange={uploadAvatar} hidden />
                                        <button
                                            type="button"
                                            className={`${styles.btnOutlinePrimary} flex-grow-1`}
                                            onClick={() => fileInput.current?.click()}
                                        >
                                            <i className="fa-solid fa-camera"></i>{" "}
                                            Change Photo
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.btnOutlineDanger}
                                            onClick={removeAvatar}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex align-items-center gap-3">
                                    <div className={styles.iconBoxSuccess}>
                                        <i className="fa-solid fa-sliders"></i>
                                    </div>
                                    <div>
                                        <h3 className={styles.cardTitle}>
                                            Terminal Preferences
                                        </h3>
                                        <p className={styles.cardDesc}>
                                            Local browser settings
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <span
                                            className="d-block text-white fw-bold mb-1"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Audio Alerts
                                        </span>
                                        <span
                                            className="text-secondary"
                                            style={{
                                                fontSize: "0.75rem",
                                                lineHeight: "1.3",
                                                display: "block",
                                                maxWidth: "200px",
                                            }}
                                        >
                                            Play sound on new QR scan check-ins
                                        </span>
                                    </div>
                                    <label className={styles.toggleSwitch}>
                                        <input type="checkbox" checked={preferences.audioAlerts} onChange={(event) => setPreference("audioAlerts", event.target.checked)} />
                                        <span
                                            className={styles.toggleSlider}
                                        ></span>
                                    </label>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <span
                                            className="d-block text-white fw-bold mb-1"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Payment Confirmations
                                        </span>
                                        <span
                                            className="text-secondary"
                                            style={{
                                                fontSize: "0.75rem",
                                                lineHeight: "1.3",
                                                display: "block",
                                                maxWidth: "200px",
                                            }}
                                        >
                                            Show double-check prompt before
                                            completing transactions
                                        </span>
                                    </div>
                                    <label className={styles.toggleSwitch}>
                                        <input type="checkbox" checked={preferences.paymentPrompt} onChange={(event) => setPreference("paymentPrompt", event.target.checked)} />
                                        <span
                                            className={styles.toggleSlider}
                                        ></span>
                                    </label>
                                </div>

                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <span
                                            className="d-block text-white fw-bold mb-1"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Shift Summary Emails
                                        </span>
                                        <span
                                            className="text-secondary"
                                            style={{
                                                fontSize: "0.75rem",
                                                lineHeight: "1.3",
                                                display: "block",
                                                maxWidth: "200px",
                                            }}
                                        >
                                            Coming soon
                                        </span>
                                    </div>
                                    <label className={styles.toggleSwitch}>
                                        <input type="checkbox" disabled />
                                        <span
                                            className={styles.toggleSlider}
                                        ></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={`${styles.actionBar} d-flex justify-content-end gap-3 p-3 mt-4 bg-dark border border-secondary rounded`}
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <button type="button" className={styles.btnCancel}>
                        Cancel
                    </button>
                    <button type="button" className={styles.btnSave} onClick={savePhone}>
                        <i className="fa-regular fa-circle-check"></i> Save
                        Changes
                    </button>
                </div>
            </form>
        </ClerkLayout>
    );
}
