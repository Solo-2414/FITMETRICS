import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Skeleton } from "../ui/Skeleton";
import styles from "./MemberLayout.module.css";

export default function MemberLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut, profile: authProfile } = useAuth();

    const [liveProfile, setLiveProfile] = useState(() => {
        const cachedAvatar = sessionStorage.getItem("cached_avatar_url");
        if (cachedAvatar !== null) {
            return { avatar_url: cachedAvatar || null };
        }
        return null;
    });

    const [activeInGym, setActiveInGym] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [date] = useState(() =>
        new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
            new Date(),
        ),
    );

    // Listen for immediate saves/deletes from MemberProfile.
    useEffect(() => {
        const handleProfileUpdate = (event) => {
            if (event.detail) {
                setLiveProfile((prev) => ({ ...prev, ...event.detail }));
            }
        };

        window.addEventListener("profile-updated", handleProfileUpdate);
        return () =>
            window.removeEventListener("profile-updated", handleProfileUpdate);
    }, []);

    useEffect(() => {
        api(`/attendance/analysis?date=${date}`)
            .then((data) => setActiveInGym(data?.activeInGym ?? 0))
            .catch((err) =>
                console.error("Error fetching live gym count:", err),
            );
    }, [date]);

    const profile = authProfile
        ? { ...authProfile, ...liveProfile }
        : liveProfile;

    const headerAvatarUrl =
        profile?.avatar_url === null
            ? null
            : profile?.avatar_url ||
              profile?.photo_url ||
              profile?.profile_photo;

    const initials = profile?.full_name
        ? profile.full_name
              .trim()
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
        : "M";

    const handleLogout = async (e) => {
        e.preventDefault();
        sessionStorage.removeItem("cached_avatar_url");
        await signOut();
        navigate("/login", { replace: true });
    };

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
                    <Link
                        to="/login"
                        className={styles.logoutBtn}
                        onClick={handleLogout}
                    >
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
                            <span>
                                Floor:{" "}
                                {activeInGym !== null ? activeInGym : "..."}{" "}
                                Active Members
                            </span>
                        </div>
                    </div>
                    <div className={styles.topbarRight}>
                        <div className={styles.userInfo}>
                            {profile ? (
                                <h4>{profile.full_name}</h4>
                            ) : (
                                <Skeleton w={120} h={14} />
                            )}
                            {profile ? (
                                <p>Regular Member</p>
                            ) : (
                                <Skeleton w={90} h={10} />
                            )}
                        </div>
                        <div
                            className={styles.avatarCircle}
                            style={{ overflow: "hidden" }}
                        >
                            {headerAvatarUrl ? (
                                <img
                                    src={headerAvatarUrl}
                                    alt={profile?.full_name || "Profile"}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "50%",
                                    }}
                                />
                            ) : (
                                initials
                            )}
                        </div>
                    </div>
                </header>

                <main className={styles.pageContent}>{children}</main>
            </div>
        </div>
    );
}
