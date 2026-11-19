import { useEffect, useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberWorkoutPlans.module.css";
import InlineError from "../../components/ui/InlineError";
import { api } from "../../lib/api";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const template = (title, definitions) => ({
    title,
    days: DAYS.map((day, dayOfWeek) => {
        const definition = definitions[day] || { title: "Rest", focus: "Recovery", is_rest: true, exercises: [] };
        return { day_of_week: dayOfWeek, ...definition };
    }),
});

const TEMPLATES = {
    custom: { title: "Custom Program", days: [] },
    ppl: template("Push / Pull / Legs (PPL)", {
        Monday: { title: "Push Day", focus: "Chest & Triceps", exercises: [{ name: "Barbell Bench Press", target_muscle: "Chest", sets: 4, reps: "8-10", weight: 70, unit: "kg", rest_seconds: 90 }, { name: "Overhead Press", target_muscle: "Shoulders", sets: 3, reps: "8-10", weight: 40, unit: "kg", rest_seconds: 75 }] },
        Tuesday: { title: "Pull Day", focus: "Back & Biceps", exercises: [{ name: "Lat Pulldown", target_muscle: "Back", sets: 4, reps: "8-12", weight: 50, unit: "kg", rest_seconds: 90 }, { name: "Seated Cable Row", target_muscle: "Back", sets: 3, reps: "10-12", weight: 45, unit: "kg", rest_seconds: 75 }] },
        Wednesday: { title: "Leg Day", focus: "Quads & Hamstrings", exercises: [{ name: "Barbell Squat", target_muscle: "Quads", sets: 4, reps: "6-10", weight: 80, unit: "kg", rest_seconds: 120 }, { name: "Romanian Deadlift", target_muscle: "Hamstrings", sets: 3, reps: "8-12", weight: 60, unit: "kg", rest_seconds: 90 }] },
        Friday: { title: "Push Day", focus: "Chest & Shoulders", exercises: [{ name: "Incline Dumbbell Press", target_muscle: "Upper Chest", sets: 3, reps: "10-12", weight: 24, unit: "kg", rest_seconds: 75 }] },
        Saturday: { title: "Pull Day", focus: "Back & Biceps", exercises: [{ name: "Dumbbell Row", target_muscle: "Back", sets: 3, reps: "8-12", weight: 24, unit: "kg", rest_seconds: 75 }] },
    }),
    upperLower: template("Upper / Lower Split", {
        Monday: { title: "Upper Body", focus: "Chest, Back & Shoulders", exercises: [{ name: "Barbell Bench Press", target_muscle: "Chest", sets: 4, reps: "8-10", weight: 70, unit: "kg", rest_seconds: 90 }, { name: "Lat Pulldown", target_muscle: "Back", sets: 4, reps: "8-12", weight: 50, unit: "kg", rest_seconds: 90 }] },
        Tuesday: { title: "Lower Body", focus: "Quads, Glutes & Hamstrings", exercises: [{ name: "Barbell Squat", target_muscle: "Quads", sets: 4, reps: "6-10", weight: 80, unit: "kg", rest_seconds: 120 }, { name: "Romanian Deadlift", target_muscle: "Hamstrings", sets: 3, reps: "8-12", weight: 60, unit: "kg", rest_seconds: 90 }] },
        Thursday: { title: "Upper Body", focus: "Chest, Back & Arms", exercises: [{ name: "Incline Dumbbell Press", target_muscle: "Upper Chest", sets: 3, reps: "10-12", weight: 24, unit: "kg", rest_seconds: 75 }, { name: "Seated Cable Row", target_muscle: "Back", sets: 3, reps: "10-12", weight: 45, unit: "kg", rest_seconds: 75 }] },
        Friday: { title: "Lower Body", focus: "Glutes & Hamstrings", exercises: [{ name: "Hip Thrust", target_muscle: "Glutes", sets: 4, reps: "8-12", weight: 70, unit: "kg", rest_seconds: 90 }] },
    }),
    bro: template("Bro Split (Single Muscle Group)", {
        Monday: { title: "Chest", focus: "Chest", exercises: [{ name: "Barbell Bench Press", target_muscle: "Chest", sets: 4, reps: "8-10", weight: 70, unit: "kg", rest_seconds: 90 }] },
        Tuesday: { title: "Back", focus: "Back", exercises: [{ name: "Lat Pulldown", target_muscle: "Back", sets: 4, reps: "8-12", weight: 50, unit: "kg", rest_seconds: 90 }] },
        Wednesday: { title: "Shoulders", focus: "Shoulders", exercises: [{ name: "Overhead Press", target_muscle: "Shoulders", sets: 4, reps: "8-10", weight: 40, unit: "kg", rest_seconds: 90 }] },
        Thursday: { title: "Arms", focus: "Biceps & Triceps", exercises: [{ name: "Cable Curl", target_muscle: "Biceps", sets: 3, reps: "10-12", weight: 20, unit: "kg", rest_seconds: 60 }] },
        Friday: { title: "Legs", focus: "Quads, Glutes & Hamstrings", exercises: [{ name: "Barbell Squat", target_muscle: "Quads", sets: 4, reps: "6-10", weight: 80, unit: "kg", rest_seconds: 120 }] },
    }),
    fullBody: template("Full Body (3x a week)", {
        Monday: { title: "Full Body A", focus: "Full Body", exercises: [{ name: "Barbell Squat", target_muscle: "Quads", sets: 3, reps: "8-10", weight: 60, unit: "kg", rest_seconds: 90 }, { name: "Barbell Bench Press", target_muscle: "Chest", sets: 3, reps: "8-10", weight: 60, unit: "kg", rest_seconds: 90 }] },
        Wednesday: { title: "Full Body B", focus: "Full Body", exercises: [{ name: "Romanian Deadlift", target_muscle: "Hamstrings", sets: 3, reps: "8-12", weight: 50, unit: "kg", rest_seconds: 90 }, { name: "Overhead Press", target_muscle: "Shoulders", sets: 3, reps: "8-10", weight: 30, unit: "kg", rest_seconds: 75 }] },
        Friday: { title: "Full Body C", focus: "Full Body", exercises: [{ name: "Lat Pulldown", target_muscle: "Back", sets: 3, reps: "8-12", weight: 45, unit: "kg", rest_seconds: 75 }, { name: "Goblet Squat", target_muscle: "Quads", sets: 3, reps: "10-12", weight: 24, unit: "kg", rest_seconds: 75 }] },
    }),
};

const templateKeyForTitle = (title) => Object.keys(TEMPLATES).find((key) => TEMPLATES[key].title === title) || "custom";

const emptyDays = () => DAYS.map((day, dayOfWeek) => ({
    day_of_week: dayOfWeek,
    title: "Rest",
    focus: "Recovery",
    is_rest: true,
    exercises: [],
}));

export default function MemberWorkoutPlans() {
    const today = DAYS[new Date().getDay()];
    const [activeDay, setActiveDay] = useState(today);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [showExerciseModal, setShowExerciseModal] = useState(false);
    const [plan, setPlan] = useState(null);
    const [splitDraft, setSplitDraft] = useState(emptyDays);
    const [templateKey, setTemplateKey] = useState("custom");
    const [exerciseForm, setExerciseForm] = useState({ name: "", target_muscle: "", sets: "", reps: "", weight: "", unit: "kg", rest_seconds: "" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState("");

    useEffect(() => {
        api("/member/workout-plan")
            .then(({ plan: loadedPlan }) => {
                setPlan(loadedPlan);
                if (loadedPlan?.title) setTemplateKey(templateKeyForTitle(loadedPlan.title));
                if (loadedPlan?.days?.length) setSplitDraft(DAYS.map((_, dayOfWeek) => loadedPlan.days.find((day) => day.day_of_week === dayOfWeek) || emptyDays()[dayOfWeek]));
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const activePlanDays = plan?.days?.length ? DAYS.map((_, dayOfWeek) => plan.days.find((day) => day.day_of_week === dayOfWeek) || emptyDays()[dayOfWeek]) : emptyDays();
    const selectedDay = activePlanDays[DAYS.indexOf(activeDay)] || emptyDays()[0];
    const allExercises = activePlanDays.flatMap((day) => day.exercises || []);
    const muscleSets = allExercises.reduce((result, exercise) => {
        const muscle = exercise.target_muscle || "Unspecified";
        result[muscle] = (result[muscle] || 0) + (Number(exercise.sets) || 0);
        return result;
    }, {});
    const maxSets = Math.max(...Object.values(muscleSets), 1);
    const focusTags = [...new Set(activePlanDays.filter((day) => !day.is_rest).map((day) => day.focus).filter(Boolean))].slice(0, 5);

    const handleSplitUpdate = (event) => {
        event.preventDefault();
        setPlan((current) => ({
            ...(current || {}),
            title: TEMPLATES[templateKey].title,
            days: splitDraft,
        }));
        setSavedMessage("");
        setShowSplitModal(false);
    };

    const handleExerciseAdd = (event) => {
        event.preventDefault();
        const newExercise = {
            ...exerciseForm,
            id: `draft-${exerciseForm.name}-${activeDay}-${selectedDay.exercises?.length || 0}`,
            day_of_week: DAYS.indexOf(activeDay),
            sets: Number(exerciseForm.sets),
            weight: Number(exerciseForm.weight),
            rest_seconds: Number(exerciseForm.rest_seconds),
            position: selectedDay.exercises?.length || 0,
        };
        setPlan((current) => ({
            ...(current || {}),
            title: current?.title || "Custom Program",
            days: activePlanDays.map((day) => day.day_of_week === DAYS.indexOf(activeDay)
                ? { ...day, is_rest: false, title: day.title === "Rest" ? "Workout" : day.title, exercises: [...(day.exercises || []), newExercise] }
                : day),
        }));
        setExerciseForm({ name: "", target_muscle: "", sets: "", reps: "", weight: "", unit: "kg", rest_seconds: "" });
        setSavedMessage("");
        setShowExerciseModal(false);
    };

    const handleDeleteExercise = (id) => {
        try {
            setPlan((current) => ({ ...current, days: current.days.map((day) => ({ ...day, exercises: (day.exercises || []).filter((exercise) => exercise.id !== id) })) }));
            setSavedMessage("");
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSavePlan = async () => {
        setSaving(true);
        setError("");
        setSavedMessage("");
        try {
            const result = await api("/member/workout-plan", {
                method: "PUT",
                body: {
                    title: plan?.title || "Custom Program",
                    days: activePlanDays,
                },
            });
            setPlan(result.plan);
            setSavedMessage("Workout plan saved.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUnitChange = (id, newUnit) => {
        setPlan((current) => ({ ...current, days: current.days.map((day) => ({ ...day, exercises: (day.exercises || []).map((exercise) => exercise.id === id ? { ...exercise, unit: newUnit } : exercise) })) }));
    };

    return (
        <MemberLayout>
            {error && <InlineError error={error} />}
            {savedMessage && <div className="alert alert-success py-2 mb-3">{savedMessage}</div>}
            {loading && <div className="text-secondary mb-3">Loading workout plan...</div>}
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
                        onClick={() => {
                            setTemplateKey(templateKeyForTitle(plan?.title));
                            setSplitDraft(activePlanDays.map((day) => ({ ...day, exercises: [...(day.exercises || [])] })));
                            setShowSplitModal(true);
                        }}
                    >
                        <i className="fa-solid fa-sliders"></i> Configure Split
                    </button>
                    <button className={styles.btnPrimary} onClick={handleSavePlan} disabled={saving}>
                        <i className="fa-solid fa-check"></i> {saving ? "Saving..." : "Save Plan"}
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
                    {DAYS.slice(1).concat(DAYS[0]).map((day) => {
                        const dayPlan = activePlanDays[DAYS.indexOf(day)];
                        return (
                        <div
                            key={day}
                            className={`${styles.matrixCard} ${activeDay === day ? styles.matrixActive : ""} ${dayPlan.is_rest ? styles.matrixRest : ""} p-3`}
                            onClick={() => setActiveDay(day)}
                        >
                            <span className={styles.matrixDay}>
                                {day.toUpperCase()}
                            </span>
                            <h5 className={styles.matrixTitle}>
                                {dayPlan.title}
                            </h5>
                            <p className={styles.matrixSubtitle}>
                                {dayPlan.focus || "No muscle focus set"}
                            </p>
                            <div
                                className="d-flex justify-content-between align-items-center pt-2 mt-auto border-top border-secondary text-secondary"
                                style={{ fontSize: "0.75rem" }}
                            >
                                <span>
                                    {dayPlan.is_rest
                                        ? "Rest day"
                                        : `${dayPlan.exercises?.length || 0} Exercises`}
                                </span>
                                <i
                                    className={`fa-solid ${dayPlan.is_rest ? "fa-bed" : "fa-arrow-right"}`}
                                ></i>
                            </div>
                        </div>
                        );
                    })}
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
                                    {activeDay}: {selectedDay.title}
                                </h3>
                                <p className={styles.routineTarget}>
                                    Target: {selectedDay.focus || "No muscle focus set"}
                                </p>
                            </div>
                        </div>
                        {!selectedDay.is_rest && (
                            <div className="d-flex gap-4">
                                <div className={styles.statGroup}>
                                    <span>Total Volume</span>
                                    <h4>{(selectedDay.exercises || []).reduce((total, exercise) => total + (Number(exercise.sets) || 0), 0)} Sets</h4>
                                </div>
                                <div className={styles.statGroup}>
                                    <span>Est. Duration</span>
                                    <h4>{Math.max(1, Math.round((selectedDay.exercises || []).reduce((total, exercise) => total + ((Number(exercise.sets) || 0) * 3 + (Number(exercise.rest_seconds) || 0) / 60), 0)))} Mins</h4>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedDay.is_rest ? (
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
                            {(selectedDay.exercises || []).map((ex, index) => (
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
                                                    {ex.target_muscle || "Target muscle not specified"}
                                                </p>
                                            </div>
                                        </div>
                                        <button className={styles.btnIcon} onClick={() => handleDeleteExercise(ex.id)} aria-label={`Remove ${ex.name}`}>
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
                                                        defaultValue={ex.rest_seconds}
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
                            {Object.entries(muscleSets).map(([muscle, sets], index) => (
                            <div
                                key={muscle}
                                className="d-flex align-items-center gap-3 text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                <span style={{ width: "120px" }}>
                                    {muscle}
                                </span>
                                <div className={styles.progressBar}>
                                    <div
                                        style={{
                                            width: `${Math.round((sets / maxSets) * 100)}%`,
                                            backgroundColor: index % 2 ? "var(--green-color)" : "var(--primary-color)",
                                        }}
                                    ></div>
                                </div>
                                <span>{sets} Sets</span>
                            </div>
                            ))}
                            {!Object.keys(muscleSets).length && <span className="text-secondary">No exercises scheduled.</span>}
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
                            {selectedDay.is_rest
                                ? "Today is scheduled for recovery."
                                : `${selectedDay.title} targets ${selectedDay.focus || "the muscles listed in each exercise"}.`}
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                            {focusTags.length ? focusTags.map((focus) => (
                                <span className={styles.focusTag} key={focus}>{focus}</span>
                            )) : <span className="text-secondary">No muscle focus set.</span>}
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
                                <select className={styles.formInput} value={templateKey} onChange={(event) => {
                                    const nextKey = event.target.value;
                                    setTemplateKey(nextKey);
                                    if (nextKey !== "custom") setSplitDraft(TEMPLATES[nextKey].days.map((day) => ({ ...day, exercises: day.exercises.map((exercise) => ({ ...exercise })) })));
                                }}>
                                    <option value="custom">Custom Program</option>
                                    <option value="ppl">Push / Pull / Legs (PPL)</option>
                                    <option value="upperLower">Upper / Lower Split</option>
                                    <option value="bro">Bro Split (Single Muscle Group)</option>
                                    <option value="fullBody">Full Body (3x a week)</option>
                                </select>
                            </div>
                            <div className={styles.splitGrid}>
                                {DAYS.slice(1).concat(DAYS[0]).map((day) => {
                                    const dayOfWeek = DAYS.indexOf(day);
                                    const draft = splitDraft[dayOfWeek];
                                    return (
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
                                            value={draft.title}
                                            onChange={(event) => setSplitDraft((current) => current.map((item, index) => index === dayOfWeek ? { ...item, title: event.target.value, is_rest: false } : item))}
                                            placeholder="e.g. Push Day"
                                        />
                                        <div
                                            className="d-flex align-items-center gap-2"
                                            style={{ width: "70px" }}
                                        >
                                            <input
                                                type="checkbox"
                                                id={`rest-${day}`}
                                                checked={draft.is_rest}
                                                onChange={(event) => setSplitDraft((current) => current.map((item, index) => index === dayOfWeek ? { ...item, is_rest: event.target.checked, title: event.target.checked ? "Rest" : item.title === "Rest" ? "Workout" : item.title } : item))}
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
                                );
                            })}
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
                                    {saving ? "Applying..." : "Apply Split"}
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
                                    value={exerciseForm.name}
                                    onChange={(event) => setExerciseForm((current) => ({ ...current, name: event.target.value }))}
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
                                    value={exerciseForm.target_muscle}
                                    onChange={(event) => setExerciseForm((current) => ({ ...current, target_muscle: event.target.value }))}
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
                                        value={exerciseForm.sets}
                                        onChange={(event) => setExerciseForm((current) => ({ ...current, sets: event.target.value }))}
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
                                        value={exerciseForm.reps}
                                        onChange={(event) => setExerciseForm((current) => ({ ...current, reps: event.target.value }))}
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
                                            value={exerciseForm.weight}
                                            onChange={(event) => setExerciseForm((current) => ({ ...current, weight: event.target.value }))}
                                        />
                                        <select
                                            className={styles.formInput}
                                            style={{ width: "80px" }}
                                            value={exerciseForm.unit}
                                            onChange={(event) => setExerciseForm((current) => ({ ...current, unit: event.target.value }))}
                                        >
                                            <option value="kg">kg</option>
                                            <option value="lbs">lbs</option>
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
                                        value={exerciseForm.rest_seconds}
                                        onChange={(event) => setExerciseForm((current) => ({ ...current, rest_seconds: event.target.value }))}
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
                                    {saving ? "Adding..." : "Add to Routine"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MemberLayout>
    );
}
