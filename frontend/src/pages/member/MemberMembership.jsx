import { useEffect, useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberMembership.module.css";
import InlineError from "../../components/ui/InlineError";
import { api } from "../../lib/api";
import { SkeletonCards } from "../../components/ui/Skeleton";

const MEMBERSHIP_PLANS = [
    {
        name: "Session / Walk-In",
        matchKeys: ["session", "walk-in", "walk in"],
        icon: "fa-solid fa-ticket",
        desc: "1 Day complete gym floor access",
        price: "₱90",
        unit: "/ day",
        subNote: "Student Rate: ₱70",
        subNoteType: "student", // uses styles.studentRate
        features: [
            "Full access to gym equipment",
            "Locker availability (bring your own lock)",
            "Unlimited duration within operating hours",
        ],
    },
    {
        name: "Weekly Pass",
        matchKeys: ["weekly"],
        icon: "fa-regular fa-calendar",
        desc: "7 consecutive days unlimited access",
        price: "₱270",
        unit: "/ 7 days",
        subNote: "No lock-in · Start any day",
        subNoteType: "transparent", // uses styles.studentRateTransparent
        features: [
            "Great for short trips or targeted 1-week programs",
            "Free locker usage",
            "Full gym privileges",
        ],
    },
    {
        name: "Two Weeks Pass",
        matchKeys: ["two weeks", "2 weeks", "14 days"],
        icon: "fa-solid fa-calendar-days",
        desc: "14 consecutive days access",
        price: "₱540",
        unit: "/ 14 days",
        subNote: "Two full weeks of continuous training",
        subNoteType: "transparent",
        features: [
            "Excellent for mid-term habits",
            "No signup fees",
            "Free hydration requests",
        ],
    },
    {
        name: "Monthly Regular",
        matchKeys: ["monthly"],
        icon: "fa-solid fa-star",
        desc: "Full 30-day access",
        price: "₱990",
        unit: "/ 30 days",
        subNote: "Student Rate: ₱750 / month",
        subNoteType: "highlight", // uses styles.studentRateHighlight
        features: [
            "Full 30-day unrestricted access",
            "Eligible for dedicated coach programs",
            "Priority staff support & advice",
        ],
    },
];

const COACHES_LIST = [
    {
        initials: "CA",
        role: "Head Coach & Founder",
        name: "Coach Analyn",
        matchKey: "analyn",
        availability: "Morning & Afternoon Sessions",
        monthlyPrice: "+₱600",
        sessionPrice: "₱100",
        focus: [
            "Functional Strength",
            "Form Correction",
            "Mobility",
            "Beginner Friendly",
        ],
    },
    {
        initials: "CM",
        role: "Strength & Conditioning Coach",
        name: "Coach Mark",
        matchKey: "mark",
        availability: "Afternoon & Evening Sessions",
        monthlyPrice: "+₱500",
        sessionPrice: "₱80",
        focus: [
            "Barbell Mechanics",
            "Powerlifting",
            "Hypertrophy Isolation",
            "Muscle Building",
        ],
    },
];

export default function MemberMembership() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api("/member/membership")
            .then(setData)
            .catch((err) => setError(err.message));
    }, []);

    const current = data?.current;
    const currentPlan = current?.membership_plans;

    // Normalize strings for reliable matching against DB values
    const activePlanName = (currentPlan?.name || "").toLowerCase().trim();
    const activeCoachName = (current?.coaches?.display_name || "")
        .toLowerCase()
        .trim();

    const isPlanActive = (plan) => {
        if (!activePlanName) return false;
        return (
            activePlanName === plan.name.toLowerCase() ||
            plan.matchKeys.some((key) => activePlanName.includes(key))
        );
    };

    const isCoachActive = (coach) => {
        if (!activeCoachName) return false;
        return (
            activeCoachName === coach.name.toLowerCase() ||
            activeCoachName.includes(coach.matchKey) ||
            coach.name.toLowerCase().includes(activeCoachName)
        );
    };

    return (
        <MemberLayout>
            {error && <InlineError error={error} />}
            {!data ? (
                <SkeletonCards count={4} />
            ) : (
                <>
                    <div
                        className="d-flex flex-column mb-4"
                        data-aos="fade-down"
                    >
                        <div>
                            <h1 className={styles.pageTitle}>
                                Membership & Passes
                            </h1>
                            <p className={styles.pageDesc}>
                                View your current subscription status, gym pass
                                rates, and personal coaching fees. All
                                transactions are handled directly by our staff.
                            </p>
                        </div>
                    </div>

                    <div
                        className="row mb-5"
                        data-aos="fade-up"
                        data-aos-delay="100"
                    >
                        <div className="col-12">
                            <div className={`${styles.subscriptionCard} p-4`}>
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                                    <span className={styles.subBadge}>
                                        <span
                                            className={styles.statusDot}
                                        ></span>{" "}
                                        CURRENT SUBSCRIPTION
                                    </span>
                                    <span className={styles.validityBadge}>
                                        {current
                                            ? `${current.status} · Valid until ${new Date(
                                                  current.end_date,
                                              ).toLocaleDateString()}`
                                            : "Loading membership..."}
                                    </span>
                                </div>

                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-4">
                                    <div>
                                        <h2
                                            className="text-white mb-2"
                                            style={{
                                                fontFamily:
                                                    "var(--heading-font)",
                                                fontSize: "1.8rem",
                                                fontWeight: "700",
                                            }}
                                        >
                                            {currentPlan?.name ||
                                                "No active membership"}
                                        </h2>
                                        <p
                                            className="text-secondary mb-0"
                                            style={{
                                                fontSize: "0.9rem",
                                                maxWidth: "500px",
                                            }}
                                        >
                                            {currentPlan?.description ||
                                                "Membership details will appear here once your plan is active."}
                                        </p>
                                    </div>
                                    <div className={styles.subPrice}>
                                        <h3>
                                            ₱
                                            {currentPlan
                                                ? Number(
                                                      currentPlan.price,
                                                  ).toLocaleString()
                                                : "..."}
                                        </h3>
                                        <span>/ month</span>
                                    </div>
                                </div>

                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-md-6">
                                        <div
                                            className={`${styles.addonBox} h-100 p-3`}
                                        >
                                            <div
                                                className={styles.addonIconBox}
                                            >
                                                <i className="fa-solid fa-dumbbell"></i>
                                            </div>
                                            <div>
                                                <span
                                                    className={
                                                        styles.addonLabel
                                                    }
                                                >
                                                    Assigned Coach Add-on
                                                </span>
                                                <h5
                                                    className={
                                                        styles.addonValue
                                                    }
                                                >
                                                    {current?.coaches
                                                        ?.display_name ||
                                                        "No coach assigned"}
                                                </h5>
                                            </div>
                                            <div className={styles.addonPrice}>
                                                +₱500 / mo
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <div
                                            className={`${styles.addonBox} h-100 p-3`}
                                        >
                                            <div
                                                className={
                                                    styles.addonIconBoxSecondary
                                                }
                                            >
                                                <i className="fa-regular fa-calendar-check"></i>
                                            </div>
                                            <div>
                                                <span
                                                    className={
                                                        styles.addonLabel
                                                    }
                                                >
                                                    Access Rhythm
                                                </span>
                                                <h5
                                                    className={
                                                        styles.addonValue
                                                    }
                                                >
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
                                        Membership renewals and coach
                                        reassignments are processed by the
                                        clerk.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TRANSPARENT LOCAL PRICING */}
                    <div className="mb-4 mt-5" data-aos="fade-up">
                        <span className={styles.sectionLabel}>
                            <i className="fa-solid fa-tag"></i> TRANSPARENT
                            LOCAL PRICING
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
                            No lock-in contracts, no hidden registration fees.
                            Just pure gym floor access.
                        </p>
                    </div>

                    <div className="row g-4 mb-5">
                        {MEMBERSHIP_PLANS.map((plan, index) => {
                            const active = isPlanActive(plan);

                            const subNoteClass =
                                plan.subNoteType === "student"
                                    ? styles.studentRate
                                    : plan.subNoteType === "highlight"
                                      ? styles.studentRateHighlight
                                      : styles.studentRateTransparent;

                            return (
                                <div
                                    key={plan.name}
                                    className="col-12 col-md-6 col-xl-3"
                                    data-aos="fade-up"
                                    data-aos-delay={(index + 1) * 100}
                                >
                                    <div
                                        className={`${styles.rateCard} ${
                                            active ? styles.activeRate : ""
                                        } p-4`}
                                    >
                                        {active && (
                                            <div className={styles.activeTag}>
                                                YOUR CURRENT PASS
                                            </div>
                                        )}
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span
                                                style={{
                                                    fontFamily:
                                                        "var(--heading-font)",
                                                    color: "var(--header-text-color)",
                                                    fontSize: "1.1rem",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {plan.name}
                                            </span>
                                            <i
                                                className={`${plan.icon} ${
                                                    active
                                                        ? "text-primary"
                                                        : "text-secondary"
                                                }`}
                                            ></i>
                                        </div>
                                        <p className={styles.rateDesc}>
                                            {plan.desc}
                                        </p>
                                        <div className={styles.ratePrice}>
                                            <h3>{plan.price}</h3>
                                            <span>{plan.unit}</span>
                                        </div>
                                        <div className={subNoteClass}>
                                            {plan.subNote}
                                        </div>
                                        <ul className={styles.rateFeatures}>
                                            {plan.features.map((feat) => (
                                                <li key={feat}>
                                                    <i className="fa-regular fa-circle-check"></i>{" "}
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* PERSONAL GUIDANCE & FORM CORRECTION */}
                    <div className="mb-4 mt-5" data-aos="fade-up">
                        <span className={styles.sectionLabel}>
                            <i className="fa-solid fa-user-tie"></i> PERSONAL
                            GUIDANCE & FORM CORRECTION
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
                                Add one-on-one coaching to your membership for
                                form correction, workout programming, and
                                encouragement.
                            </p>
                        </div>
                    </div>

                    <div className="row g-4">
                        {COACHES_LIST.map((coach, index) => {
                            const active = isCoachActive(coach);

                            return (
                                <div
                                    key={coach.name}
                                    className="col-12 col-lg-6"
                                    data-aos="fade-up"
                                    data-aos-delay={(index + 1) * 100}
                                >
                                    <div
                                        className={`${styles.coachCard} ${
                                            active ? styles.activeCoach : ""
                                        } p-4`}
                                    >
                                        {active && (
                                            <div className={styles.activeTag}>
                                                YOUR CURRENT COACH
                                            </div>
                                        )}
                                        <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 mb-4">
                                            <div
                                                className={
                                                    active
                                                        ? styles.coachAvatarSecondary
                                                        : styles.coachAvatar
                                                }
                                            >
                                                {coach.initials}
                                            </div>
                                            <div>
                                                <span
                                                    className={styles.coachRole}
                                                >
                                                    {coach.role}
                                                </span>
                                                <h3
                                                    className="text-white my-1"
                                                    style={{
                                                        fontFamily:
                                                            "var(--heading-font)",
                                                        fontSize: "1.3rem",
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    {coach.name}
                                                </h3>
                                                <span
                                                    className={
                                                        styles.coachAvailability
                                                    }
                                                >
                                                    <i className="fa-regular fa-clock"></i>{" "}
                                                    {coach.availability}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center rounded border border-secondary p-3 mb-4">
                                            <div>
                                                <span
                                                    className={
                                                        styles.pricingLabel
                                                    }
                                                >
                                                    Monthly Coaching Add-On
                                                </span>
                                                <h4
                                                    className="text-white m-0"
                                                    style={{
                                                        fontFamily:
                                                            "var(--heading-font)",
                                                        fontSize: "1.2rem",
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {coach.monthlyPrice}{" "}
                                                    <span
                                                        className="text-secondary"
                                                        style={{
                                                            fontSize: "0.8rem",
                                                            fontWeight: "400",
                                                            fontFamily:
                                                                "var(--text-font)",
                                                        }}
                                                    >
                                                        / month
                                                    </span>
                                                </h4>
                                            </div>
                                            <div className="text-end">
                                                <span
                                                    className={
                                                        styles.pricingLabel
                                                    }
                                                >
                                                    Single Session
                                                </span>
                                                <h4
                                                    className="text-white m-0"
                                                    style={{
                                                        fontFamily:
                                                            "var(--heading-font)",
                                                        fontSize: "1.2rem",
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {coach.sessionPrice}{" "}
                                                    <span
                                                        className="text-secondary"
                                                        style={{
                                                            fontSize: "0.8rem",
                                                            fontWeight: "400",
                                                            fontFamily:
                                                                "var(--text-font)",
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
                                                {coach.focus.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="bg-secondary bg-opacity-25 text-secondary px-2 py-1 rounded"
                                                        style={{
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </MemberLayout>
    );
}
