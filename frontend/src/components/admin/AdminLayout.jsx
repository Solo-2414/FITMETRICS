import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./AdminLayout.module.css";

export default function AdminLayout({ children }) {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

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

                <nav className={styles.navMenu}>
                    <Link
                        to="/admin/dashboard"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/dashboard" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-border-all"></i>
                        Dashboard
                    </Link>
                    <Link
                        to="/admin/churn-analytics"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/churn-analytics" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-chart-line"></i>
                        Churn Analytics
                    </Link>
                    <Link
                        to="/admin/predictive-analytics"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/predictive-analytics" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        Predictive Analytics
                    </Link>
                    <Link
                        to="/admin/membership-plans"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/membership-plans" ? styles.active : ""}`}
                    >
                        <i className="fa-regular fa-id-card"></i>
                        Membership Plans
                    </Link>
                    <Link
                        to="/admin/attendance-analysis"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/attendance-analysis" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-users-viewfinder"></i>
                        Attendance Analysis
                    </Link>
                    <Link
                        to="/admin/manage-users"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/manage-users" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-users"></i>
                        Manage Users
                    </Link>
                    <Link
                        to="/admin/reports"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/reports" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-chart-simple"></i>
                        Reports
                    </Link>
                    <Link
                        to="/admin/announcements"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/announcements" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-bullhorn"></i>
                        Announcements
                    </Link>
                    <Link
                        to="/admin/video-tutorials"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/video-tutorials" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-circle-play"></i>
                        Video Tutorials
                    </Link>
                    <Link
                        to="/admin/settings"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/settings" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-gear"></i>
                        Settings & Maintenance
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
                        >
                            <i className="fa-solid fa-bars"></i>
                        </button>
                        <div className="d-none d-md-flex align-items-center gap-3">
                            <div className={styles.gymStatus}>
                                <span className={styles.statusDot}></span> Gym
                                Open - 24 Active Members
                            </div>
                            <span className={styles.branchInfo}>
                                San Jose · 5:48 PM
                            </span>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <button className={styles.btnFastCheckIn}>
                            <i className="fa-solid fa-plus"></i> Fast Check-in
                        </button>
                        <button className={styles.btnNotification}>
                            <i className="fa-regular fa-bell"></i>
                            <span className={styles.notificationDot}></span>
                        </button>
                        <div className={styles.userInfo}>
                            <img
                                src="/placeholder.png"
                                alt="Admin Avatar"
                                className={styles.avatarImg}
                            />
                            <div className="d-none d-sm-block">
                                <h4>Zhaider Mendoza</h4>
                                <p>Gym Owner / Admin</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className={styles.pageContent}>{children}</main>
            </div>

            <button
                className={styles.floatingChatBtn}
                onClick={() => setIsChatOpen(!isChatOpen)}
            >
                <i className="fa-solid fa-robot"></i>
            </button>

            {isChatOpen && (
                <div className={styles.chatPanel}>
                    <div className={styles.chatHeader}>
                        <div className="d-flex align-items-center gap-2">
                            <i className="fa-solid fa-robot"></i>
                            <span>FITMETRICS Assistant</span>
                        </div>
                        <button onClick={() => setIsChatOpen(false)}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className={styles.chatBody}>
                        <div className={styles.chatMessage}>
                            How can I help you manage the gym today?
                        </div>
                    </div>
                    <div className={styles.chatFooter}>
                        <input type="text" placeholder="Type a message..." />
                        <button>
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
