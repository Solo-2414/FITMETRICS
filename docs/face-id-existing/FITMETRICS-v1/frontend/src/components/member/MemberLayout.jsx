import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./MemberLayout.module.css";

export default function MemberLayout({ children }) {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const closeSidebar = () => setIsSidebarOpen(false);

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
                        <img src="/logo.png" alt="FITMETRICS Logo" />
                        <div>
                            <h2>FITMETRICS</h2>
                            <p>Analyn's Fitness Gym</p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={closeSidebar}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <nav className={styles.navMenu}>
                    <Link
                        to="/member/dashboard"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/member/dashboard" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-border-all"></i>
                        Dashboard
                    </Link>
                    <Link
                        to="/member/profile"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/member/profile" ? styles.active : ""}`}
                    >
                        <i className="fa-regular fa-user"></i>
                        My Profile
                    </Link>
                    <Link
                        to="/member/workout-plans"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/member/workout-plans" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-dumbbell"></i>
                        Workout Plans
                    </Link>
                    <Link
                        to="/member/video-tutorials"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/member/video-tutorials" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-circle-play"></i>
                        Video Tutorials
                    </Link>
                    <Link
                        to="/member/membership"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/member/membership" ? styles.active : ""}`}
                    >
                        <i className="fa-regular fa-id-card"></i>
                        Membership & Passes
                    </Link>
                    <Link
                        to="/member/attendance"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/member/attendance" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-clock-rotate-left"></i>
                        Attendance History
                    </Link>
                    <Link
                        to="/member/billing"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/member/billing" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-file-invoice-dollar"></i>
                        Billing & Receipts
                    </Link>
                    <Link
                        to="/member/notifications"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/member/notifications" ? styles.active : ""}`}
                    >
                        <i className="fa-regular fa-bell"></i>
                        Notifications
                    </Link>
                </nav>

                <div className={styles.logoutWrapper}>
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
                            aria-label="Toggle Navigation"
                        >
                            <i className="fa-solid fa-bars"></i>
                        </button>
                        <div className={styles.gymStatus}>
                            <span className={styles.statusDot}></span>
                            Floor: 24 Active Members
                        </div>
                    </div>
                    <div className={styles.topbarRight}>
                        <div className={styles.userInfo}>
                            <h4>Michael Andre Tanza</h4>
                            <p>Regular Member</p>
                        </div>
                        <div className={styles.avatarCircle}>MT</div>
                    </div>
                </header>

                <main className={styles.pageContent}>{children}</main>
            </div>
        </div>
    );
}
