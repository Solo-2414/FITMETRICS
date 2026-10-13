import ClerkLayout from "../../components/clerk/ClerkLayout";
import styles from "./ClerkSettings.module.css";

export default function ClerkSettings() {
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
                                            defaultValue="Juan"
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
                                            defaultValue="Ramirez"
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
                                            defaultValue="juan.desk@analynsgym.com"
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
                                            defaultValue="+63 928 441 9082"
                                        />
                                        <i className="fa-solid fa-phone"></i>
                                    </div>
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
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={styles.btnOutlineWarning}
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
                                    <div className={styles.largeAvatar}>JR</div>
                                    <h4
                                        className="mt-3 mb-1 text-white"
                                        style={{
                                            fontFamily: "var(--heading-font)",
                                            fontSize: "1.1rem",
                                            fontWeight: "700",
                                        }}
                                    >
                                        Clerk Juan
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
                                        <button
                                            type="button"
                                            className={`${styles.btnOutlinePrimary} flex-grow-1`}
                                        >
                                            <i className="fa-solid fa-camera"></i>{" "}
                                            Change Photo
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.btnOutlineDanger}
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
                                        <input type="checkbox" defaultChecked />
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
                                        <input type="checkbox" defaultChecked />
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
                                            Receive end-of-shift ledger to your
                                            staff email
                                        </span>
                                    </div>
                                    <label className={styles.toggleSwitch}>
                                        <input type="checkbox" />
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
                    <button type="button" className={styles.btnSave}>
                        <i className="fa-regular fa-circle-check"></i> Save
                        Changes
                    </button>
                </div>
            </form>
        </ClerkLayout>
    );
}
