import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MemberLayout from "../../components/member/MemberLayout.jsx";
import { SkeletonMemberDashboard } from "../../components/ui/Skeleton";
import styles from "./MemberDashboard.module.css";
import InlineError from "../../components/ui/InlineError";
import { api } from "../../lib/api";

const MANILA_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MemberDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        api("/member/dashboard")
            .then(setDashboard)
            .catch((err) => setError(err.message));
    }, []);
    const membership = dashboard?.membership;
    const plan = membership?.membership_plans;
    const attendance = dashboard?.attendance;
    const workoutPlan = dashboard?.workoutPlan;
    const todayShortName = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        weekday: "short",
    }).format(new Date());
    const todayIndex = MANILA_WEEKDAYS.indexOf(todayShortName);
    const todayPlan = workoutPlan?.days?.find((day) => day.day_of_week === todayIndex);
    const todayName = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        weekday: "long",
    }).format(new Date());
    const expiration = membership?.end_date
        ? new Date(membership.end_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
          })
        : "...";
    const [profile, setProfile] = useState(null);
    useEffect(() => {
        api("/me")
            .then(setProfile)
            .catch((err) => setError(err.message));
    }, []);
    const loading = !dashboard || !profile;
    const getDaysRemainingText = (expiration) => {
        if (!expiration) return "";

        // Set both dates to midnight to ensure an accurate day calculation regardless of current time
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expDate = new Date(expiration);
        expDate.setHours(0, 0, 0, 0);

        const diffInMs = expDate - today;
        const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays < 0) return "Expired";
        if (diffInDays === 0) return "Expires Today";
        if (diffInDays === 1) return "1 Day Remaining";
        return `${diffInDays} Days Remaining`;
    };
    return (
        <MemberLayout>
            {error && <InlineError error={error} />}
            {loading ? (
                <SkeletonMemberDashboard />
            ) : (
                <>
                    <div
                        className={`${styles.welcomeBanner} p-4 mb-4`}
                        data-aos="fade-down"
                    >
                        <div className={styles.bannerBadge}>
                            <i className="fa-solid fa-location-dot"></i> Local
                            Community Member
                        </div>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mt-3 gap-3">
                            <div>
                                <h1 className={styles.welcomeTitle}>
                                    Welcome,{" "}
                                    {profile?.full_name?.split(" ")[0] ||
                                        "member"}
                                    !
                                </h1>
                                <p className={styles.welcomeSub}>
                                    Keep up the momentum!{" "}
                                    {attendance?.visit_count ?? "0"} visits
                                    logged so far.
                                </p>
                            </div>
                            <Link
                                to="/member/notifications"
                                className={styles.noticeBtn}
                            >
                                <i className="fa-solid fa-bullhorn"></i> Notice
                                Board
                            </Link>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div
                            className="col-12 col-md-4"
                            data-aos="fade-up"
                            data-aos-delay="100"
                        >
                            <div className={`${styles.kpiCard} h-100 p-4`}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        Current Plan
                                    </span>
                                    <i className="fa-regular fa-id-card text-primary fs-5"></i>
                                </div>
                                <h3 className={styles.kpiValue}>
                                    {plan?.name || "No active plan"}
                                </h3>
                                <div className={styles.kpiStatusPositive}>
                                    <i className="fa-regular fa-circle-check"></i>{" "}
                                    Active Plan
                                </div>
                            </div>
                        </div>

                        <div
                            className="col-12 col-md-4"
                            data-aos="fade-up"
                            data-aos-delay="200"
                        >
                            <div className={`${styles.kpiCard} h-100 p-4`}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        Total Visits
                                    </span>
                                    <i className="fa-solid fa-chart-line text-primary fs-5"></i>
                                </div>
                                <h3 className={styles.kpiValue}>
                                    {attendance?.visit_count ?? "..."} Visits
                                </h3>
                                <div className={styles.kpiSubPositive}>
                                    <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                    4x this week
                                </div>
                            </div>
                        </div>

                        <div
                            className="col-12 col-md-4"
                            data-aos="fade-up"
                            data-aos-delay="300"
                        >
                            <div className={`${styles.kpiCard} h-100 p-4`}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        Membership Expiration
                                    </span>
                                    <i className="fa-regular fa-calendar-xmark text-primary fs-5"></i>
                                </div>
                                <h3 className={styles.kpiValue}>
                                    {expiration}
                                </h3>
                                <div className={styles.kpiStatusWarning}>
                                    <i className="fa-regular fa-clock"></i>{" "}
                                    {getDaysRemainingText(expiration)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4">
                        <div className="col-12 col-lg-8">
                            <div
                                className={`${styles.panelCard} p-4`}
                                data-aos="fade-right"
                                data-aos-delay="400"
                            >
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start mb-4 gap-3">
                                    <div>
                                        <span className={styles.panelLabel}>
                                            TODAY'S ROUTINE
                                        </span>
                                        <h4 className={styles.panelTitle}>
                                            {todayName}: {todayPlan?.title || "No workout scheduled"}
                                            {todayPlan?.focus ? ` (${todayPlan.focus})` : ""}
                                        </h4>
                                    </div>
                                    <div className={styles.timeEst}>
                                        <i className="fa-solid fa-stopwatch"></i>{" "}
                                        {todayPlan?.is_rest ? "Rest day" : `~${Math.max(1, Math.round((todayPlan?.exercises || []).reduce((total, exercise) => total + ((Number(exercise.sets) || 0) * 3 + (Number(exercise.rest_seconds) || 0) / 60), 0)))} Mins`}
                                    </div>
                                </div>

                                <div className={styles.routineGrid}>
                                    {todayPlan?.is_rest ? (
                                        <p className="text-secondary mb-0">Rest and recovery day. No exercises are scheduled.</p>
                                    ) : todayPlan?.exercises?.length ? todayPlan.exercises.map((exercise, index) => (
                                        <div className={styles.exerciseCard} key={exercise.id || exercise.name}>
                                            <div className={styles.exerciseNum}>{index + 1}</div>
                                            <h5>{exercise.name}</h5>
                                            <p>{exercise.sets || 0} sets · {exercise.reps || "Reps not specified"} reps</p>
                                            <span className={styles.targetArea}>Target: {exercise.target_muscle || "Not specified"}</span>
                                        </div>
                                    )) : (
                                        <p className="text-secondary mb-0">No workout plan has been configured for today.</p>
                                    )}
                                </div>

                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-top border-secondary pt-3 mt-4 gap-3">
                                    <span className={styles.footerNote}>
                                        <i className="fa-regular fa-heart"></i>{" "}
                                        Warmed up with 5 min light jump rope
                                    </span>
                                    <Link
                                        to="/member/workout-plans"
                                        className={styles.footerLink}
                                    >
                                        Go to Workout Plans{" "}
                                        <i className="fa-solid fa-arrow-right"></i>
                                    </Link>
                                </div>
                            </div>

                            <div
                                className={`${styles.panelCard} p-4 mt-4`}
                                data-aos="fade-up"
                                data-aos-delay="500"
                            >
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start mb-4 gap-3">
                                    <div>
                                        <span className={styles.panelLabel}>
                                            ATTENDANCE LOG
                                        </span>
                                        <h4 className={styles.panelTitle}>
                                            Recent Gym Visits
                                        </h4>
                                    </div>
                                    <Link
                                        to="/member/attendance"
                                        className={styles.footerLink}
                                    >
                                        View Full History{" "}
                                        <i className="fa-solid fa-arrow-right"></i>
                                    </Link>
                                </div>

                                <div className="table-responsive">
                                    <table
                                        className={`table ${styles.customTable}`}
                                    >
                                        <thead>
                                            <tr>
                                                <th>DATE</th>
                                                <th>CHECK-IN TIME</th>
                                                <th>CHECK-OUT TIME</th>
                                                <th>METHOD</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <div
                                                        className={
                                                            styles.dateActive
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.dot
                                                            }
                                                        ></span>{" "}
                                                        Today (Nov 17, 2025)
                                                    </div>
                                                </td>
                                                <td>6:15 AM</td>
                                                <td>7:28 AM</td>
                                                <td>
                                                    <span
                                                        className={
                                                            styles.methodBadge
                                                        }
                                                    >
                                                        <i className="fa-regular fa-user"></i>{" "}
                                                        Member Check-in
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Fri, Nov 15, 2025</td>
                                                <td>5:42 PM</td>
                                                <td>7:05 PM</td>
                                                <td>
                                                    <span
                                                        className={
                                                            styles.methodBadgeOutline
                                                        }
                                                    >
                                                        <i className="fa-solid fa-desktop"></i>{" "}
                                                        Front Desk
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Wed, Nov 13, 2025</td>
                                                <td>6:02 AM</td>
                                                <td>7:15 AM</td>
                                                <td>
                                                    <span
                                                        className={
                                                            styles.methodBadge
                                                        }
                                                    >
                                                        <i className="fa-regular fa-user"></i>{" "}
                                                        Member Check-in
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-lg-4">
                            <div
                                className={`${styles.panelCard} p-4`}
                                data-aos="fade-left"
                                data-aos-delay="600"
                            >
                                <div className="d-flex justify-content-between align-items-start mb-4">
                                    <div>
                                        <span className={styles.panelLabel}>
                                            COMMUNITY BOARD
                                        </span>
                                        <h4 className={styles.panelTitle}>
                                            Gym Notices
                                        </h4>
                                    </div>
                                    <i
                                        className="fa-solid fa-bullhorn fs-5"
                                        style={{
                                            color: "var(--primary-color)",
                                        }}
                                    ></i>
                                </div>

                                <div className="d-flex flex-column gap-3">
                                    <div className={`${styles.noticeItem} p-3`}>
                                        <h6 className="d-flex align-items-center gap-2 mb-2 text-white">
                                            <i className="fa-regular fa-clock text-primary"></i>{" "}
                                            Holiday Hours This Friday
                                        </h6>
                                        <p
                                            className="mb-0 text-secondary"
                                            style={{
                                                fontSize: "0.8rem",
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            Gym is open from 6:00 AM to 9:30 PM.
                                            Regular floor coaches available
                                            until 7:00 PM.
                                        </p>
                                    </div>
                                    <div className={`${styles.noticeItem} p-3`}>
                                        <h6 className="d-flex align-items-center gap-2 mb-2 text-white">
                                            <i className="fa-solid fa-dumbbell text-success"></i>{" "}
                                            Tip from Coach Analyn
                                        </h6>
                                        <p
                                            className="mb-0 text-secondary"
                                            style={{
                                                fontSize: "0.8rem",
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            "Remember to stay hydrated and
                                            kindly re-rack your dumbbells &
                                            plates after training. Keep the gym
                                            friendly and safe for all!"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </MemberLayout>
    );
}
