import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminSettings.module.css";

export default function AdminSettings() {
    return (
        <AdminLayout>
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
                    <button className={styles.btnSecondary}>
                        <i className="fa-solid fa-rotate-left"></i> Discard
                        Changes
                    </button>
                    <button className={styles.btnPrimary}>
                        <i className="fa-solid fa-floppy-disk"></i> Save
                        Settings
                    </button>
                </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
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
                                            defaultValue="Analyn's Fitness Gym"
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
                                            defaultValue="San Jose, Batangas"
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
                                            defaultValue="+63 917 123 4567"
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
                                            defaultValue="contact@analynsgym.com"
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
                                            defaultValue="06:00"
                                        />
                                        <span className="text-secondary">
                                            to
                                        </span>
                                        <input
                                            type="time"
                                            className={styles.formInput}
                                            defaultValue="21:30"
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
                                            defaultValue="07:00"
                                        />
                                        <span className="text-secondary">
                                            to
                                        </span>
                                        <input
                                            type="time"
                                            className={styles.formInput}
                                            defaultValue="19:00"
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
                                        defaultValue="3"
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
                                                defaultChecked
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
                                                defaultChecked
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
                                                defaultChecked
                                                className={
                                                    styles.customCheckbox
                                                }
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
                                            <input type="checkbox" />
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
                                                defaultChecked
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
                                            <input type="checkbox" />
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
                                        />
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className={styles.formLabel}>
                                        Public Offline Message
                                    </label>
                                    <textarea
                                        className={styles.formTextarea}
                                        rows="3"
                                        defaultValue="Analyn's Fitness Gym portal is currently undergoing scheduled maintenance. We will be back online shortly."
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
                                            Local Database Backup
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
                                        Today at 2:00 AM
                                    </h4>
                                    <p
                                        className="text-secondary m-0"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        Automated nightly snapshot stored on
                                        local drive
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
                                            99.9% Uptime
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
                                            Local Server Online
                                        </div>
                                        <div
                                            className="text-primary"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Storage 24% used
                                        </div>
                                    </div>
                                    <div className={styles.storageBarBg}>
                                        <div
                                            className={styles.storageBarFill}
                                            style={{ width: "24%" }}
                                        ></div>
                                    </div>
                                    <div
                                        className="d-flex justify-content-between mt-2 text-secondary"
                                        style={{ fontSize: "0.7rem" }}
                                    >
                                        <span>14.4 GB of 60 GB</span>
                                        <span>45.6 GB free</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className={styles.btnPrimaryFull}
                                >
                                    <i className="fa-solid fa-cloud-arrow-down"></i>{" "}
                                    Backup Database Now
                                </button>
                                <p
                                    className="text-center text-secondary mt-2 mb-0"
                                    style={{ fontSize: "0.7rem" }}
                                >
                                    Creates an instant compressed archive of
                                    member profiles, attendance logs, and
                                    billing ledgers.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

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
                        Version 2.4.1-local
                    </span>
                    <span className={styles.badgeSuccessOutline}>
                        All Systems Operational
                    </span>
                </div>
            </div>
        </AdminLayout>
    );
}
