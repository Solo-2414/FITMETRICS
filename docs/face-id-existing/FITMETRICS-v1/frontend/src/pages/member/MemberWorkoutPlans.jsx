import { useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberWorkoutPlans.module.css";

export default function MemberWorkoutPlans() {
    const [activeDay, setActiveDay] = useState("Monday");
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [showExerciseModal, setShowExerciseModal] = useState(false);

    const [weeklySplit] = useState({
        Monday: { title: "Push Day", focus: "Chest & Triceps", isRest: false },
        Tuesday: { title: "Pull Day", focus: "Back & Biceps", isRest: false },
        Wednesday: {
            title: "Legs & Abs",
            focus: "Quads & Core",
            isRest: false,
        },
        Thursday: { title: "Recovery", focus: "Mobility / Rest", isRest: true },
        Friday: {
            title: "Push Focus",
            focus: "Shoulders & Upper",
            isRest: false,
        },
        Saturday: {
            title: "Pull & Legs",
            focus: "Back & Hamstrings",
            isRest: false,
        },
        Sunday: {
            title: "Full Rest",
            focus: "Full Rejuvenation",
            isRest: true,
        },
    });

    const [exercises, setExercises] = useState([
        {
            id: 1,
            name: "Barbell Flat Bench Press",
            target: "Primary Compound · Chest Power",
            sets: 4,
            reps: "8-10",
            weight: 70,
            unit: "kg",
            rest: 90,
        },
        {
            id: 2,
            name: "Incline Dumbbell Bench Press",
            target: "Hypertrophy · Clavicular Head",
            sets: 3,
            reps: "10-12",
            weight: 24,
            unit: "kg",
            rest: 60,
        },
        {
            id: 3,
            name: "Standing Overhead Barbell Press",
            target: "Overhead Vertical Push · Core Stability",
            sets: 3,
            reps: "8-10",
            weight: 40,
            unit: "kg",
            rest: 75,
        },
        {
            id: 4,
            name: "Cable Lateral Raises",
            target: "Medial Deltoid Isolation",
            sets: 3,
            reps: "12-15",
            weight: 7.5,
            unit: "kg",
            rest: 45,
        },
    ]);

    const handleSplitUpdate = (e) => {
        e.preventDefault();
        setShowSplitModal(false);
    };

    const handleExerciseAdd = (e) => {
        e.preventDefault();
        setShowExerciseModal(false);
    };

    const handleUnitChange = (id, newUnit) => {
        setExercises(
            exercises.map((ex) =>
                ex.id === id ? { ...ex, unit: newUnit } : ex,
            ),
        );
    };

    return (
        <MemberLayout>
            <div
                className="d-flex align-items-center gap-2 mb-3 text-secondary"
                style={{ fontSize: "0.8rem" }}
                data-aos="fade-down"
            >
                <span>Dashboard</span>
                <i
                    className="fa-solid fa-chevron-right"
                    style={{ fontSize: "0.6rem" }}
                ></i>
                <span className="text-white fw-bold">Workout Plans</span>
            </div>

            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3"
                data-aos="fade-down"
                data-aos-delay="100"
            >
                <div>
                    <span className={styles.sectionTag}>
                        <i className="fa-solid fa-layer-group"></i> Active
                        Program · Current Cycle
                    </span>
                    <h1 className={styles.pageTitle}>
                        My Workout Routine & Weekly Schedule
                    </h1>
                    <p className={styles.pageDesc}>
                        Personalized training split at Analyn's Fitness Gym
                    </p>
                </div>
                <div className="d-flex flex-column flex-sm-row gap-2">
                    <button
                        className={styles.btnSecondary}
                        onClick={() => setShowSplitModal(true)}
                    >
                        <i className="fa-solid fa-sliders"></i> Configure Split
                    </button>
                    <button className={styles.btnPrimary}>
                        <i className="fa-solid fa-check"></i> Save Plan
                    </button>
                </div>
            </div>

            <div className="mb-5" data-aos="fade-up" data-aos-delay="200">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className={styles.matrixHeading}>
                        <i className="fa-regular fa-calendar-days"></i> Weekly
                        Training Matrix
                    </h4>
                    <span className={styles.matrixHint}>
                        Click day to view or edit exercises
                    </span>
                </div>
                <div className={styles.matrixGrid}>
                    {Object.keys(weeklySplit).map((day) => (
                        <div
                            key={day}
                            className={`${styles.matrixCard} ${activeDay === day ? styles.matrixActive : ""} ${weeklySplit[day].isRest ? styles.matrixRest : ""} p-3`}
                            onClick={() => setActiveDay(day)}
                        >
                            <span className={styles.matrixDay}>
                                {day.toUpperCase()}
                            </span>
                            <h5 className={styles.matrixTitle}>
                                {weeklySplit[day].title}
                            </h5>
                            <p className={styles.matrixSubtitle}>
                                {weeklySplit[day].focus}
                            </p>
                            <div
                                className="d-flex justify-content-between align-items-center pt-2 mt-auto border-top border-secondary text-secondary"
                                style={{ fontSize: "0.75rem" }}
                            >
                                <span>
                                    {weeklySplit[day].isRest
                                        ? "0 Exercises"
                                        : "4 Exercises"}
                                </span>
                                <i
                                    className={`fa-solid ${weeklySplit[day].isRest ? "fa-bed" : "fa-arrow-right"}`}
                                ></i>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="row g-4 mt-2">
                <div className="col-12 col-lg-8">
                    <div
                        className="d-flex flex-column flex-md-row justify-content-between align-items-md-center bg-opacity-50 border border-secondary rounded p-4 mb-4 gap-3"
                        data-aos="fade-right"
                        data-aos-delay="300"
                    >
                        <div className="d-flex align-items-center gap-3">
                            <div className={styles.routineIcon}>
                                <i className="fa-solid fa-dumbbell"></i>
                            </div>
                            <div>
                                <h3 className={styles.routineTitle}>
                                    {activeDay}: {weeklySplit[activeDay].title}
                                </h3>
                                <p className={styles.routineTarget}>
                                    Target: {weeklySplit[activeDay].focus}
                                </p>
                            </div>
                        </div>
                        {!weeklySplit[activeDay].isRest && (
                            <div className="d-flex gap-4">
                                <div className={styles.statGroup}>
                                    <span>Total Volume</span>
                                    <h4>13 Sets</h4>
                                </div>
                                <div className={styles.statGroup}>
                                    <span>Est. Duration</span>
                                    <h4>55 Mins</h4>
                                </div>
                            </div>
                        )}
                    </div>

                    {weeklySplit[activeDay].isRest ? (
                        <div
                            className={`${styles.restDayState} p-5`}
                            data-aos="fade-up"
                            data-aos-delay="400"
                        >
                            <i className="fa-solid fa-mug-hot"></i>
                            <h3>Rest & Recovery Day</h3>
                            <p>
                                No exercises scheduled. Focus on hydration,
                                mobility work, and muscle recovery.
                            </p>
                            <button
                                className={`${styles.btnSecondary} mx-auto`}
                                onClick={() => setShowExerciseModal(true)}
                            >
                                Override & Add Exercise
                            </button>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {exercises.map((ex, index) => (
                                <div
                                    key={ex.id}
                                    className={`${styles.exerciseCard} p-4`}
                                >
                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start mb-4 gap-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <span
                                                className={
                                                    styles.exerciseNumber
                                                }
                                            >
                                                {index + 1}
                                            </span>
                                            <div>
                                                <h4
                                                    className={
                                                        styles.exerciseName
                                                    }
                                                >
                                                    {ex.name}
                                                </h4>
                                                <p
                                                    className={
                                                        styles.exerciseTarget
                                                    }
                                                >
                                                    {ex.target}
                                                </p>
                                            </div>
                                        </div>
                                        <button className={styles.btnIcon}>
                                            <i className="fa-regular fa-trash-can"></i>
                                        </button>
                                    </div>

                                    <div className="row g-2">
                                        <div className="col-6 col-sm-3">
                                            <div
                                                className={`${styles.metricBox} p-2 h-100`}
                                            >
                                                <span
                                                    className={
                                                        styles.metricLabel
                                                    }
                                                >
                                                    Sets
                                                </span>
                                                <div className="d-flex align-items-center gap-1">
                                                    <input
                                                        type="number"
                                                        defaultValue={ex.sets}
                                                        className={
                                                            styles.metricInput
                                                        }
                                                    />
                                                    <span
                                                        className={
                                                            styles.metricUnit
                                                        }
                                                    >
                                                        sets
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6 col-sm-3">
                                            <div
                                                className={`${styles.metricBox} p-2 h-100`}
                                            >
                                                <span
                                                    className={
                                                        styles.metricLabel
                                                    }
                                                >
                                                    Reps
                                                </span>
                                                <div className="d-flex align-items-center gap-1">
                                                    <input
                                                        type="text"
                                                        defaultValue={ex.reps}
                                                        className={
                                                            styles.metricInput
                                                        }
                                                    />
                                                    <span
                                                        className={
                                                            styles.metricUnit
                                                        }
                                                    >
                                                        reps
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6 col-sm-3">
                                            <div
                                                className={`${styles.metricBox} p-2 h-100`}
                                            >
                                                <span
                                                    className={
                                                        styles.metricLabel
                                                    }
                                                >
                                                    Target Weight
                                                </span>
                                                <div className="d-flex align-items-center gap-1">
                                                    <input
                                                        type="number"
                                                        defaultValue={ex.weight}
                                                        className={
                                                            styles.metricInput
                                                        }
                                                        step="0.5"
                                                    />
                                                    <select
                                                        className={
                                                            styles.metricSelect
                                                        }
                                                        value={ex.unit}
                                                        onChange={(e) =>
                                                            handleUnitChange(
                                                                ex.id,
                                                                e.target.value,
                                                            )
                                                        }
                                                    >
                                                        <option value="kg">
                                                            kg
                                                        </option>
                                                        <option value="lbs">
                                                            lbs
                                                        </option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6 col-sm-3">
                                            <div
                                                className={`${styles.metricBox} p-2 h-100`}
                                            >
                                                <span
                                                    className={
                                                        styles.metricLabel
                                                    }
                                                >
                                                    Rest Interval
                                                </span>
                                                <div className="d-flex align-items-center gap-1">
                                                    <input
                                                        type="number"
                                                        defaultValue={ex.rest}
                                                        className={
                                                            styles.metricInput
                                                        }
                                                    />
                                                    <span
                                                        className={
                                                            styles.metricUnit
                                                        }
                                                    >
                                                        sec
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                className={styles.btnAddExercise}
                                onClick={() => setShowExerciseModal(true)}
                            >
                                <i className="fa-solid fa-plus"></i> Add New
                                Exercise
                            </button>
                        </div>
                    )}
                </div>

                <div className="col-12 col-lg-4">
                    <div
                        className={`${styles.sideWidget} p-4`}
                        data-aos="fade-left"
                        data-aos-delay="400"
                    >
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="fa-solid fa-chart-pie text-primary fs-5"></i>
                            <h4
                                className="text-white m-0"
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    fontSize: "1rem",
                                }}
                            >
                                Weekly Volume Analysis
                            </h4>
                        </div>
                        <div className="d-flex flex-column gap-3">
                            <div
                                className="d-flex align-items-center gap-3 text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                <span style={{ width: "120px" }}>
                                    Chest & Front Delts
                                </span>
                                <div className={styles.progressBar}>
                                    <div
                                        style={{
                                            width: "80%",
                                            backgroundColor:
                                                "var(--primary-color)",
                                        }}
                                    ></div>
                                </div>
                                <span>24 Sets</span>
                            </div>
                            <div
                                className="d-flex align-items-center gap-3 text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                <span style={{ width: "120px" }}>
                                    Back & Biceps
                                </span>
                                <div className={styles.progressBar}>
                                    <div
                                        style={{
                                            width: "75%",
                                            backgroundColor:
                                                "var(--green-color)",
                                        }}
                                    ></div>
                                </div>
                                <span>20 Sets</span>
                            </div>
                            <div
                                className="d-flex align-items-center gap-3 text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                <span style={{ width: "120px" }}>
                                    Legs & Glutes
                                </span>
                                <div className={styles.progressBar}>
                                    <div
                                        style={{
                                            width: "60%",
                                            backgroundColor: "#f59e0b",
                                        }}
                                    ></div>
                                </div>
                                <span>16 Sets</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`${styles.sideWidget} p-4 mt-4`}
                        data-aos="fade-left"
                        data-aos-delay="500"
                    >
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="fa-solid fa-crosshairs text-primary fs-5"></i>
                            <h4
                                className="text-white m-0"
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    fontSize: "1rem",
                                }}
                            >
                                Target Muscle Focus
                            </h4>
                        </div>
                        <p
                            className="text-secondary mb-3"
                            style={{ fontSize: "0.85rem", lineHeight: "1.5" }}
                        >
                            Your current split heavily biases upper body pushing
                            power. Consider balancing your pull ratio next
                            cycle.
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                            <span className={styles.focusTag}>Hypertrophy</span>
                            <span className={styles.focusTag}>
                                Progressive Overload
                            </span>
                            <span className={styles.focusTag}>
                                Compound Lifts
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {showSplitModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className="d-flex justify-content-between align-items-center p-4 border-bottom border-secondary">
                            <h3
                                className="text-white m-0"
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    fontSize: "1.2rem",
                                }}
                            >
                                Configure Weekly Split
                            </h3>
                            <button
                                className="bg-transparent border-0 text-secondary fs-5"
                                onClick={() => setShowSplitModal(false)}
                            >
                                <i className="fa-solid fa-xmark hover-primary"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSplitUpdate} className="p-4">
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Routine Template
                                </label>
                                <select className={styles.formInput}>
                                    <option>Custom Program</option>
                                    <option>Push / Pull / Legs (PPL)</option>
                                    <option>Upper / Lower Split</option>
                                    <option>
                                        Bro Split (Single Muscle Group)
                                    </option>
                                    <option>Full Body (3x a week)</option>
                                </select>
                            </div>
                            <div className={styles.splitGrid}>
                                {Object.keys(weeklySplit).map((day) => (
                                    <div
                                        key={day}
                                        className="d-flex align-items-center gap-3"
                                    >
                                        <span
                                            className="text-secondary fw-bold"
                                            style={{
                                                width: "40px",
                                                fontSize: "0.8rem",
                                            }}
                                        >
                                            {day.substring(0, 3)}
                                        </span>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            defaultValue={
                                                weeklySplit[day].title
                                            }
                                            placeholder="e.g. Push Day"
                                        />
                                        <div
                                            className="d-flex align-items-center gap-2"
                                            style={{ width: "70px" }}
                                        >
                                            <input
                                                type="checkbox"
                                                id={`rest-${day}`}
                                                defaultChecked={
                                                    weeklySplit[day].isRest
                                                }
                                            />
                                            <label
                                                className="text-secondary m-0"
                                                style={{
                                                    fontSize: "0.8rem",
                                                    cursor: "pointer",
                                                }}
                                                htmlFor={`rest-${day}`}
                                            >
                                                Rest
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="d-flex justify-content-end gap-3 mt-4 pt-4 border-top border-secondary">
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setShowSplitModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnPrimary}
                                >
                                    Apply Split
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showExerciseModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className="d-flex justify-content-between align-items-center p-4 border-bottom border-secondary">
                            <h3
                                className="text-white m-0"
                                style={{
                                    fontFamily: "var(--heading-font)",
                                    fontSize: "1.2rem",
                                }}
                            >
                                Add New Exercise
                            </h3>
                            <button
                                className="bg-transparent border-0 text-secondary fs-5"
                                onClick={() => setShowExerciseModal(false)}
                            >
                                <i className="fa-solid fa-xmark hover-primary"></i>
                            </button>
                        </div>
                        <form onSubmit={handleExerciseAdd} className="p-4">
                            <div className="mb-3">
                                <label className={styles.formLabel}>
                                    Exercise Name
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. Barbell Squat"
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className={styles.formLabel}>
                                    Target Muscle / Notes
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. Primary Quads"
                                    required
                                />
                            </div>
                            <div className="row g-3 mb-4">
                                <div className="col-6">
                                    <label className={styles.formLabel}>
                                        Sets
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        placeholder="3"
                                        required
                                    />
                                </div>
                                <div className="col-6">
                                    <label className={styles.formLabel}>
                                        Reps
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="8-12"
                                        required
                                    />
                                </div>
                                <div className="col-6">
                                    <label className={styles.formLabel}>
                                        Weight Target
                                    </label>
                                    <div className="d-flex gap-2">
                                        <input
                                            type="number"
                                            className={styles.formInput}
                                            placeholder="50"
                                            required
                                        />
                                        <select
                                            className={styles.formInput}
                                            style={{ width: "80px" }}
                                        >
                                            <option>kg</option>
                                            <option>lbs</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <label className={styles.formLabel}>
                                        Rest (Seconds)
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        placeholder="60"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="d-flex justify-content-end gap-3 mt-4 pt-4 border-top border-secondary">
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setShowExerciseModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnPrimary}
                                >
                                    Add to Routine
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MemberLayout>
    );
}
