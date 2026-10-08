import { useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberNotifications.module.css";

export default function MemberNotifications() {
    const [activeTab, setActiveTab] = useState("All");

    const notifications = [
        {
            id: 1,
            type: "alert",
            icon: "fa-solid fa-clock",
            iconColor: "text-warning",
            title: "Membership Expiring Soon",
            message:
                "Your Monthly Regular Pass expires in 3 days. Please renew at the front desk to avoid interruption.",
            time: "2 hours ago",
            isRead: false,
        },
        {
            id: 2,
            type: "message",
            icon: "fa-solid fa-dumbbell",
            iconColor: "text-primary",
            title: "New Workout Plan Assigned",
            message:
                "Coach Mark has updated your weekly split to focus on Progressive Overload.",
            time: "Yesterday, 4:15 PM",
            isRead: false,
        },
        {
            id: 3,
            type: "system",
            icon: "fa-solid fa-bullhorn",
            iconColor: "text-success",
            title: "Holiday Schedule Update",
            message:
                "Analyn's Fitness Gym will close early at 5:00 PM this coming Friday for a gym maintenance check.",
            time: "Oct 5, 2026",
            isRead: true,
        },
        {
            id: 4,
            type: "billing",
            icon: "fa-solid fa-file-invoice-dollar",
            iconColor: "text-primary",
            title: "Payment Received",
            message:
                "We received your payment of ₱1,490.00 via GCash. Your digital receipt is ready.",
            time: "Sep 29, 2026",
            isRead: true,
        },
        {
            id: 5,
            type: "milestone",
            icon: "fa-solid fa-fire",
            iconColor: "text-danger",
            title: "4-Week Consistency Streak!",
            message:
                "Great job Kenneth! You have visited the gym consistently for 4 weeks straight. Keep up the momentum.",
            time: "Sep 20, 2026",
            isRead: true,
        },
    ];

    const filteredNotifications =
        activeTab === "Unread"
            ? notifications.filter((n) => !n.isRead)
            : notifications;

    return (
        <MemberLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Notifications</h1>
                    <p className={styles.pageDesc}>
                        Stay updated with your membership status, gym
                        announcements, and messages from your coach.
                    </p>
                </div>
                <button className={styles.btnOutline}>
                    <i className="fa-solid fa-check-double"></i> Mark all as
                    read
                </button>
            </div>

            <div className={styles.notificationContainer} data-aos="fade-up">
                <div className={styles.tabsWrapper}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === "All" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("All")}
                    >
                        All Updates
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === "Unread" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("Unread")}
                    >
                        Unread{" "}
                        <span className={styles.unreadCount}>
                            {notifications.filter((n) => !n.isRead).length}
                        </span>
                    </button>
                </div>

                <div className={styles.notificationList}>
                    {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((note) => (
                            <div
                                key={note.id}
                                className={`${styles.notificationCard} ${!note.isRead ? styles.cardUnread : ""}`}
                            >
                                <div className={styles.cardIconWrapper}>
                                    <i
                                        className={`${note.icon} ${note.iconColor}`}
                                    ></i>
                                </div>
                                <div className={styles.cardContent}>
                                    <div className="d-flex justify-content-between align-items-start gap-3">
                                        <h4 className={styles.cardTitle}>
                                            {note.title}
                                        </h4>
                                        <span className={styles.cardTime}>
                                            {note.time}
                                        </span>
                                    </div>
                                    <p className={styles.cardMessage}>
                                        {note.message}
                                    </p>
                                </div>
                                {!note.isRead && (
                                    <div
                                        className={styles.unreadIndicator}
                                    ></div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            <i className="fa-regular fa-bell-slash"></i>
                            <h4>No new notifications</h4>
                            <p>You're all caught up with the latest updates!</p>
                        </div>
                    )}
                </div>
            </div>
        </MemberLayout>
    );
}
