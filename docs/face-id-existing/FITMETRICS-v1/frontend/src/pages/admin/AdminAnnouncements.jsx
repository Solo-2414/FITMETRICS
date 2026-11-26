import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminAnnouncements.module.css";

export default function AdminAnnouncements() {
    return (
        <AdminLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Announcements</h1>
                    <p className={styles.pageDesc}>
                        Post updates, holiday schedules, and gym notices for
                        members and staff
                    </p>
                </div>
                <button
                    className={styles.btnPrimary}
                    onClick={() =>
                        document
                            .getElementById("create-announcement")
                            .scrollIntoView({ behavior: "smooth" })
                    }
                >
                    <i className="fa-solid fa-plus"></i> Create Announcement
                </button>
            </div>

            <div
                className="row g-3 mb-5"
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="col-12 col-md-4">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Active Member Notices</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-bullhorn"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>2</h3>
                        <div className="d-flex align-items-center gap-2 mt-2">
                            <span className={styles.kpiPositive}>
                                <i className="fa-regular fa-eye"></i>{" "}
                                Broadcasting on mobile & lobby portal
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Estimated Member Reach</span>
                            <div className={styles.iconBoxSecondary}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>418</h3>
                        <div className="d-flex align-items-center gap-2 mt-2">
                            <span className={styles.kpiSub}>
                                <i className="fa-regular fa-envelope"></i>{" "}
                                In-app delivery & email summary
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Communication Channel</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-regular fa-comments"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValueText}>Email / In-App</h3>
                        <div className="d-flex align-items-center gap-2 mt-2">
                            <span className={styles.kpiSub}>
                                <i className="fa-solid fa-shield-halved"></i>{" "}
                                Zero-spam compliant feed
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div
                    className="col-12 col-xl-8"
                    data-aos="fade-right"
                    data-aos-delay="200"
                >
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <h4 className={styles.sectionTitle}>
                                Active & Scheduled Announcements
                            </h4>
                            <span className={styles.countBadge}>3 Total</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Filter:
                            </span>
                            <button className={styles.btnFilterActive}>
                                All
                            </button>
                        </div>
                    </div>

                    <div className="d-flex flex-column gap-3">
                        <div className={styles.announcementCard}>
                            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                                <div className="d-flex gap-2 align-items-center flex-wrap">
                                    <span className={styles.statusPublished}>
                                        <span
                                            className={styles.dotGreen}
                                        ></span>{" "}
                                        Published · Visible to all members
                                    </span>
                                    <span className={styles.statusPinned}>
                                        <i className="fa-solid fa-thumbtack"></i>{" "}
                                        Pinned
                                    </span>
                                </div>
                            </div>

                            <div className={styles.metaText}>
                                <i className="fa-regular fa-clock"></i> Posted
                                Oct 24 · Expires Nov 02
                            </div>

                            <h3 className={styles.cardTitle}>
                                Panagbenga Festival Weekend Schedule
                            </h3>
                            <p className={styles.cardDesc}>
                                Analyn's Fitness Gym will remain open from 6:00
                                AM to 6:00 PM during festival Friday and
                                Saturday. Regular hours resume Sunday.
                            </p>

                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mt-4 gap-3">
                                <div className={styles.cardMetrics}>
                                    <span>
                                        <i className="fa-regular fa-envelope"></i>{" "}
                                        In-App & Email Feed
                                    </span>
                                    <span className={styles.metricSeparator}>
                                        •
                                    </span>
                                    <span>Read receipts: 92%</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className={styles.btnActionSecondary}
                                    >
                                        <i className="fa-solid fa-thumbtack"></i>{" "}
                                        Pin to Member Portal
                                    </button>
                                    <button className={styles.btnActionIcon}>
                                        <i className="fa-solid fa-pen"></i>
                                    </button>
                                    <button
                                        className={styles.btnActionIconDanger}
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.announcementCard}>
                            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                                <span className={styles.statusPublished}>
                                    <span className={styles.dotGreen}></span>{" "}
                                    Published · Visible to all members
                                </span>
                                <span className={styles.metaText}>
                                    <i className="fa-regular fa-clock"></i>{" "}
                                    Posted Oct 18
                                </span>
                            </div>

                            <h3 className={styles.cardTitle}>
                                New Dumbbell & Barbell Sets Arrived!
                            </h3>
                            <p className={styles.cardDesc}>
                                We have upgraded our free-weights corner with
                                new rubber hex dumbbells (5kg to 35kg). Please
                                remember to re-rack your weights after use!
                            </p>

                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mt-4 gap-3">
                                <div className={styles.cardMetrics}>
                                    <span>
                                        <i className="fa-solid fa-dumbbell"></i>{" "}
                                        Equipment Notice
                                    </span>
                                    <span className={styles.metricSeparator}>
                                        •
                                    </span>
                                    <span>Audience: All Members</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className={styles.btnActionIconOutline}
                                    >
                                        <i className="fa-solid fa-thumbtack"></i>{" "}
                                        Pin
                                    </button>
                                    <button className={styles.btnActionIcon}>
                                        <i className="fa-solid fa-pen"></i>
                                    </button>
                                    <button
                                        className={styles.btnActionIconDanger}
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.announcementCardInactive}>
                            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                                <span className={styles.statusCompleted}>
                                    <span className={styles.dotGray}></span>{" "}
                                    Completed
                                </span>
                                <span className={styles.metaText}>
                                    <i className="fa-regular fa-clock"></i>{" "}
                                    Posted Oct 10
                                </span>
                            </div>

                            <h3 className={styles.cardTitleInactive}>
                                Air Conditioning Maintenance Notice
                            </h3>
                            <p className={styles.cardDescInactive}>
                                AC unit servicing is complete. The gym floor
                                temperature is returning to optimal cool levels
                                for your comfort.
                            </p>

                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mt-4 gap-3">
                                <div className={styles.cardMetricsInactive}>
                                    <span>
                                        <i className="fa-solid fa-fan"></i>{" "}
                                        Facility Service
                                    </span>
                                    <span className={styles.metricSeparator}>
                                        •
                                    </span>
                                    <span>Archived automatically</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className={styles.btnActionIcon}>
                                        <i className="fa-solid fa-box-archive"></i>
                                    </button>
                                    <button
                                        className={styles.btnActionIconDanger}
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-xl-4"
                    id="create-announcement"
                    data-aos="fade-left"
                    data-aos-delay="300"
                >
                    <div className={styles.formCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom border-secondary">
                            <div>
                                <h3 className={styles.formTitle}>
                                    Create Announcement
                                </h3>
                                <p className={styles.formDesc}>
                                    Dispatches to Member Portal & In-App
                                    Notification
                                </p>
                            </div>
                            <div className={styles.iconBoxPrimarySmall}>
                                <i className="fa-solid fa-paper-plane"></i>
                            </div>
                        </div>

                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Announcement Title{" "}
                                    <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g., Holy Week Gym Schedule & Holiday Hours"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Target Audience{" "}
                                    <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex gap-3">
                                    <label className={styles.radioLabelActive}>
                                        <input
                                            type="radio"
                                            name="audience"
                                            defaultChecked
                                            className={styles.radioInput}
                                        />
                                        <span
                                            className={styles.radioCustom}
                                        ></span>
                                        All Members
                                    </label>
                                    <label className={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            name="audience"
                                            className={styles.radioInput}
                                        />
                                        <span
                                            className={styles.radioCustom}
                                        ></span>
                                        Staff Only
                                    </label>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Message Text{" "}
                                    <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    className={styles.formTextarea}
                                    rows="5"
                                    placeholder="Provide complete details regarding schedules, maintenance, equipment guidelines, or gym announcements..."
                                    required
                                ></textarea>
                                <div className="d-flex justify-content-between mt-2">
                                    <span className={styles.helperText}>
                                        Supports plain text & emojis
                                    </span>
                                    <span className={styles.helperText}>
                                        0 / 500 chars
                                    </span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Expiry Date{" "}
                                    <span className="text-secondary fw-normal">
                                        (Optional)
                                    </span>
                                </label>
                                <div className={styles.inputGroup}>
                                    <input
                                        type="date"
                                        className={styles.formInputDate}
                                    />
                                </div>
                                <span className={styles.helperTextBlock}>
                                    Notice will automatically complete and
                                    archive after this date.
                                </span>
                            </div>

                            <div className={styles.infoAlert}>
                                <i className="fa-solid fa-circle-info"></i>
                                <span>
                                    Publishing delivers instantly to the gym
                                    member mobile portal and weekly email
                                    digest. No high-cost telecom SMS gateways
                                    required.
                                </span>
                            </div>

                            <button
                                type="submit"
                                className={styles.btnPrimaryFull}
                            >
                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                Publish Announcement
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
