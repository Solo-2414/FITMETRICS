import { useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import styles from "./ClerkNotifications.module.css";

export default function ClerkNotifications() {
    const [activeTab, setActiveTab] = useState("all");

    return (
        <ClerkLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Notification</h1>
                    <p className={styles.pageDesc}>
                        Important front desk reminders, member registrations,
                        and gym updates
                    </p>
                </div>
                <button className={styles.btnOutline}>
                    <i className="fa-solid fa-sliders"></i> Filter Preferences
                </button>
            </div>

            <div
                className={styles.tabsContainer}
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className={styles.tabsScroll}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === "all" ? styles.tabBtnActive : ""}`}
                        onClick={() => setActiveTab("all")}
                    >
                        All Notifications{" "}
                        <span className={styles.badgePrimary}>12</span>
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === "expiring" ? styles.tabBtnActive : ""}`}
                        onClick={() => setActiveTab("expiring")}
                    >
                        Expiring Memberships{" "}
                        <span className={styles.badgeMuted}>5</span>
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === "new" ? styles.tabBtnActive : ""}`}
                        onClick={() => setActiveTab("new")}
                    >
                        New Registrations{" "}
                        <span className={styles.badgeMuted}>3</span>
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === "payments" ? styles.tabBtnActive : ""}`}
                        onClick={() => setActiveTab("payments")}
                    >
                        Payments & Renewals{" "}
                        <span className={styles.badgeMuted}>4</span>
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === "notices" ? styles.tabBtnActive : ""}`}
                        onClick={() => setActiveTab("notices")}
                    >
                        Gym Notices
                    </button>
                </div>
                <button className={styles.btnMarkRead}>
                    <i className="fa-solid fa-check-double"></i> Mark All as
                    Read
                </button>
            </div>

            <div className="d-flex flex-column gap-5">
                <section data-aos="fade-up" data-aos-delay="200">
                    <div className={styles.sectionHeader}>
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.dotWarning}></span>
                            <h3 className={styles.sectionTitle}>
                                Membership Expiration Reminders
                            </h3>
                        </div>
                        <span className={styles.sectionBadge}>
                            Front Desk Attention
                        </span>
                    </div>

                    <div className="d-flex flex-column gap-3">
                        <div className={styles.listCard}>
                            <div className="d-flex flex-column flex-lg-row align-items-lg-start gap-4">
                                <div className={styles.iconBoxWarning}>
                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <h4 className={styles.cardTitle}>
                                        Clarisse Domingo - Monthly Regular
                                        expires tomorrow (Nov 16)
                                    </h4>
                                    <span className={styles.statusBadgeWarning}>
                                        Expires in 24h
                                    </span>
                                    <p className={styles.cardDesc}>
                                        Registered phone:{" "}
                                        <strong className="text-white">
                                            0917-209-1844
                                        </strong>
                                        . Remind member upon check-in or send
                                        renewal reminder email.
                                    </p>
                                    <div className={styles.cardMeta}>
                                        <span>
                                            <i className="fa-regular fa-clock"></i>{" "}
                                            Generated 1h ago
                                        </span>
                                        <span className={styles.metaDivider}>
                                            •
                                        </span>
                                        <span>
                                            Plan: Monthly Standard (₱990)
                                        </span>
                                    </div>
                                </div>
                                <div className="d-flex flex-column flex-sm-row flex-lg-column gap-2 mt-3 mt-lg-0">
                                    <button className={styles.btnActionPrimary}>
                                        <i className="fa-solid fa-rotate"></i>{" "}
                                        Renew Membership
                                    </button>
                                    <button className={styles.btnActionOutline}>
                                        <i className="fa-regular fa-envelope"></i>{" "}
                                        Send Email Reminder
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.listCard}>
                            <div className="d-flex flex-column flex-lg-row align-items-lg-start gap-4">
                                <div className={styles.iconBoxSecondary}>
                                    <i className="fa-solid fa-stopwatch"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <h4 className={styles.cardTitle}>
                                        Marcus Vane - Weekly Pass expires in 2
                                        days (Nov 17){" "}
                                        <span className={styles.inlineBadge}>
                                            Expiring Soon
                                        </span>
                                    </h4>
                                    <p className={styles.cardDesc}>
                                        Last logged workout: Leg Day Session
                                        yesterday at 5:20 PM. Active weekly
                                        trial pass.
                                    </p>
                                    <div className={styles.cardMeta}>
                                        <span>
                                            <i className="fa-regular fa-clock"></i>{" "}
                                            Generated 3h ago
                                        </span>
                                        <span className={styles.metaDivider}>
                                            •
                                        </span>
                                        <span>Plan: Weekly Access (₱270)</span>
                                    </div>
                                </div>
                                <div className="d-flex flex-column flex-sm-row flex-lg-column gap-2 mt-3 mt-lg-0">
                                    <button className={styles.btnActionPrimary}>
                                        <i className="fa-solid fa-rotate"></i>{" "}
                                        Renew Membership
                                    </button>
                                    <button className={styles.btnActionOutline}>
                                        <i className="fa-regular fa-envelope"></i>{" "}
                                        Send Email Reminder
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.listCard}>
                            <div className="d-flex flex-column flex-lg-row align-items-lg-start gap-4">
                                <div className={styles.iconBoxSecondary}>
                                    <i className="fa-regular fa-calendar-xmark"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <h4 className={styles.cardTitle}>
                                        Alyssa Bautista - Monthly Regular
                                        expires in 3 days (Nov 18)
                                    </h4>
                                    <span
                                        className={styles.statusBadgeSecondary}
                                    >
                                        Expiring Soon
                                    </span>
                                    <p className={styles.cardDesc}>
                                        Frequent morning runner. Member for 8
                                        consecutive months.
                                    </p>
                                    <div className={styles.cardMeta}>
                                        <span>
                                            <i className="fa-regular fa-clock"></i>{" "}
                                            Generated 5h ago
                                        </span>
                                        <span className={styles.metaDivider}>
                                            •
                                        </span>
                                        <span>
                                            Plan: Monthly Regular (₱990)
                                        </span>
                                    </div>
                                </div>
                                <div className="d-flex flex-column flex-sm-row flex-lg-column gap-2 mt-3 mt-lg-0">
                                    <button className={styles.btnActionPrimary}>
                                        <i className="fa-solid fa-rotate"></i>{" "}
                                        Renew Membership
                                    </button>
                                    <button className={styles.btnActionOutline}>
                                        <i className="fa-regular fa-envelope"></i>{" "}
                                        Send Email Reminder
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section data-aos="fade-up" data-aos-delay="300">
                    <div className={styles.sectionHeader}>
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.dotGreen}></span>
                            <h3 className={styles.sectionTitle}>
                                New Member Registrations
                            </h3>
                        </div>
                        <span className={styles.sectionBadge}>
                            Account Setup
                        </span>
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-xl-6">
                            <div className={styles.gridCard}>
                                <div className="d-flex align-items-start gap-3 mb-3">
                                    <div className={styles.iconBoxSuccess}>
                                        <i className="fa-solid fa-user-plus"></i>
                                    </div>
                                    <div>
                                        <span
                                            className={
                                                styles.statusBadgeSuccess
                                            }
                                        >
                                            Active Registration
                                        </span>
                                        <h4 className={styles.cardTitle}>
                                            New member account registered:
                                            Gabriel Torres
                                        </h4>
                                    </div>
                                </div>
                                <p className={styles.cardDesc}>
                                    Signed up for Monthly Regular with Coach
                                    Mark. First check-in pending.
                                </p>
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary">
                                    <span className={styles.cardMetaText}>
                                        35 mins ago
                                    </span>
                                    <button
                                        className={styles.btnActionOutlineSmall}
                                    >
                                        <i className="fa-regular fa-eye"></i>{" "}
                                        View Member Profile
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-6">
                            <div className={styles.gridCard}>
                                <div className="d-flex align-items-start gap-3 mb-3">
                                    <div className={styles.iconBoxSuccess}>
                                        <i className="fa-solid fa-user-graduate"></i>
                                    </div>
                                    <div>
                                        <span
                                            className={
                                                styles.statusBadgeSuccess
                                            }
                                        >
                                            Student Verified
                                        </span>
                                        <h4 className={styles.cardTitle}>
                                            New member account registered:
                                            Camille Santos
                                        </h4>
                                    </div>
                                </div>
                                <p className={styles.cardDesc}>
                                    Signed up for Student Monthly (₱750).
                                    Digital receipt delivered to email.
                                </p>
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary">
                                    <span className={styles.cardMetaText}>
                                        2 hours ago
                                    </span>
                                    <span
                                        className="text-success"
                                        style={{
                                            fontSize: "0.75rem",
                                            fontWeight: "600",
                                        }}
                                    >
                                        <i className="fa-regular fa-circle-check"></i>{" "}
                                        Auto-enrolled
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section data-aos="fade-up" data-aos-delay="400">
                    <div className={styles.sectionHeader}>
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.dotPrimary}></span>
                            <h3 className={styles.sectionTitle}>
                                Payment & Cash Drawer Notices
                            </h3>
                        </div>
                        <span className={styles.sectionBadge}>
                            Front Desk Accounting
                        </span>
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-xl-6">
                            <div className={styles.gridCard}>
                                <div className="d-flex align-items-start gap-3 mb-3">
                                    <div className={styles.iconBoxPrimary}>
                                        <i className="fa-solid fa-cash-register"></i>
                                    </div>
                                    <div>
                                        <span
                                            className={
                                                styles.statusBadgePrimary
                                            }
                                        >
                                            Shift Protocol
                                        </span>
                                        <h4 className={styles.cardTitle}>
                                            Midday Cash Drawer Check Reminder
                                        </h4>
                                    </div>
                                </div>
                                <p className={styles.cardDesc}>
                                    Current cash recorded at{" "}
                                    <strong className="text-white">
                                        ₱6,150.00
                                    </strong>
                                    . Ready for evening shift handover.
                                </p>
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary">
                                    <span className={styles.cardMetaText}>
                                        Scheduled for 12:00 PM
                                    </span>
                                    <button
                                        className={styles.btnActionOutlineSmall}
                                    >
                                        <i className="fa-solid fa-file-invoice"></i>{" "}
                                        Review Cash Drawer
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-6">
                            <div className={styles.gridCard}>
                                <div className="d-flex align-items-start gap-3 mb-3">
                                    <div className={styles.iconBoxSuccess}>
                                        <i className="fa-solid fa-mobile-screen"></i>
                                    </div>
                                    <div>
                                        <span
                                            className={
                                                styles.statusBadgeSuccess
                                            }
                                        >
                                            GCash Confirmed
                                        </span>
                                        <h4 className={styles.cardTitle}>
                                            Payment received via GCash: ₱990
                                            from Dominic Valderama
                                        </h4>
                                    </div>
                                </div>
                                <p className={styles.cardDesc}>
                                    Renewal processed successfully, receipt
                                    emailed.
                                </p>
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary">
                                    <span className={styles.cardMetaText}>
                                        Ref: GC-88291039 • 45m ago
                                    </span>
                                    <span
                                        className="text-success"
                                        style={{
                                            fontSize: "0.75rem",
                                            fontWeight: "600",
                                        }}
                                    >
                                        <i className="fa-solid fa-check"></i>{" "}
                                        Settled
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section data-aos="fade-up" data-aos-delay="500">
                    <div className={styles.sectionHeader}>
                        <div className="d-flex align-items-center gap-2">
                            <span className={styles.dotPrimary}></span>
                            <h3 className={styles.sectionTitle}>
                                Gym Announcements from Admin
                            </h3>
                        </div>
                        <span className={styles.sectionBadge}>
                            Management Broadcast
                        </span>
                    </div>

                    <div className={styles.announcementCard}>
                        <div className="d-flex flex-column flex-md-row align-items-md-center gap-4">
                            <div className={styles.iconBoxPrimarySolid}>
                                <i className="fa-solid fa-bullhorn"></i>
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <span className={styles.statusBadgePrimary}>
                                        Admin Notice
                                    </span>
                                    <span className={styles.cardMetaText}>
                                        Broadcasted today, 8:00 AM
                                    </span>
                                </div>
                                <h4 className={styles.cardTitle}>
                                    Notice from Gym Owner Zhaider Mendoza:
                                    Holiday Hours
                                </h4>
                                <div className={styles.announcementBody}>
                                    "Upcoming holiday schedule: Gym open 6:00 AM
                                    - 6:00 PM on Friday. Please ensure all free
                                    weights are properly re-racked before
                                    closing the shift."
                                </div>
                            </div>
                            <div className="mt-3 mt-md-0">
                                <button className={styles.btnActionPrimary}>
                                    <i className="fa-solid fa-check"></i>{" "}
                                    Acknowledge
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </ClerkLayout>
    );
}
