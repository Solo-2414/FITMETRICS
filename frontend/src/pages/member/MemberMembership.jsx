import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberMembership.module.css";

export default function MemberMembership() {
    return (
        <MemberLayout>
            <div className="d-flex flex-column mb-4" data-aos="fade-down">
                <div>
                    <h1 className={styles.pageTitle}>Membership & Passes</h1>
                    <p className={styles.pageDesc}>
                        View your current subscription status, gym pass rates,
                        and personal coaching fees. All transactions are handled
                        directly by our staff.
                    </p>
                </div>
            </div>

            <div className="row mb-5" data-aos="fade-up" data-aos-delay="100">
                <div className="col-12">
                    <div className={`${styles.subscriptionCard} p-4`}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                            <span className={styles.subBadge}>
                                <span className={styles.statusDot}></span>{" "}
                                CURRENT SUBSCRIPTION
                            </span>
                            <span className={styles.validityBadge}>
                                Active · Valid until Nov 28, 2025
                            </span>
                        </div>

                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-4">
                            <div>
                                <h2
                                    className="text-white mb-2"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1.8rem",
                                        fontWeight: "700",
                                    }}
                                >
                                    Monthly Regular Pass
                                </h2>
                                <p
                                    className="text-secondary mb-0"
                                    style={{
                                        fontSize: "0.9rem",
                                        maxWidth: "500px",
                                    }}
                                >
                                    Full 30-day access to free weights, squat
                                    racks, cables & floor gear.
                                </p>
                            </div>
                            <div className={styles.subPrice}>
                                <h3>₱990</h3>
                                <span>/ month</span>
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            <div className="col-12 col-md-6">
                                <div className={`${styles.addonBox} h-100 p-3`}>
                                    <div className={styles.addonIconBox}>
                                        <i className="fa-solid fa-dumbbell"></i>
                                    </div>
                                    <div>
                                        <span className={styles.addonLabel}>
                                            Assigned Coach Add-on
                                        </span>
                                        <h5 className={styles.addonValue}>
                                            Coach Mark
                                        </h5>
                                    </div>
                                    <div className={styles.addonPrice}>
                                        +₱500 / mo
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-md-6">
                                <div className={`${styles.addonBox} h-100 p-3`}>
                                    <div
                                        className={styles.addonIconBoxSecondary}
                                    >
                                        <i className="fa-regular fa-calendar-check"></i>
                                    </div>
                                    <div>
                                        <span className={styles.addonLabel}>
                                            Access Rhythm
                                        </span>
                                        <h5 className={styles.addonValue}>
                                            Unlimited Walk-ins
                                        </h5>
                                    </div>
                                    <div className={styles.addonPrice}>
                                        Monday - Sunday
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-top border-secondary">
                            <div
                                className="d-flex align-items-center gap-2 text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                <i className="fa-solid fa-circle-info text-primary"></i>
                                Membership renewals and coach reassignments are
                                processed by the clerk.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4 mt-5" data-aos="fade-up">
                <span className={styles.sectionLabel}>
                    <i className="fa-solid fa-tag"></i> TRANSPARENT LOCAL
                    PRICING
                </span>
                <h2
                    className="text-white mb-2"
                    style={{
                        fontFamily: "var(--heading-font)",
                        fontSize: "1.5rem",
                        fontWeight: "700",
                    }}
                >
                    Analyn's Fitness Gym Membership Rates
                </h2>
                <p
                    className="text-secondary mb-0"
                    style={{ fontSize: "0.9rem" }}
                >
                    <i className="fa-regular fa-circle-check text-success"></i>{" "}
                    No lock-in contracts, no hidden registration fees. Just pure
                    gym floor access.
                </p>
            </div>

            <div className="row g-4 mb-5">
                <div
                    className="col-12 col-md-6 col-xl-3"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className={`${styles.rateCard} p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    color: "var(--header-text-color)",
                                    fontSize: "1.1rem",
                                    fontWeight: "600",
                                }}
                            >
                                Session / Walk-In
                            </span>
                            <i className="fa-solid fa-ticket text-secondary"></i>
                        </div>
                        <p className={styles.rateDesc}>
                            1 Day complete gym floor access
                        </p>
                        <div className={styles.ratePrice}>
                            <h3>₱90</h3>
                            <span>/ day</span>
                        </div>
                        <div className={styles.studentRate}>
                            Student Rate: ₱70
                        </div>
                        <ul className={styles.rateFeatures}>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Full access to gym equipment
                            </li>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Locker availability (bring your own lock)
                            </li>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Unlimited duration within operating hours
                            </li>
                        </ul>
                    </div>
                </div>

                <div
                    className="col-12 col-md-6 col-xl-3"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <div className={`${styles.rateCard} p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    color: "var(--header-text-color)",
                                    fontSize: "1.1rem",
                                    fontWeight: "600",
                                }}
                            >
                                Weekly Pass
                            </span>
                            <i className="fa-regular fa-calendar text-secondary"></i>
                        </div>
                        <p className={styles.rateDesc}>
                            7 consecutive days unlimited access
                        </p>
                        <div className={styles.ratePrice}>
                            <h3>₱270</h3>
                            <span>/ 7 days</span>
                        </div>
                        <div className={styles.studentRateTransparent}>
                            No lock-in · Start any day
                        </div>
                        <ul className={styles.rateFeatures}>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Great for short trips or targeted 1-week
                                programs
                            </li>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Free locker usage
                            </li>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Full gym privileges
                            </li>
                        </ul>
                    </div>
                </div>

                <div
                    className="col-12 col-md-6 col-xl-3"
                    data-aos="fade-up"
                    data-aos-delay="300"
                >
                    <div className={`${styles.rateCard} p-4`}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    color: "var(--header-text-color)",
                                    fontSize: "1.1rem",
                                    fontWeight: "600",
                                }}
                            >
                                Two Weeks Pass
                            </span>
                            <i className="fa-solid fa-calendar-days text-secondary"></i>
                        </div>
                        <p className={styles.rateDesc}>
                            14 consecutive days access
                        </p>
                        <div className={styles.ratePrice}>
                            <h3>₱540</h3>
                            <span>/ 14 days</span>
                        </div>
                        <div className={styles.studentRateTransparent}>
                            Two full weeks of continuous training
                        </div>
                        <ul className={styles.rateFeatures}>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Excellent for mid-term habits
                            </li>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                No signup fees
                            </li>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Free hydration requests
                            </li>
                        </ul>
                    </div>
                </div>

                <div
                    className="col-12 col-md-6 col-xl-3"
                    data-aos="fade-up"
                    data-aos-delay="400"
                >
                    <div
                        className={`${styles.rateCard} ${styles.activeRate} p-4`}
                    >
                        <div className={styles.activeTag}>
                            YOUR CURRENT PASS
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    color: "var(--header-text-color)",
                                    fontSize: "1.1rem",
                                    fontWeight: "600",
                                }}
                            >
                                Monthly Regular
                            </span>
                            <i className="fa-solid fa-star text-primary"></i>
                        </div>
                        <p className={styles.rateDesc}>Full 30-day access</p>
                        <div className={styles.ratePrice}>
                            <h3>₱990</h3>
                            <span>/ 30 days</span>
                        </div>
                        <div className={styles.studentRateHighlight}>
                            Student Rate: ₱750 / month
                        </div>
                        <ul className={styles.rateFeatures}>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Full 30-day unrestricted access
                            </li>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Eligible for dedicated coach programs
                            </li>
                            <li>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                Priority staff support & advice
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mb-4 mt-5" data-aos="fade-up">
                <span className={styles.sectionLabel}>
                    <i className="fa-solid fa-user-tie"></i> PERSONAL GUIDANCE &
                    FORM CORRECTION
                </span>
                <h2
                    className="text-white mb-2"
                    style={{
                        fontFamily: "var(--heading-font)",
                        fontSize: "1.5rem",
                        fontWeight: "700",
                    }}
                >
                    Available Coaches & Personal Coaching Rates
                </h2>
                <div className="d-flex justify-content-between align-items-end flex-wrap gap-3">
                    <p
                        className="text-secondary mb-0"
                        style={{ fontSize: "0.9rem" }}
                    >
                        Add one-on-one coaching to your membership for form
                        correction, workout programming, and encouragement.
                    </p>
                </div>
            </div>

            <div className="row g-4">
                <div
                    className="col-12 col-lg-6"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className={`${styles.coachCard} p-4`}>
                        <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 mb-4">
                            <div className={styles.coachAvatar}>CA</div>
                            <div>
                                <span className={styles.coachRole}>
                                    Head Coach & Founder
                                </span>
                                <h3
                                    className="text-white my-1"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1.3rem",
                                        fontWeight: "600",
                                    }}
                                >
                                    Coach Analyn
                                </h3>
                                <span className={styles.coachAvailability}>
                                    <i className="fa-regular fa-clock"></i>{" "}
                                    Morning & Afternoon Sessions
                                </span>
                            </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center rounded border border-secondary p-3 mb-4">
                            <div>
                                <span className={styles.pricingLabel}>
                                    Monthly Coaching Add-On
                                </span>
                                <h4
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1.2rem",
                                        fontWeight: "700",
                                    }}
                                >
                                    +₱600{" "}
                                    <span
                                        className="text-secondary"
                                        style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "400",
                                            fontFamily: "var(--text-font)",
                                        }}
                                    >
                                        / month
                                    </span>
                                </h4>
                            </div>
                            <div className="text-end">
                                <span className={styles.pricingLabel}>
                                    Single Session
                                </span>
                                <h4
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1.2rem",
                                        fontWeight: "700",
                                    }}
                                >
                                    ₱100{" "}
                                    <span
                                        className="text-secondary"
                                        style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "400",
                                            fontFamily: "var(--text-font)",
                                        }}
                                    >
                                        / session
                                    </span>
                                </h4>
                            </div>
                        </div>

                        <div className={styles.coachFocus}>
                            <span className={styles.focusLabel}>
                                COACHING FOCUS:
                            </span>
                            <div className="d-flex flex-wrap gap-2">
                                <span
                                    className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Functional Strength
                                </span>
                                <span
                                    className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Form Correction
                                </span>
                                <span
                                    className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Mobility
                                </span>
                                <span
                                    className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Beginner Friendly
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-lg-6"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <div
                        className={`${styles.coachCard} ${styles.activeCoach} p-4`}
                    >
                        <div className={styles.activeTag}>
                            YOUR CURRENT COACH
                        </div>
                        <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 mb-4">
                            <div className={styles.coachAvatarSecondary}>
                                CM
                            </div>
                            <div>
                                <span className={styles.coachRole}>
                                    Strength & Conditioning Coach
                                </span>
                                <h3
                                    className="text-white my-1"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1.3rem",
                                        fontWeight: "600",
                                    }}
                                >
                                    Coach Mark
                                </h3>
                                <span className={styles.coachAvailability}>
                                    <i className="fa-regular fa-clock"></i>{" "}
                                    Afternoon & Evening Sessions
                                </span>
                            </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center rounded border border-secondary p-3 mb-4">
                            <div>
                                <span className={styles.pricingLabel}>
                                    Monthly Coaching Add-On
                                </span>
                                <h4
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1.2rem",
                                        fontWeight: "700",
                                    }}
                                >
                                    +₱500{" "}
                                    <span
                                        className="text-secondary"
                                        style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "400",
                                            fontFamily: "var(--text-font)",
                                        }}
                                    >
                                        / month
                                    </span>
                                </h4>
                            </div>
                            <div className="text-end">
                                <span className={styles.pricingLabel}>
                                    Single Session
                                </span>
                                <h4
                                    className="text-white m-0"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1.2rem",
                                        fontWeight: "700",
                                    }}
                                >
                                    ₱80{" "}
                                    <span
                                        className="text-secondary"
                                        style={{
                                            fontSize: "0.8rem",
                                            fontWeight: "400",
                                            fontFamily: "var(--text-font)",
                                        }}
                                    >
                                        / session
                                    </span>
                                </h4>
                            </div>
                        </div>

                        <div className={styles.coachFocus}>
                            <span className={styles.focusLabel}>
                                COACHING FOCUS:
                            </span>
                            <div className="d-flex flex-wrap gap-2">
                                <span
                                    className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Barbell Mechanics
                                </span>
                                <span
                                    className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Powerlifting
                                </span>
                                <span
                                    className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Hypertrophy Isolation
                                </span>
                                <span
                                    className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    Muscle Building
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MemberLayout>
    );
}
