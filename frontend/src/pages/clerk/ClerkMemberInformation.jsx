import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import { api } from "../../lib/api";
import styles from "./ClerkMemberInformation.module.css";

export default function ClerkMemberInformation() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [members, setMembers] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => {
            api(`/clerk/members?search=${encodeURIComponent(search)}`)
                .then(setMembers)
                .catch((err) => setError(err.message));
        }, 250);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <ClerkLayout>
            {error && <div className="alert alert-danger">{error}</div>}
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Member Information</h1>
                    <p className={styles.pageDesc}>
                        Search, view, and manage registered gym members
                    </p>
                </div>
                <button
                    className={styles.btnPrimaryOutline}
                    onClick={() => navigate("/clerk/member-registration")}
                >
                    <i className="fa-solid fa-user-plus"></i> Register New
                    Member
                </button>
            </div>

            <div
                className={styles.toolbar}
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className={styles.searchBox}>
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kenneth Bautista" />
                </div>
                <div className="d-flex flex-wrap gap-3">
                    <div className={styles.filterGroup}>
                        <button className={styles.filterBtnActive}>
                            All (184)
                        </button>
                        <button className={styles.filterBtn}>
                            Active (148)
                        </button>
                        <button className={styles.filterBtnWarning}>
                            Expiring Soon (8)
                        </button>
                        <button className={styles.filterBtnDanger}>
                            Expired (28)
                        </button>
                    </div>
                    <select className={styles.filterSelect}>
                        <option>All Plans</option>
                        <option>Monthly Regular</option>
                        <option>Student Pass</option>
                        <option>Two Weeks Pass</option>
                        <option>Weekly Pass</option>
                        <option>Walk-In</option>
                    </select>
                </div>
            </div>

            <div className="row g-4 mt-2">
                <div
                    className="col-12 col-xl-8"
                    data-aos="fade-right"
                    data-aos-delay="200"
                >
                    <div className={styles.panelCard}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="d-flex align-items-center gap-2">
                                <i className="fa-solid fa-user-group text-primary fs-5"></i>
                                <h4 className={styles.panelTitle}>
                                    Member Roster
                                </h4>
                            </div>
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Filtered: {members.length} displayed
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th style={{ paddingLeft: "24px" }}>
                                            MEMBER NAME & EMAIL
                                        </th>
                                        <th>CONTACT</th>
                                        <th>CURRENT PLAN & COACH</th>
                                        <th>START DATE</th>
                                        <th>EXPIRATION</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                {members.length > 0 && (
                                    <tbody>
                                        {members.map((member) => (
                                            <tr key={member.id}>
                                                <td style={{ paddingLeft: "24px" }}>
                                                    <strong className="text-white">{member.full_name || "Unnamed member"}</strong>
                                                    <span className={styles.subText}>{member.email}</span>
                                                </td>
                                                <td><span className={styles.subText}>{member.phone || "—"}</span></td>
                                                <td>
                                                    <strong className="d-block text-white">{member.membership?.membership_plans?.name || "No active plan"}</strong>
                                                    <span className="text-primary" style={{ fontSize: "0.75rem" }}>{member.membership?.coaches?.display_name ? `+ ${member.membership.coaches.display_name}` : ""}</span>
                                                </td>
                                                <td><span className={styles.subText}>{member.membership?.start_date || "—"}</span></td>
                                                <td><strong className="d-block text-white">{member.membership?.end_date || "—"}</strong></td>
                                                <td><span className={member.membership?.status === "active" ? styles.statusActive : styles.textWarning}>{member.membership?.status || "inactive"}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                )}
                                <tbody style={{ display: "none" }}>
                                    <tr className={styles.activeRow}>
                                        <td style={{ paddingLeft: "24px" }}>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarPrimary
                                                    }
                                                >
                                                    KB
                                                </div>
                                                <div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <strong className="d-block text-white mb-1">
                                                            Kenneth Bautista
                                                        </strong>
                                                        <span
                                                            className={
                                                                styles.activeIndicator
                                                            }
                                                        ></span>
                                                    </div>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        kenneth.b@gmail.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                0917-882-1094
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Monthly Regular
                                            </strong>
                                            <span
                                                className="text-primary"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                + Coach Mark
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                Oct 28, 2025
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white">
                                                Nov 28, 2025
                                            </strong>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusActive}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: "24px" }}>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarWarning
                                                    }
                                                >
                                                    MS
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Maricel Santos
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        maricels@yahoo.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                0920-445-7812
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Weekly Pass
                                            </strong>
                                            <span className={styles.subText}>
                                                No Coach Assigned
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                Nov 09, 2025
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-warning">
                                                Nov 16, 2025
                                            </strong>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusWarning}
                                            >
                                                Expiring Soon (Tomorrow)
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: "24px" }}>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarSecondary
                                                    }
                                                >
                                                    DV
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Dominic Valderama
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        domval@gmail.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                0945-221-0038
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Two Weeks Pass
                                            </strong>
                                            <span className={styles.subText}>
                                                Self Guided
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                Nov 10, 2025
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white">
                                                Nov 24, 2025
                                            </strong>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusActive}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: "24px" }}>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarDanger
                                                    }
                                                >
                                                    JC
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Joshua Cordero
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        josh.cordero@gmail.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                0939-123-4567
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Monthly Regular
                                            </strong>
                                            <span className={styles.subText}>
                                                No Coach Assigned
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                Oct 12, 2025
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-danger">
                                                Nov 12, 2025
                                            </strong>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusDanger}
                                            >
                                                <span
                                                    className={styles.dotRed}
                                                ></span>{" "}
                                                Expired 2 days ago
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: "24px" }}>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarSuccess
                                                    }
                                                >
                                                    AL
                                                </div>
                                                <div>
                                                    <strong className="d-block text-white mb-1">
                                                        Andrea Lim
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.subText
                                                        }
                                                    >
                                                        andrealim@gmail.com
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                0916-554-9901
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Student Monthly
                                            </strong>
                                            <span className={styles.subText}>
                                                Valid ID Verified
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.subText}>
                                                Nov 05, 2025
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white">
                                                Dec 05, 2025
                                            </strong>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusActive}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 border-top border-secondary pt-4">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Showing 1-5 of 184 members
                            </span>
                            <div className="d-flex gap-2 mt-3 mt-sm-0">
                                <button className={styles.pageBtnText} disabled>
                                    Previous
                                </button>
                                <button className={styles.pageBtnTextActive}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-xl-4"
                    style={{ display: "none" }}
                    data-aos="fade-left"
                    data-aos-delay="300"
                >
                    <div className="d-flex flex-column gap-3">
                        <div className={styles.detailsCard}>
                            <div className="d-flex justify-content-between align-items-start mb-4 pb-4 border-bottom border-secondary">
                                <div className="d-flex gap-3">
                                    <div className={styles.avatarLarge}>KB</div>
                                    <div>
                                        <h3
                                            className="text-white mb-1"
                                            style={{
                                                fontFamily:
                                                    "var(--heading-font)",
                                                fontSize: "1.3rem",
                                                fontWeight: "700",
                                            }}
                                        >
                                            Kenneth Bautista
                                        </h3>
                                        <span className={styles.subText}>
                                            Member Since Oct 2025
                                        </span>
                                    </div>
                                </div>
                                <span className={styles.badgeActive}>
                                    Active Member
                                </span>
                            </div>

                            <div className="row g-3 mb-4">
                                <div className="col-6">
                                    <div className={styles.infoBox}>
                                        <span className={styles.infoLabel}>
                                            Phone Number
                                        </span>
                                        <span className={styles.infoValue}>
                                            0917-882-1094
                                        </span>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className={styles.infoBox}>
                                        <span className={styles.infoLabel}>
                                            Email Address
                                        </span>
                                        <span
                                            className={styles.infoValue}
                                            style={{ wordBreak: "break-all" }}
                                        >
                                            kenneth.b@gmail.com
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.subscriptionBox}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className={styles.subLabel}>
                                        Current Subscription
                                    </span>
                                    <span className={styles.subPrice}>
                                        ₱1,490.00 / mo
                                    </span>
                                </div>
                                <h4
                                    className="text-white mb-3"
                                    style={{
                                        fontSize: "1.1rem",
                                        fontWeight: "600",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Monthly Regular (₱990) + Coach Mark (₱500)
                                </h4>
                                <div className="d-flex justify-content-between align-items-center border-top border-secondary pt-3">
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        Registered: Oct 28, 2025
                                    </span>
                                    <span
                                        className="text-primary"
                                        style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "600",
                                        }}
                                    >
                                        Expires: Nov 28, 2025
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="fa-regular fa-clock text-secondary"></i>
                                        <span
                                            className="text-secondary fw-bold"
                                            style={{
                                                fontSize: "0.8rem",
                                                letterSpacing: "1px",
                                            }}
                                        >
                                            RECENT ATTENDANCE HISTORY
                                        </span>
                                    </div>
                                    <button className={styles.btnLink}>
                                        View All
                                    </button>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    <div className={styles.historyRow}>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span
                                                className="text-success"
                                                style={{
                                                    fontSize: "0.75rem",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Today
                                            </span>
                                            <span
                                                className="text-secondary"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                Clerk Check-in
                                            </span>
                                        </div>
                                        <span
                                            className="text-white"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Time In: 10:15 AM{" "}
                                            <i className="fa-solid fa-arrow-right-long text-secondary mx-1"></i>{" "}
                                            Time Out: 11:45 AM
                                        </span>
                                    </div>
                                    <div className={styles.historyRow}>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span
                                                className="text-secondary"
                                                style={{
                                                    fontSize: "0.75rem",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                Yesterday
                                            </span>
                                            <span
                                                className="text-secondary"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                Member QR Code
                                            </span>
                                        </div>
                                        <span
                                            className="text-white"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Time In: 05:30 PM{" "}
                                            <i className="fa-solid fa-arrow-right-long text-secondary mx-1"></i>{" "}
                                            Time Out: 07:00 PM
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 mb-4">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <i className="fa-solid fa-file-invoice text-secondary"></i>
                                    <span
                                        className="text-secondary fw-bold"
                                        style={{
                                            fontSize: "0.8rem",
                                            letterSpacing: "1px",
                                        }}
                                    >
                                        RECENT PAYMENT HISTORY
                                    </span>
                                </div>
                                <div className={styles.historyRow}>
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <span
                                                className="text-secondary d-block mb-1"
                                                style={{ fontSize: "0.8rem" }}
                                            >
                                                Oct 28, 2025
                                            </span>
                                            <span
                                                className="text-secondary d-block"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                Monthly Plan + Coach
                                            </span>
                                        </div>
                                        <div className="text-end">
                                            <span
                                                className="text-white fw-bold d-block mb-1"
                                                style={{ fontSize: "0.85rem" }}
                                            >
                                                ₱1,490.00 via GCash
                                            </span>
                                            <span
                                                className="text-success d-flex align-items-center justify-content-end gap-1"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                <i className="fa-regular fa-circle-check"></i>{" "}
                                                Digital Receipt Sent
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex flex-column gap-2 mt-4">
                                <button className={styles.btnActionPrimary}>
                                    <i className="fa-solid fa-person-walking-arrow-right"></i>{" "}
                                    Record Attendance (Check-in)
                                </button>
                                <button className={styles.btnActionOutline}>
                                    <i className="fa-solid fa-rotate"></i> Renew
                                    Membership
                                </button>
                                <button className={styles.btnActionOutlineDark}>
                                    <i className="fa-regular fa-paper-plane"></i>{" "}
                                    Send Email Receipt
                                </button>
                            </div>
                        </div>

                        <div className={styles.infoAlert}>
                            <i className="fa-solid fa-circle-info"></i>
                            <span>
                                Expiring member accounts automatically notify
                                members via email 24 hours prior to expiration.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </ClerkLayout>
    );
}
