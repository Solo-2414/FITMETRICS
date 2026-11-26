import { useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberVideoTutorials.module.css";

export default function MemberVideoTutorials() {
    const [activeFilter, setActiveFilter] = useState("All workouts");

    const filters = [
        "All workouts",
        "Chest & Triceps",
        "Back & Biceps",
        "Legs & Glutes",
        "Shoulders & Core",
        "Cardio and Mobility",
        "Beginner Guides",
    ];

    const recommendedVideos = [
        {
            id: 1,
            title: "Dumbbell Incline Press",
            tag: "Chest & Triceps",
            duration: "4:15",
            views: "1.2k",
        },
        {
            id: 2,
            title: "Tricep Rope Pushdowns",
            tag: "Chest & Triceps",
            duration: "3:40",
            views: "850",
        },
        {
            id: 3,
            title: "Cable Crossovers",
            tag: "Chest & Triceps",
            duration: "5:20",
            views: "2.1k",
        },
        {
            id: 4,
            title: "Dumbbell Flyes",
            tag: "Chest & Triceps",
            duration: "4:05",
            views: "930",
        },
    ];

    return (
        <MemberLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>
                        Workout Video Tutorials & Exercise Library
                    </h1>
                    <p className={styles.pageDesc}>
                        Curated exercise video tutorials to help you master
                        form, prevent injury, and maximize gym training.
                    </p>
                </div>
                <div className={styles.totalBadge}>80 Total Guides</div>
            </div>

            <div className="mb-4" data-aos="fade-up" data-aos-delay="100">
                <div className={styles.searchBoxWrapper}>
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        type="text"
                        placeholder="Search by exercise name (e.g., 'Deadlift', 'Bench Press', 'Squat')..."
                        className={styles.searchInput}
                    />
                </div>
            </div>

            <div
                className="d-flex gap-2 overflow-auto mb-4 pb-2"
                data-aos="fade-up"
                data-aos-delay="200"
                style={{ scrollbarWidth: "none" }}
            >
                {filters.map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`${styles.filterPill} ${activeFilter === filter ? styles.filterActive : ""}`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            <div
                className={`${styles.featuredCard} p-4 mb-5`}
                data-aos="fade-up"
                data-aos-delay="300"
            >
                <div className="row g-4 align-items-center">
                    <div className="col-12 col-lg-7">
                        <div className={styles.videoContainer}>
                            <div className={styles.featuredTag}>Featured</div>
                            <div className={styles.videoPlaceholder}>
                                <div className={styles.playButtonWrapper}>
                                    <i className="fa-solid fa-play"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 col-lg-5">
                        <h2 className={styles.featuredTitle}>
                            Proper Barbell Bench Setup & Shoulder Blade
                            Retraction
                        </h2>

                        <div className="d-flex gap-3 mb-4">
                            <div className={styles.infoBlock}>
                                <span className={styles.infoLabel}>
                                    TARGET MUSCLE
                                </span>
                                <span className={styles.infoValue}>
                                    Chest/Delts/Triceps
                                </span>
                            </div>
                            <div className={styles.infoBlock}>
                                <span className={styles.infoLabel}>
                                    EQUIPMENT
                                </span>
                                <span className={styles.infoValue}>
                                    Barbell & Flat Bench
                                </span>
                            </div>
                        </div>

                        <h5 className={styles.cuesHeader}>
                            KEY TRAINER FORM CUES
                        </h5>
                        <div className="d-flex flex-column gap-3 mb-4">
                            <div className="d-flex gap-3 align-items-start">
                                <span className={styles.cueNumber}>1</span>
                                <p className={styles.cueText}>
                                    Maintain 5-point body contact (head,
                                    shoulders, glutes, both feet).
                                </p>
                            </div>
                            <div className="d-flex gap-3 align-items-start">
                                <span className={styles.cueNumber}>2</span>
                                <p className={styles.cueText}>
                                    Squeeze shoulder blades down and back into
                                    the bench pocket.
                                </p>
                            </div>
                            <div className="d-flex gap-3 align-items-start">
                                <span className={styles.cueNumber}>3</span>
                                <p className={styles.cueText}>
                                    Lower bar with controlled 3-second descent
                                    touching lower sternum.
                                </p>
                            </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row gap-3">
                            <button className={styles.btnWatch}>
                                Watch Tutorial
                            </button>
                            <button className={styles.btnAddPlan}>
                                Add to My Workout Plan
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="d-flex justify-content-between align-items-center mb-4"
                data-aos="fade-up"
            >
                <h3 className={styles.sectionTitle}>
                    Curated Exercise Library
                </h3>
                <div className={styles.sortBadge}>Most Recommended</div>
            </div>

            <div className="row g-4" data-aos="fade-up">
                {recommendedVideos.map((video) => (
                    <div key={video.id} className="col-12 col-md-6 col-lg-3">
                        <div className={styles.libraryCard}>
                            <div className={styles.libraryThumbnail}>
                                <span className={styles.libraryTag}>
                                    {video.tag}
                                </span>
                                <div className={styles.libraryPlayIcon}>
                                    <i className="fa-solid fa-play"></i>
                                </div>
                                <span className={styles.durationBadge}>
                                    {video.duration}
                                </span>
                            </div>
                            <div className={styles.libraryContent}>
                                <h5 className={styles.libraryTitle}>
                                    {video.title}
                                </h5>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className={styles.libraryViews}>
                                        <i className="fa-regular fa-eye"></i>{" "}
                                        {video.views} views
                                    </span>
                                    <button className={styles.btnSmallAdd}>
                                        <i className="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </MemberLayout>
    );
}
