import { useEffect, useRef, useState } from "react";
import styles from "./AdminSettings.module.css";
import { api, downloadApi } from "../../lib/api";
import { SkeletonAdminSettings } from "../../components/ui/Skeleton";
import InlineError from "../../components/ui/InlineError";
import { useToast } from "../../components/ui/toast/useToast";
import { useConfirm } from "../../components/ui/toast/useConfirm";

export default function AdminSettings() {
    const toast = useToast();
    const confirm = useConfirm();
    const formRef = useRef(null);
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [systemInfo, setSystemInfo] = useState(null);
    const [backups, setBackups] = useState([]);
    const [dirty, setDirty] = useState(false);
    const toManilaInput = (value) => value ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Manila", dateStyle: "short", timeStyle: "short" }).format(new Date(value)).replace(" ", "T") : "";
    const focusTimeField = (message) => {
        const field = message.startsWith("Sunday")
            ? formRef.current?.querySelector('[name="sunday_open"]')
            : message.startsWith("Monday")
                ? formRef.current?.querySelector('[name="monday_saturday_open"]')
                : null;
        field?.focus();
    };
    useEffect(() => {
        api("/admin/settings")
            .then(setSettings)
            .catch((err) => setError(err.message));
        Promise.allSettled([api("/admin/system-info"), api("/admin/maintenance/backups")])
            .then(([infoResult, historyResult]) => {
                if (infoResult.status === "fulfilled") setSystemInfo(infoResult.value);
                if (historyResult.status === "fulfilled") setBackups(historyResult.value);
            });
    }, []);
    useEffect(() => {
        const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    const save = async (event) => {
        event.preventDefault();
        setSaving(true); setError("");
        const form = new FormData(formRef.current);
        const data = Object.fromEntries(form.entries());
        if (form.has("maintenance_enabled") && !settings.maintenance_enabled && !await confirm({ title: "Enable maintenance mode?", message: "Members will be locked out while maintenance mode is enabled.", danger: true })) {
            setSaving(false);
            return;
        }
        try {
            const result = await api("/admin/settings", { method: "PATCH", body: {
                ...data,
                expiry_reminder_days: Number(data.expiry_reminder_days),
                payment_modes: form.getAll("payment_modes"),
                maintenance_enabled: form.has("maintenance_enabled"),
                allow_member_registrations: form.has("allow_member_registrations"),
                show_live_capacity: form.has("show_live_capacity"),
                maintenance_starts_at: data.maintenance_starts_at ? new Date(`${data.maintenance_starts_at}:00+08:00`).toISOString() : null,
            }});
            setSettings(result); setDirty(false); toast.success("Settings saved.");
        } catch (err) {
            setError(err.message);
            focusTimeField(err.message);
        } finally { setSaving(false); }
    };
    const downloadExport = async () => {
        try {
            const { blob, filename } = await downloadApi("/admin/maintenance/backups", { method: "POST" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || `fitmetrics-data-export-${new Date().toISOString().slice(0, 10)}.zip`;
            link.click();
            URL.revokeObjectURL(url);
            const [info, history] = await Promise.all([api("/admin/system-info"), api("/admin/maintenance/backups")]);
            setSystemInfo(info);
            setBackups(history);
        } catch (err) { setError(err.message); }
    };
    return (
        <>
            {error && <InlineError error={error} />}
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Settings & Maintenance</h1>
                    <p className={styles.pageDesc}>
                        Manage gym business information, operating hours,
                        configurations, and system backups
                    </p>
                </div>
                <div className="d-flex gap-3">
                    <button type="button" className={styles.btnSecondary} onClick={() => { formRef.current?.reset(); setDirty(false); }}>
                        <i className="fa-solid fa-rotate-left"></i> Discard
                        Changes
                    </button>
                    <button type="submit" form="settings-form" className={styles.btnPrimary} disabled={saving}>
                        <i className="fa-solid fa-floppy-disk"></i>                         {saving ? "Saving..." : "Save"}
                        Settings
                    </button>
                </div>
            </div>

            {!settings ? <SkeletonAdminSettings styles={styles} /> : <form id="settings-form" ref={formRef} onChange={() => setDirty(true)} onSubmit={save} key={settings.updated_at || "settings-loaded"}>
                <div
                    className="row g-4 mb-5"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex align-items-center gap-3">
                                    <div className={styles.iconBoxPrimary}>
                                        <i className="fa-solid fa-store"></i>
                                    </div>
                                    <div>
                                        <h3 className={styles.cardTitle}>
                                            Business Details
                                        </h3>
                                        <p className={styles.cardDesc}>
                                            Core facility identity & contact
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Gym Name
                                    </label>
                                    <div className={styles.inputGroup}>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            name="gym_name"
                                            defaultValue={settings?.gym_name || ""}
                                        />
                                        <i className="fa-solid fa-id-badge"></i>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Branch Address
                                    </label>
                                    <div className={styles.inputGroup}>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            name="address"
                                            defaultValue={settings?.address || ""}
                                        />
                                        <i className="fa-solid fa-location-dot"></i>
                                    </div>
                                    <span className={styles.helperText}>
                                        Main gym floor & functional training
                                        deck
                                    </span>
                                </div>
                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Contact Phone
                                    </label>
                                    <div className={styles.inputGroup}>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            name="phone"
                                            defaultValue={settings?.phone || ""}
                                        />
                                        <i className="fa-solid fa-phone"></i>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Contact Email
                                    </label>
                                    <div className={styles.inputGroup}>
                                        <input
                                            type="email"
                                            className={styles.formInput}
                                            name="email"
                                            defaultValue={settings?.email || ""}
                                        />
                                        <i className="fa-regular fa-envelope"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex align-items-center gap-3">
                                    <div className={styles.iconBoxPrimary}>
                                        <i className="fa-regular fa-clock"></i>
                                    </div>
                                    <div>
                                        <h3 className={styles.cardTitle}>
                                            Operating Hours
                                        </h3>
                                        <p className={styles.cardDesc}>
                                            Schedule visible to all members
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className="mb-4">
                                    <label className={styles.formLabel}>
                                        Monday to Saturday
                                    </label>
                                    <div className="d-flex align-items-center gap-2">
                                        <input
                                            type="time"
                                            className={styles.formInput}
                                            name="monday_saturday_open"
                                            defaultValue={settings?.monday_saturday_open || ""}
                                        />
                                        <span className="text-secondary">
                                            to
                                        </span>
                                        <input
                                            type="time"
                                            className={styles.formInput}
                                            name="monday_saturday_close"
                                            defaultValue={settings?.monday_saturday_close || ""}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={styles.formLabel}>
                                        Sunday
                                    </label>
                                    <div className="d-flex align-items-center gap-2">
                                        <input
                                            type="time"
                                            className={styles.formInput}
                                            name="sunday_open"
                                            defaultValue={settings?.sunday_open || ""}
                                        />
                                        <span className="text-secondary">
                                            to
                                        </span>
                                        <input
                                            type="time"
                                            className={styles.formInput}
                                            name="sunday_close"
                                            defaultValue={settings?.sunday_close || ""}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex align-items-center gap-3">
                                    <div className={styles.iconBoxSuccess}>
                                        <i className="fa-solid fa-desktop"></i>
                                    </div>
                                    <div>
                                        <h3 className={styles.cardTitle}>
                                            Front Desk & Portals
                                        </h3>
                                        <p className={styles.cardDesc}>
                                            Daily operations & member access
                                            rules
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className="mb-4">
                                    <label className={styles.formLabel}>
                                        Default Expiration Reminder
                                    </label>
                                    <select
                                        className={styles.formSelect}
                                        name="expiry_reminder_days"
                                        defaultValue={settings?.expiry_reminder_days || 3}
                                    >
                                        <option value="1">
                                            1 day before expiration
                                        </option>
                                        <option value="3">
                                            3 days before expiration
                                        </option>
                                        <option value="7">
                                            7 days before expiration
                                        </option>
                                    </select>
                                    <span className={styles.helperText}>
                                        Triggers auto-badge alerts on the Front
                                        Desk roster
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <label className={styles.formLabel}>
                                        Preferred Payment Modes
                                    </label>
                                    <div className={styles.checkboxGroup}>
                                        <label className={styles.checkboxLabel}>
                                            <div className="d-flex align-items-center gap-2">
                                                <i className="fa-solid fa-money-bill text-success"></i>{" "}
                                                Cash
                                            </div>
                                            <input
                                                type="checkbox"
                                                name="payment_modes"
                                                value="cash"
                                                defaultChecked={settings?.payment_modes?.includes("cash") ?? true}
                                                className={
                                                    styles.customCheckbox
                                                }
                                            />
                                        </label>
                                        <label className={styles.checkboxLabel}>
                                            <div className="d-flex align-items-center gap-2">
                                                <i className="fa-solid fa-mobile-screen text-primary"></i>{" "}
                                                GCash (Direct QR Scan)
                                            </div>
                                            <input
                                                type="checkbox"
                                                name="payment_modes"
                                                value="gcash"
                                                defaultChecked={settings?.payment_modes?.includes("gcash") ?? true}
                                                className={
                                                    styles.customCheckbox
                                                }
                                            />
                                        </label>
                                        <label className={styles.checkboxLabel}>
                                            <div className="d-flex align-items-center gap-2">
                                                <i className="fa-solid fa-mobile-button text-warning"></i>{" "}
                                                Maya (Direct QR Scan)
                                            </div>
                                            <input
                                                type="checkbox"
                                                name="payment_modes"
                                                value="maya"
                                                defaultChecked={settings?.payment_modes?.includes("maya") ?? true}
                                                className={
                                                    styles.customCheckbox
                                                }
                                            />
                                        </label>
                                        <label className={styles.checkboxLabel}>
                                            <div className="d-flex align-items-center gap-2">
                                                <i className="fa-solid fa-qrcode text-info"></i>{" "}
                                                QR Ph (GCash, Maya, bank apps)
                                            </div>
                                            <input
                                                type="checkbox"
                                                name="payment_modes"
                                                value="qrph"
                                                defaultChecked={settings?.payment_modes?.includes("qrph") ?? false}
                                                className={styles.customCheckbox}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Member Portal Configurations
                                    </label>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <span
                                            className="text-white"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Allow Member Registrations
                                        </span>
                                        <label className={styles.toggleSwitch}>
                                            <input type="checkbox" name="allow_member_registrations" defaultChecked={settings?.allow_member_registrations ?? true} />
                                            <span
                                                className={styles.toggleSlider}
                                            ></span>
                                        </label>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span
                                            className="text-white"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Display Live Floor Capacity
                                        </span>
                                        <label className={styles.toggleSwitch}>
                                            <input
                                                type="checkbox"
                                                name="show_live_capacity"
                                                defaultChecked={settings?.show_live_capacity ?? true}
                                            />
                                            <span
                                                className={styles.toggleSlider}
                                            ></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.iconBoxWarning}>
                                            <i className="fa-solid fa-hammer"></i>
                                        </div>
                                        <div>
                                            <h3 className={styles.cardTitle}>
                                                Website Maintenance
                                            </h3>
                                            <p className={styles.cardDesc}>
                                                Schedule downtime & offline mode
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.maintenanceAlert}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <strong className="text-warning">
                                            <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                                            Enable Maintenance Mode
                                        </strong>
                                        <label className={styles.toggleSwitch}>
                                            <input type="checkbox" name="maintenance_enabled" defaultChecked={settings?.maintenance_enabled ?? false} />
                                            <span
                                                className={styles.toggleSlider}
                                            ></span>
                                        </label>
                                    </div>
                                    <span
                                        className={styles.helperText}
                                        style={{
                                            color: "rgba(255,255,255,0.7)",
                                        }}
                                    >
                                        Activating this restricts member portal
                                        access. Only Admins can log in.
                                    </span>
                                </div>

                                <div className="mb-3 mt-3">
                                    <label className={styles.formLabel}>
                                        Schedule Maintenance (Optional)
                                    </label>
                                    <div className="d-flex align-items-center gap-2">
                                        <input
                                            type="datetime-local"
                                            className={styles.formInput}
                                            name="maintenance_starts_at"
                                            defaultValue={toManilaInput(settings?.maintenance_starts_at)}
                                            onChange={() => setDirty(true)}
                                        />
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className={styles.formLabel}>
                                        Public Offline Message
                                    </label>
                                    <textarea
                                        className={styles.formTextarea}
                                        name="maintenance_message"
                                        rows="3"
                                        defaultValue={settings?.maintenance_message || "Analyn's Fitness Gym portal is currently undergoing scheduled maintenance. We will be back online shortly."}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-3">
                                        <div
                                            className={styles.iconBoxSecondary}
                                        >
                                            <i className="fa-solid fa-database"></i>
                                        </div>
                                        <div>
                                            <h3 className={styles.cardTitle}>
                                                System Backups
                                            </h3>
                                            <p className={styles.cardDesc}>
                                                Storage & local resilience
                                            </p>
                                        </div>
                                    </div>
                                    <span className={styles.statusHealthy}>
                                        <span
                                            className={styles.dotGreen}
                                        ></span>{" "}
                                        Healthy
                                    </span>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.backupBox}>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span
                                            className="text-secondary"
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: "600",
                                            }}
                                        >
                                            Data Export
                                        </span>
                                        <i className="fa-regular fa-circle-check text-success"></i>
                                    </div>
                                    <h4
                                        className="text-white m-0 mb-1"
                                        style={{
                                            fontFamily: "var(--heading-font)",
                                            fontSize: "1.2rem",
                                            fontWeight: "700",
                                        }}
                                    >
                                        {systemInfo?.lastBackup?.completed_at ? new Date(systemInfo.lastBackup.completed_at).toLocaleString() : "No export completed yet"}
                                    </h4>
                                    <p
                                        className="text-secondary m-0"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        Exported CSV files from approved operational tables.
                                    </p>
                                </div>

                                <div className={styles.storageBox}>
                                    <div className="d-flex justify-content-between mb-2">
                                        <span
                                            className="text-secondary"
                                            style={{ fontSize: "0.75rem" }}
                                        >
                                            System Status
                                        </span>
                                        <span
                                            className="text-primary"
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: "600",
                                            }}
                                        >
                                            Version {systemInfo?.version || "..."}
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div
                                            className="d-flex align-items-center gap-2 text-white"
                                            style={{
                                                fontSize: "0.9rem",
                                                fontWeight: "600",
                                            }}
                                        >
                                            <span
                                                className={styles.dotGreen}
                                            ></span>{" "}
                                            Database size
                                        </div>
                                        <div
                                            className="text-primary"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            {systemInfo ? `${(systemInfo.databaseSizeBytes / systemInfo.databaseLimitBytes * 100).toFixed(1)}% used` : "..."}
                                        </div>
                                    </div>
                                    <div className={styles.storageBarBg}>
                                        <div
                                            className={styles.storageBarFill}
                                            style={{ width: `${Math.min(100, systemInfo ? systemInfo.databaseSizeBytes / systemInfo.databaseLimitBytes * 100 : 0)}%` }}
                                        ></div>
                                    </div>
                                    <div
                                        className="d-flex justify-content-between mt-2 text-secondary"
                                        style={{ fontSize: "0.7rem" }}
                                    >
                                        <span>{systemInfo ? `${(systemInfo.databaseSizeBytes / 1024 / 1024).toFixed(1)} MB of ${(systemInfo.databaseLimitBytes / 1024 / 1024).toFixed(0)} MB` : "Loading database size..."}</span>
                                        <span>{backups.length} recent exports</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className={styles.btnPrimaryFull}
                                    onClick={downloadExport}
                                >
                                    <i className="fa-solid fa-cloud-arrow-down"></i>{" "}
                                    Download data export
                                </button>
                                <p
                                    className="text-center text-secondary mt-2 mb-0"
                                    style={{ fontSize: "0.7rem" }}
                                >
                                    This is a data export, not a full database backup. Supabase project backups depend on your plan.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <section className={`${styles.settingsCard} mt-4`}>
                    <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Business & receipts</h3><p className={styles.cardDesc}>Optional details used on payment receipts</p></div>
                    <div className="row g-3 p-4">
                        {[
                            ["business_legal_name", "Legal business name"], ["business_address", "Business address"],
                            ["business_tin", "TIN"], ["receipt_series_prefix", "Receipt series prefix"],
                            ["support_email", "Support email"], ["support_phone", "Support phone"],
                            ["bir_permit_note", "BIR permit note"], ["receipt_footer_note", "Receipt footer note"],
                        ].map(([name, label]) => <div className="col-12 col-md-6" key={name}><label className={styles.formLabel}>{label}</label><input className={styles.formInput} name={name} defaultValue={settings?.[name] || ""} /></div>)}
                        <div className="col-12 col-md-6"><label className={styles.formLabel}>VAT status</label><select className={styles.formSelect} name="vat_status" defaultValue={settings?.vat_status || "unregistered"}><option value="unregistered">Unregistered</option><option value="non_vat">Non-VAT</option><option value="vat">VAT</option></select></div>
                    </div>
                </section>
            </form>}

            <div
                className={styles.systemFooterBanner}
                data-aos="fade-up"
                data-aos-delay="200"
            >
                <div className="d-flex align-items-center gap-3">
                    <i className="fa-solid fa-certificate text-secondary fs-4"></i>
                    <div>
                        <h5
                            className="text-white m-0 mb-1"
                            style={{ fontSize: "0.9rem", fontWeight: "600" }}
                        >
                            Analyn's Fitness Gym — Operational Profile Verified
                        </h5>
                        <p
                            className="text-secondary m-0"
                            style={{ fontSize: "0.75rem" }}
                        >
                            San Jose Branch · Single Gym Tier · Fast local
                            database sync active
                        </p>
                    </div>
                </div>
                <div className="d-flex gap-3">
                    <span className={styles.badgeOutline}>
                        Version {systemInfo?.version || "..."}
                    </span>
                    <span className={styles.badgeSuccessOutline}>
                        All Systems Operational
                    </span>
                </div>
            </div>
        </>
    );
}
