import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./ClerkLayout.module.css";

export default function ClerkLayout({ children }) {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showFastCheckInModal, setShowFastCheckInModal] = useState(false);

    const closeSidebar = () => setIsSidebarOpen(false);

    const handleCheckInSubmit = (e) => {
        e.preventDefault();
        setShowFastCheckInModal(false);
    };

    return (
        <div className={styles.layoutWrapper}>
            {isSidebarOpen && (
                <div className={styles.backdrop} onClick={closeSidebar}></div>
            )}

            <aside
                className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
            >
                <div className={styles.sidebarBrand}>
                    <div className="d-flex align-items-center gap-2">
                        <i className="fa-solid fa-dumbbell fs-4 text-primary"></i>
                        <div>
                            <h2>FITMETRICS</h2>
                            <p>Analyn's Fitness Gym</p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={closeSidebar}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className={styles.quickScanWrapper}>
                    <button className={styles.btnQuickScan}>
                        <i className="fa-solid fa-qrcode"></i> Quick Scan
                    </button>
                </div>

                <nav className={styles.navMenu}>
                    <Link
                        to="/clerk/dashboard"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/clerk/dashboard" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-border-all"></i>
                        Dashboard
                    </Link>
                    <Link
                        to="/clerk/member-registration"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/clerk/member-registration" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-user-plus"></i>
                        Member Registration
                    </Link>
                    <Link
                        to="/clerk/member-information"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/clerk/member-information" ? styles.active : ""}`}
                    >
                        <i className="fa-regular fa-address-card"></i>
                        Member Information
                    </Link>
                    <Link
                        to="/clerk/membership"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/clerk/membership" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-id-card-clip"></i>
                        Membership
                    </Link>
                    <Link
                        to="/clerk/payments"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/clerk/payments" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-money-bill-wave"></i>
                        Payments
                    </Link>
                    <Link
                        to="/clerk/attendance"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/clerk/attendance" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-clipboard-user"></i>
                        Attendance
                    </Link>
                    <Link
                        to="/clerk/notification"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/clerk/notification" ? styles.active : ""}`}
                    >
                        <div className="d-flex justify-content-between align-items-center w-100">
                            <span>
                                <i className="fa-regular fa-bell"></i>{" "}
                                Notification
                            </span>
                            <span className={styles.navBadge}>3</span>
                        </div>
                    </Link>
                </nav>

                <div className={styles.bottomMenu}>
                    <Link
                        to="/clerk/settings"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/clerk/settings" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-gear"></i>
                        Settings
                    </Link>
                    <Link to="/login" className={styles.logoutBtn}>
                        <i className="fa-solid fa-arrow-right-from-bracket"></i>
                        Log Out
                    </Link>
                </div>
            </aside>

            <div className={styles.mainContent}>
                <header className={styles.topbar}>
                    <div className="d-flex align-items-center gap-3">
                        <button
                            className={styles.menuToggle}
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <i className="fa-solid fa-bars"></i>
                        </button>
                        <div className="d-none d-md-flex align-items-center gap-3">
                            <div className={styles.gymStatus}>
                                <span className={styles.statusDot}></span>{" "}
                                Floor: 24 Active Members
                            </div>
                            <span className={styles.branchInfo}>
                                Comfortable floor density (50 cap)
                            </span>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <button
                            className={styles.btnFastCheckIn}
                            onClick={() => setShowFastCheckInModal(true)}
                        >
                            <i className="fa-solid fa-plus"></i> Fast Check-in
                        </button>
                        <button className={styles.btnNotification}>
                            <i className="fa-regular fa-bell"></i>
                            <span className={styles.notificationDot}></span>
                        </button>
                        <div className={styles.userInfo}>
                            <img
                                src="/placeholder.png"
                                alt="Clerk Avatar"
                                className={styles.avatarImg}
                            />
                            <div className="d-none d-sm-block">
                                <h4>Clerk Juan</h4>
                                <p>Front Desk Staff</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className={styles.pageContent}>{children}</main>
            </div>

            {showFastCheckInModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Fast Check-In</h3>
                            <button
                                onClick={() => setShowFastCheckInModal(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form
                            onSubmit={handleCheckInSubmit}
                            className={styles.modalBody}
                        >
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Search Member ID or Name
                                </label>
                                <div className={styles.inputGroup}>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="e.g. #FM-1042 or Juan dela Cruz"
                                        autoFocus
                                        required
                                    />
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </div>
                            </div>

                            <div
                                className="d-flex align-items-center justify-content-center border border-secondary rounded p-4 mb-4"
                                style={{
                                    backgroundColor: "rgba(30, 41, 59, 0.4)",
                                }}
                            >
                                <div className="text-center text-secondary">
                                    <i className="fa-solid fa-qrcode mb-2 fs-3"></i>
                                    <p
                                        className="mb-0"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        Or wait for scanner input...
                                    </p>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() =>
                                        setShowFastCheckInModal(false)
                                    }
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnPrimaryModal}
                                >
                                    Log Check-In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
