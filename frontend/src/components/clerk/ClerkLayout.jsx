/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { Skeleton } from "../ui/Skeleton";
import { useClerkData } from "../../context/ClerkDataContext";
import { useToast } from "../ui/toast/useToast";
import ClerkModal from "./ClerkModal";
import styles from "./ClerkLayout.module.css";

export default function ClerkLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut, profile } = useAuth();
    const toast = useToast();
    const { preferences, notificationSummary, notificationError, dashboard, reloadDashboard, reloadNotifications } = useClerkData();
    const unreadCount = notificationSummary?.unread || 0;
    const [notificationOpen, setNotificationOpen] = useState(false);
    const notificationRef = useRef(null);
    const [avatarFailed, setAvatarFailed] = useState(false);
    useEffect(() => {
        const close = (event) => { if (!notificationRef.current?.contains(event.target)) setNotificationOpen(false); };
        const escape = (event) => { if (event.key === "Escape") setNotificationOpen(false); };
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
    }, []);
    const initials = (profile?.full_name || "Clerk").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

    const handleLogout = async (e) => {
        e.preventDefault();
        await signOut();
        navigate("/login", { replace: true });
    };
    const activeInGym = dashboard?.activeOnFloor ?? null;
    const floorCapacity = dashboard?.capacity || 50;
    const floorLoadError = !dashboard;

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showFastCheckInModal, setShowFastCheckInModal] = useState(false);
    const [checkInSearch, setCheckInSearch] = useState("");
    const [checkInMember, setCheckInMember] = useState(null);
    const [checkInMatches, setCheckInMatches] = useState([]);
    const [checkInLoading, setCheckInLoading] = useState(false);
    const [checkInSaving, setCheckInSaving] = useState(false);
    const scannerBufferRef = useRef("");
    const scannerLastKeyRef = useRef(0);
    const scannerTimerRef = useRef(null);
    const lookupRequestRef = useRef(0);

    const closeSidebar = () => setIsSidebarOpen(false);

    const handleCheckInSubmit = async (e) => {
        e.preventDefault();
        if (!checkInMember || checkInSaving) return;
        setCheckInSaving(true);
        try {
            await api("/clerk/attendance", { method: "POST", body: { member_id: checkInMember.id, method: "manual" } });
            toast.success("Check-in recorded.");
            setShowFastCheckInModal(false);
            window.dispatchEvent(new Event("fitmetrics:attendance-changed"));
            if (preferences.autoClearCheckinSearch) {
                setCheckInSearch("");
                setCheckInMatches([]);
                setCheckInMember(null);
            }
        } catch (error) { toast.error(error.message); } finally { setCheckInSaving(false); }
    };
    useEffect(() => {
        if (!showFastCheckInModal || checkInSearch.trim().length < 2) {
            setCheckInMatches([]);
            setCheckInLoading(false);
            return undefined;
        }
        const requestId = ++lookupRequestRef.current;
        const timer = window.setTimeout(async () => {
            setCheckInLoading(true);
            try {
                const matches = await api(`/clerk/members/lookup?q=${encodeURIComponent(checkInSearch.trim())}`);
                if (requestId === lookupRequestRef.current) setCheckInMatches(matches.slice(0, 8));
            } catch (error) {
                if (requestId === lookupRequestRef.current) toast.error(error.message);
            } finally {
                if (requestId === lookupRequestRef.current) setCheckInLoading(false);
            }
        }, 250);
        return () => window.clearTimeout(timer);
    }, [checkInSearch, showFastCheckInModal, toast]);
    useEffect(() => {
        const onKeyDown = async (event) => {
            const target = event.target;
            if (["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName) || target?.isContentEditable
                || event.ctrlKey || event.metaKey || event.altKey) return;
            if (!showFastCheckInModal && document.activeElement !== document.body) return;
            const now = performance.now();
            if (event.key === "Enter") {
                const code = scannerBufferRef.current.trim();
                scannerBufferRef.current = "";
                if (code.length < 3 || now - scannerLastKeyRef.current > 100) return;
                try {
                    const rows = await api(`/clerk/members/lookup?q=${encodeURIComponent(code)}`);
                    const member = rows.find((row) => row.member_code === code);
                    if (!member) throw new Error("No member matches this scan.");
                    await api("/clerk/attendance", { method: "POST", body: { member_id: member.id, method: "manual" } });
                    toast.success(`${member.full_name || "Member"} checked in.`);
                    window.dispatchEvent(new Event("fitmetrics:attendance-changed"));
                } catch (error) { toast.error(error.message); }
                return;
            }
            if (event.key.length === 1) {
                if (now - scannerLastKeyRef.current > 35) scannerBufferRef.current = "";
                scannerBufferRef.current = `${scannerBufferRef.current}${event.key}`.slice(-64);
                scannerLastKeyRef.current = now;
                window.clearTimeout(scannerTimerRef.current);
                scannerTimerRef.current = window.setTimeout(() => { scannerBufferRef.current = ""; }, 100);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => { window.removeEventListener("keydown", onKeyDown); window.clearTimeout(scannerTimerRef.current); };
    }, [showFastCheckInModal, toast]);

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
                    <button className={styles.btnQuickScan} onClick={() => setShowFastCheckInModal(true)}>
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
                            {unreadCount > 0 && <span className={styles.navBadge}>{unreadCount}</span>}
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
                                <span className={styles.statusDot}></span>{" "}
                                Floor: {activeInGym !== null ? activeInGym : "-"} Active Members
                                {floorLoadError && <button type="button" className={styles.retryFloor} onClick={() => reloadDashboard()}>Retry</button>}
                            </div>
                            <span className={styles.branchInfo}>
                                {activeInGym !== null && activeInGym / floorCapacity >= 0.75 ? "Busy" : activeInGym !== null && activeInGym / floorCapacity >= 0.4 ? "Comfortable" : "Quiet"} floor density ({floorCapacity} cap)
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
                        <div className={styles.notificationWrapper} ref={notificationRef}>
                        <button className={styles.btnNotification} aria-label={`${unreadCount} unread notifications`} aria-expanded={notificationOpen} onClick={() => setNotificationOpen((open) => !open)}>
                            <i className="fa-regular fa-bell"></i>
                            {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
                        </button>
                        {notificationOpen && <div className={styles.notificationPanel} role="dialog" aria-label="Notifications">
                            <div className={styles.notificationPanelHeader}><strong>Notifications</strong><span>{unreadCount} unread</span></div>
                            {!notificationSummary && <div className={styles.notificationLoading}>Loading notifications...</div>}
                            {notificationError && <div className={styles.notificationLoading}>Could not load notifications. <button type="button" onClick={() => reloadNotifications()}>Retry</button></div>}
                            {notificationSummary?.latest?.map((item) => <button className={styles.notificationItem} key={item.id} onClick={async () => { if (!item.read_at) await api(`/clerk/notifications/${item.id}`, { method: "PATCH" }); window.dispatchEvent(new Event("fitmetrics:notifications-changed")); setNotificationOpen(false); navigate(item.link || "/clerk/notification"); }}>
                                <i className={`fa-solid ${item.type === "payment" ? "fa-money-bill" : item.type === "announcement" ? "fa-bullhorn" : item.type === "registration" ? "fa-user-plus" : "fa-bell"}`}></i><span><strong>{item.title}</strong><small>{item.message}</small></span>{!item.read_at && <b aria-label="Unread"></b>}
                            </button>)}
                            {notificationSummary?.latest?.length === 0 && <div className={styles.notificationEmpty}>You're all caught up</div>}
                            <button className={styles.markAllButton} onClick={async () => { await api("/clerk/notifications", { method: "PATCH" }); window.dispatchEvent(new Event("fitmetrics:notifications-changed")); reloadNotifications(); }}>Mark all as read</button>
                            <Link className={styles.viewAllLink} to="/clerk/notification" onClick={() => setNotificationOpen(false)}>View all notifications</Link>
                        </div>}
                        </div>
                        <div className={styles.userInfo}>
                            {avatarFailed ? <div className={styles.avatarImg}>{initials}</div> : <img src={profile?.avatar_url || "/placeholder.png"} alt="Clerk Avatar" className={styles.avatarImg} onError={() => setAvatarFailed(true)} />}
                            <div className="d-none d-sm-block">
                                {profile ? <h4>{profile.full_name}</h4> : <Skeleton w={120} h={14} />}
                                {profile ? <p>Front Desk Staff</p> : <Skeleton w={90} h={10} />}
                            </div>
                        </div>
                    </div>
                </header>

                <main className={styles.pageContent}>{children}</main>
            </div>

            {showFastCheckInModal && (
                <ClerkModal title="Fast Check-In" icon="fa-user-check" labelledBy="fast-check-in-title" onClose={() => setShowFastCheckInModal(false)} footer={
                    <div className={styles.modalFooter}>
                        <button type="button" className={styles.btnCancel} onClick={() => setShowFastCheckInModal(false)}>Cancel</button>
                        <button type="submit" form="fast-check-in-form" className={styles.btnPrimaryModal} disabled={!checkInMember || !["active", "expiring"].includes(checkInMember?.status) || checkInSaving}>
                            {checkInSaving ? "Checking in..." : "Log Check-In"}
                        </button>
                    </div>
                }>
                        <form
                            id="fast-check-in-form"
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
                                        autoFocus={preferences.fastCheckinAutoFocus}
                                        required
                                        value={checkInSearch}
                                        onChange={(event) => {
                                            setCheckInSearch(event.target.value);
                                            setCheckInMember(null);
                                        }}
                                    />
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </div>
                                {checkInLoading && <p className="text-secondary mt-2 mb-0">Searching...</p>}
                                {!checkInLoading && checkInSearch.trim().length >= 2 && !checkInMatches.length && <p className="text-secondary mt-2 mb-0">No members found</p>}
                                {!checkInMember && checkInMatches.length > 0 && <div className="d-flex flex-column gap-2 mt-2">{checkInMatches.map((member) => <button type="button" className="btn btn-outline-secondary text-start" key={member.id} onClick={() => setCheckInMember(member)}><strong>{member.full_name}</strong><small className="d-block text-secondary">{member.member_code || member.email || "No member code"} · {member.status}</small></button>)}</div>}
                                {checkInMember && <p className="text-success">Selected: {checkInMember.full_name || checkInMember.email}</p>}
                                {checkInMember && !["active", "expiring"].includes(checkInMember.status) && <p className="text-danger mb-0">{checkInMember.status === "suspended" ? "This member is suspended." : checkInMember.status === "expired" ? "This member's membership has expired." : "This member does not have a current active membership."}</p>}
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

                        </form>
                </ClerkModal>
            )}
        </div>
    );
}
