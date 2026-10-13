import { useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import styles from "./ClerkMembership.module.css";

export default function ClerkMembership() {
    const [paymentMethod, setPaymentMethod] = useState("Cash");

    return (
        <ClerkLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Membership</h1>
                    <p className={styles.pageDesc}>
                        Manage member plans, counter renewals, and coach
                        assignments
                    </p>
                </div>
                <div className={styles.emailBadge}>
                    <i className="fa-regular fa-envelope"></i> All member
                    renewal receipts sent automatically via email
                </div>
            </div>

            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4"
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="d-flex align-items-center gap-2">
                    <i className="fa-solid fa-tag text-primary fs-5"></i>
                    <h3 className={styles.sectionTitle}>
                        Current Plan Rates & Access Fees
                    </h3>
                </div>
                <span className={styles.sectionSubtitle}>
                    SIMPLE GYM ACCESS · NO HIDDEN FEES
                </span>
            </div>

            <div
                className="row g-3 mb-5"
                data-aos="fade-up"
                data-aos-delay="200"
            >
                <div className="col-12 col-sm-6 col-xl">
                    <div className={styles.rateCard}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className={styles.rateLabel}>WALK-IN</span>
                            <span className={styles.rateDuration}>1 Day</span>
                        </div>
                        <h2 className={styles.ratePrice}>₱90</h2>
                        <span className={styles.rateSub}>Student: ₱70</span>
                        <div className={styles.rateFooter}>
                            Single session pass
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                    <div className={styles.rateCard}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className={styles.rateLabel}>
                                WEEKLY PASS
                            </span>
                            <span className={styles.rateDuration}>7 Days</span>
                        </div>
                        <h2 className={styles.ratePrice}>₱270</h2>
                        <span className={styles.rateSub}>Flat rate</span>
                        <div className={styles.rateFooter}>
                            Consecutive days
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                    <div className={styles.rateCard}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className={styles.rateLabel}>TWO WEEKS</span>
                            <span className={styles.rateDuration}>14 Days</span>
                        </div>
                        <h2 className={styles.ratePrice}>₱540</h2>
                        <span className={styles.rateSub}>Flat rate</span>
                        <div className={styles.rateFooter}>
                            Mid-term fitness pass
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                    <div className={styles.rateCardPopular}>
                        <div className={styles.popularRibbon}>POPULAR</div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className={styles.rateLabelPopular}>
                                MONTHLY REGULAR
                            </span>
                            <span className={styles.rateDurationPopular}>
                                30 Days
                            </span>
                        </div>
                        <h2 className={styles.ratePricePopular}>₱990</h2>
                        <span className={styles.rateSub}>Student: ₱750</span>
                        <div className={styles.rateFooterPopular}>
                            Most requested plan
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl">
                    <div className={styles.rateCard}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className={styles.rateLabel}>
                                OPTIONAL COACH
                            </span>
                            <span className={styles.rateDuration}>Monthly</span>
                        </div>
                        <div className="d-flex flex-column gap-1 mb-2">
                            <div className="d-flex justify-content-between align-items-center">
                                <span className={styles.rateSubDark}>
                                    Coach Mark
                                </span>
                                <span className={styles.ratePriceSmall}>
                                    ₱500
                                </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className={styles.rateSubDark}>
                                    Coach Analyn
                                </span>
                                <span className={styles.ratePriceSmall}>
                                    ₱600
                                </span>
                            </div>
                        </div>
                        <div className={styles.rateFooter}>
                            Floor personal coaching
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={styles.renewalPanel}
                data-aos="fade-up"
                data-aos-delay="300"
            >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 pb-4 border-bottom border-secondary">
                    <div className="d-flex align-items-center gap-3">
                        <div className={styles.iconBoxPrimary}>
                            <i className="fa-solid fa-rotate"></i>
                        </div>
                        <div>
                            <h3 className={styles.panelTitle}>
                                Quick Counter Renewal
                            </h3>
                            <p className={styles.panelDesc}>
                                Instant renewal processed by front desk clerk
                                with immediate digital proof
                            </p>
                        </div>
                    </div>
                    <span className={styles.badgeOutline}>
                        Front Desk Counter Module
                    </span>
                </div>

                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="row g-4 mb-4">
                        <div className="col-12 col-md-6 col-lg-3">
                            <label className={styles.formLabel}>
                                1. SEARCH MEMBER
                            </label>
                            <div className={styles.inputGroup}>
                                <i className="fa-solid fa-magnifying-glass"></i>
                                <input
                                    type="text"
                                    className={styles.formInputGroup}
                                    defaultValue="Clarisse Domingo"
                                />
                            </div>
                        </div>
                        <div className="col-12 col-md-6 col-lg-3">
                            <label className={styles.formLabel}>
                                2. PLAN SELECTION
                            </label>
                            <select
                                className={styles.formSelect}
                                defaultValue="monthly"
                            >
                                <option value="monthly">
                                    Monthly Regular (₱990)
                                </option>
                                <option value="weekly">
                                    Weekly Pass (₱270)
                                </option>
                                <option value="biweekly">
                                    Two Weeks Pass (₱540)
                                </option>
                            </select>
                        </div>
                        <div className="col-12 col-md-6 col-lg-3">
                            <label className={styles.formLabel}>
                                3. ADD COACH
                            </label>
                            <select
                                className={styles.formSelect}
                                defaultValue="analyn"
                            >
                                <option value="none">None</option>
                                <option value="mark">Coach Mark (+₱500)</option>
                                <option value="analyn">
                                    Coach Analyn (+₱600)
                                </option>
                            </select>
                        </div>
                        <div className="col-12 col-md-6 col-lg-3">
                            <label className={styles.formLabel}>
                                4. PAYMENT METHOD
                            </label>
                            <div className="d-flex gap-2 h-100">
                                <button
                                    type="button"
                                    className={`${styles.btnMethod} ${paymentMethod === "Cash" ? styles.btnMethodActive : ""}`}
                                    onClick={() => setPaymentMethod("Cash")}
                                >
                                    Cash
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.btnMethod} ${paymentMethod === "GCash" ? styles.btnMethodActive : ""}`}
                                    onClick={() => setPaymentMethod("GCash")}
                                >
                                    GCash
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.btnMethod} ${paymentMethod === "Maya" ? styles.btnMethodActive : ""}`}
                                    onClick={() => setPaymentMethod("Maya")}
                                >
                                    Maya
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center pt-4 border-top border-secondary gap-4">
                        <div>
                            <span
                                className="d-block text-secondary mb-1"
                                style={{ fontSize: "0.75rem" }}
                            >
                                Breakdown
                            </span>
                            <span
                                className="text-white"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Monthly Regular (₱990) + Coach Analyn (₱600)
                            </span>
                        </div>
                        <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-4">
                            <div>
                                <span
                                    className="d-block text-secondary mb-1"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Total Due
                                </span>
                                <h2
                                    className="text-primary m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontWeight: "700",
                                    }}
                                >
                                    ₱1,590.00
                                </h2>
                            </div>
                            <button
                                type="submit"
                                className={styles.btnPrimaryFull}
                            >
                                <i className="fa-solid fa-file-invoice-dollar"></i>{" "}
                                Process Renewal & Send Email Receipt
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <div
                className={styles.tablePanel}
                data-aos="fade-up"
                data-aos-delay="400"
            >
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
                    <div>
                        <h4 className={styles.panelTitle}>
                            Subscription Status & Renewals
                        </h4>
                        <p className={styles.panelDesc}>
                            Real-time gym floor roster and upcoming membership
                            expiry
                        </p>
                    </div>
                    <div className={styles.filterGroup}>
                        <button className={styles.filterBtnActive}>
                            Expiring in ≤3 Days{" "}
                            <span className={styles.badgeWarningSmall}>8</span>
                        </button>
                        <button className={styles.filterBtn}>
                            Active Roster{" "}
                            <span className={styles.textMuted}>148</span>
                        </button>
                        <button className={styles.filterBtn}>
                            Expired <span className={styles.textMuted}>28</span>
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className={`table ${styles.customTable}`}>
                        <thead>
                            <tr>
                                <th>MEMBER NAME</th>
                                <th>CONTACT</th>
                                <th>CURRENT PLAN</th>
                                <th>EXPIRATION DATE</th>
                                <th>DAYS REMAINING</th>
                                <th>ASSIGNED COACH</th>
                                <th>QUICK ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarWarning}>
                                            CD
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Clarisse Domingo
                                            </strong>
                                            <span className={styles.subText}>
                                                c.domingo@email.com
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={styles.subText}>
                                        0917-209-1844
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.planBadgeOutline}>
                                        Monthly Regular
                                    </span>
                                </td>
                                <td className="text-white">Nov 16, 2025</td>
                                <td>
                                    <span
                                        className={styles.badgeWarningOutline}
                                    >
                                        Expires Tomorrow
                                    </span>
                                </td>
                                <td className="text-white">Coach Analyn</td>
                                <td>
                                    <button className={styles.btnActionPrimary}>
                                        Renew Now
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarWarning}>
                                            MV
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Marcus Vane
                                            </strong>
                                            <span className={styles.subText}>
                                                m.vane@email.com
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={styles.subText}>
                                        0918-444-2391
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.planBadgeOutline}>
                                        Weekly Pass
                                    </span>
                                </td>
                                <td className="text-white">Nov 17, 2025</td>
                                <td>
                                    <span
                                        className={styles.badgeWarningOutline}
                                    >
                                        2 Days Left
                                    </span>
                                </td>
                                <td className="text-secondary">None</td>
                                <td>
                                    <button className={styles.btnActionPrimary}>
                                        Renew Now
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarWarning}>
                                            AB
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Alyssa Bautista
                                            </strong>
                                            <span className={styles.subText}>
                                                a.bautista@email.com
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={styles.subText}>
                                        0921-310-5890
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.planBadgeOutline}>
                                        Monthly Regular
                                    </span>
                                </td>
                                <td className="text-white">Nov 18, 2025</td>
                                <td>
                                    <span
                                        className={styles.badgeWarningOutline}
                                    >
                                        3 Days Left
                                    </span>
                                </td>
                                <td className="text-white">Coach Mark</td>
                                <td>
                                    <button className={styles.btnActionPrimary}>
                                        Renew Now
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarDanger}>
                                            PC
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Paolo Cruz
                                            </strong>
                                            <span className={styles.subText}>
                                                p.cruz@email.com
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={styles.subText}>
                                        0919-044-2198
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.planBadgeOutline}>
                                        Monthly Regular
                                    </span>
                                </td>
                                <td className="text-white">Nov 13, 2025</td>
                                <td>
                                    <span className={styles.badgeDangerOutline}>
                                        Expired (3 days ago)
                                    </span>
                                </td>
                                <td className="text-secondary">None</td>
                                <td>
                                    <button
                                        className={
                                            styles.btnActionDangerOutline
                                        }
                                    >
                                        Reactivate
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarSuccess}>
                                            RD
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Rodrigo De Vera
                                            </strong>
                                            <span className={styles.subText}>
                                                r.devera@email.com
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={styles.subText}>
                                        0927-994-1102
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.planBadgeOutline}>
                                        Two Weeks Pass
                                    </span>
                                </td>
                                <td className="text-white">Nov 22, 2025</td>
                                <td>
                                    <span
                                        className={styles.badgeSuccessOutline}
                                    >
                                        7 Days Left
                                    </span>
                                </td>
                                <td className="text-secondary">None</td>
                                <td>
                                    <button className={styles.btnActionOutline}>
                                        Extend
                                    </button>
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
                        Showing 5 of 8 urgent renewal candidates
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
        </ClerkLayout>
    );
}
