import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { Skeleton } from "../ui/Skeleton";
import styles from "./AdminLayout.module.css";

export default function AdminLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut, profile } = useAuth();

    const handleLogout = async (e) => {
        e.preventDefault();
        await signOut();
        navigate("/login", { replace: true });
    };
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const [settings, setSettings] = useState(null);
    const [liveCount, setLiveCount] = useState(null);
    const [liveError, setLiveError] = useState(false);
    const [notifications, setNotifications] = useState({ unread: 0, latest: [] });

    const closeSidebar = () => setIsSidebarOpen(false);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60000);
        Promise.all([api("/admin/settings"), api("/admin/live-count"), api("/admin/notifications/summary")])
            .then(([gymSettings, count, summary]) => {
                setSettings(gymSettings);
                setLiveCount(count);
                setNotifications(summary);
            })
            .catch(() => setLiveError(true));
        return () => window.clearInterval(timer);
    }, []);
    const manilaTime = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(now);
    const manilaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now);
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short" }).format(now);
    const open = weekday === "Sun" ? [settings?.sunday_open, settings?.sunday_close] : [settings?.monday_saturday_open, settings?.monday_saturday_close];
    const manilaMinutes = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(":", ""));
    const openingMinutes = Number(String(open[0] || "00:00").replace(":", ""));
    const closingMinutes = Number(String(open[1] || "00:00").replace(":", ""));
    const isGymOpen = manilaMinutes >= openingMinutes && manilaMinutes < closingMinutes;
    const assistantEnabled = import.meta.env.VITE_ENABLE_ASSISTANT === "true";

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
                    <button className={styles.closeBtn} aria-label="Close navigation menu" onClick={closeSidebar}>
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
                        to="/admin/assistant"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/assistant" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-robot"></i>
                        AI Assistant
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
                        to="/admin/identity-verification"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/identity-verification" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-id-card-clip"></i>
                        Identity Verification
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
                        to="/admin/walk-in-customers"
                        onClick={closeSidebar}
                        className={`${styles.navItem} ${location.pathname === "/admin/walk-in-customers" ? styles.active : ""}`}
                    >
                        <i className="fa-solid fa-person-walking"></i>
                        Walk-in Customers
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
                    <Link to="/login" className={styles.logoutBtn} onClick={handleLogout}>
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
                                {isGymOpen ? "Open" : "Closed"} - {liveError ? "Unavailable" : `${liveCount?.active ?? "..."} Active Members`}
                            </div>
                            <span className={styles.branchInfo}>
                                {settings?.gym_name || "Analyn's Fitness Gym"} · {manilaDate}, {manilaTime}
                            </span>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <button className={styles.btnNotification} aria-label={`Notifications${notifications.unread ? `, ${notifications.unread} unread` : ""}`}>
                            <i className="fa-regular fa-bell"></i>
                            {notifications.unread > 0 && <span className={styles.notificationDot}></span>}
                        </button>
                        <div className={styles.userInfo}>
                            <img
                                src={profile?.avatar_url || "/placeholder.png"}
                                alt="Admin Avatar"
                                className={styles.avatarImg}
                            />
                            <div className="d-none d-sm-block">
                                {profile ? <h4>{profile.full_name}</h4> : <Skeleton w={120} h={14} />}
                                {profile ? <p>Gym Owner / Admin</p> : <Skeleton w={90} h={10} />}
                            </div>
                        </div>
                    </div>
                </header>

                <main className={styles.pageContent}>{children}</main>
            </div>

            {assistantEnabled && <button
                className={styles.floatingChatBtn}
                onClick={() => setIsChatOpen(!isChatOpen)}
            >
                <i className="fa-solid fa-robot"></i>
            </button>}

            {isChatOpen && (
                <div className={styles.chatPanel}>
                    <div className={styles.chatHeader}>
                        <div className="d-flex align-items-center gap-2">
                            <i className="fa-solid fa-robot"></i>
                            <span>FITMETRICS Assistant</span>
                        </div>
                        <button aria-label="Close assistant" onClick={() => setIsChatOpen(false)}>
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
