import { useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminVideoTutorials.module.css";

export default function AdminVideoTutorials() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const handleFormSubmit = (e, closeModal) => {
        e.preventDefault();
        closeModal(false);
    };

    return (
        <AdminLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>
                        Workout Video Tutorials
                    </h1>
                    <p className={styles.pageDesc}>
                        Upload and manage exercise guides and form tutorials for
                        gym members
                    </p>
                </div>
                <button
                    className={styles.btnPrimary}
                    onClick={() => setShowAddModal(true)}
                >
                    <i className="fa-solid fa-plus"></i> Add New Video Tutorial
                </button>
            </div>

            <div
                className={styles.infoBanner}
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="d-flex align-items-center gap-3">
                    <div className={styles.bannerIconBox}>
                        <i className="fa-solid fa-photo-film"></i>
                    </div>
                    <div>
                        <h4 className={styles.bannerTitle}>
                            24 Video Tutorials Published
                        </h4>
                        <p className={styles.bannerDesc}>
                            All active gym tier members have instant streaming
                            and form validation access.
                        </p>
                    </div>
                </div>
                <div className={styles.bannerStatBox}>
                    <i className="fa-regular fa-eye"></i> 579 Total Views
                </div>
            </div>

            <div
                className="row g-4 mb-5"
                data-aos="fade-up"
                data-aos-delay="200"
            >
                <div className="col-12 col-md-6 col-xl-4">
                    <div className={styles.videoCard}>
                        <div className={styles.videoThumbnail}>
                            <div className={styles.playButtonWrapper}>
                                <i className="fa-solid fa-play"></i>
                            </div>
                            <span className={styles.durationBadge}>
                                4:25 min
                            </span>
                        </div>
                        <div className={styles.videoBody}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className={styles.tagBadge}>
                                    Chest / Triceps
                                </span>
                                <span className={styles.viewCount}>
                                    <i className="fa-regular fa-eye"></i> 142
                                    member views
                                </span>
                            </div>
                            <h3 className={styles.videoTitle}>
                                Proper Barbell Bench Press Setup & Shoulder
                                Retraction
                            </h3>
                        </div>
                        <div className={styles.videoFooter}>
                            <button
                                className={styles.btnActionText}
                                onClick={() => setShowEditModal(true)}
                            >
                                <i className="fa-solid fa-pen"></i> Edit Details
                            </button>
                            <div className="d-flex gap-2">
                                <button className={styles.btnActionIcon}>
                                    <i className="fa-regular fa-eye-slash"></i>
                                </button>
                                <button className={styles.btnActionIconDanger}>
                                    <i className="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-xl-4">
                    <div className={styles.videoCard}>
                        <div className={styles.videoThumbnail}>
                            <div className={styles.playButtonWrapper}>
                                <i className="fa-solid fa-play"></i>
                            </div>
                            <span className={styles.durationBadge}>
                                5:12 min
                            </span>
                        </div>
                        <div className={styles.videoBody}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className={styles.tagBadge}>
                                    Legs & Glutes
                                </span>
                                <span className={styles.viewCount}>
                                    <i className="fa-regular fa-eye"></i> 98
                                    member views
                                </span>
                            </div>
                            <h3 className={styles.videoTitle}>
                                Barbell Romanian Deadlift (RDL) Form & Hip Hinge
                            </h3>
                        </div>
                        <div className={styles.videoFooter}>
                            <button
                                className={styles.btnActionText}
                                onClick={() => setShowEditModal(true)}
                            >
                                <i className="fa-solid fa-pen"></i> Edit Details
                            </button>
                            <div className="d-flex gap-2">
                                <button className={styles.btnActionIcon}>
                                    <i className="fa-regular fa-eye-slash"></i>
                                </button>
                                <button className={styles.btnActionIconDanger}>
                                    <i className="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-xl-4">
                    <div className={styles.videoCard}>
                        <div className={styles.videoThumbnail}>
                            <div className={styles.playButtonWrapper}>
                                <i className="fa-solid fa-play"></i>
                            </div>
                            <span className={styles.durationBadge}>
                                3:45 min
                            </span>
                        </div>
                        <div className={styles.videoBody}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className={styles.tagBadge}>
                                    Back & Biceps
                                </span>
                                <span className={styles.viewCount}>
                                    <i className="fa-regular fa-eye"></i> 115
                                    member views
                                </span>
                            </div>
                            <h3 className={styles.videoTitle}>
                                Lat Pulldown vs Pull-Up: Engaging the Lats
                            </h3>
                        </div>
                        <div className={styles.videoFooter}>
                            <button
                                className={styles.btnActionText}
                                onClick={() => setShowEditModal(true)}
                            >
                                <i className="fa-solid fa-pen"></i> Edit Details
                            </button>
                            <div className="d-flex gap-2">
                                <button className={styles.btnActionIcon}>
                                    <i className="fa-regular fa-eye-slash"></i>
                                </button>
                                <button className={styles.btnActionIconDanger}>
                                    <i className="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-xl-4">
                    <div className={styles.videoCard}>
                        <div className={styles.videoThumbnail}>
                            <div className={styles.playButtonWrapper}>
                                <i className="fa-solid fa-play"></i>
                            </div>
                            <span className={styles.durationBadge}>
                                4:10 min
                            </span>
                        </div>
                        <div className={styles.videoBody}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className={styles.tagBadge}>Chest</span>
                                <span className={styles.viewCount}>
                                    <i className="fa-regular fa-eye"></i> 74
                                    member views
                                </span>
                            </div>
                            <h3 className={styles.videoTitle}>
                                Dumbbell Incline Chest Press: Optimum Bench
                                Angle
                            </h3>
                        </div>
                        <div className={styles.videoFooter}>
                            <button
                                className={styles.btnActionText}
                                onClick={() => setShowEditModal(true)}
                            >
                                <i className="fa-solid fa-pen"></i> Edit Details
                            </button>
                            <div className="d-flex gap-2">
                                <button className={styles.btnActionIcon}>
                                    <i className="fa-regular fa-eye-slash"></i>
                                </button>
                                <button className={styles.btnActionIconDanger}>
                                    <i className="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-xl-4">
                    <div className={styles.videoCard}>
                        <div className={styles.videoThumbnail}>
                            <div className={styles.playButtonWrapper}>
                                <i className="fa-solid fa-play"></i>
                            </div>
                            <span className={styles.durationBadge}>
                                4:00 min
                            </span>
                        </div>
                        <div className={styles.videoBody}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className={styles.tagBadge}>
                                    Shoulders & Core
                                </span>
                                <span className={styles.viewCount}>
                                    <i className="fa-regular fa-eye"></i> 88
                                    member views
                                </span>
                            </div>
                            <h3 className={styles.videoTitle}>
                                Standing Overhead Barbell Military Press
                            </h3>
                        </div>
                        <div className={styles.videoFooter}>
                            <button
                                className={styles.btnActionText}
                                onClick={() => setShowEditModal(true)}
                            >
                                <i className="fa-solid fa-pen"></i> Edit Details
                            </button>
                            <div className="d-flex gap-2">
                                <button className={styles.btnActionIcon}>
                                    <i className="fa-regular fa-eye-slash"></i>
                                </button>
                                <button className={styles.btnActionIconDanger}>
                                    <i className="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-xl-4">
                    <div className={styles.videoCard}>
                        <div className={styles.videoThumbnail}>
                            <div className={styles.playButtonWrapper}>
                                <i className="fa-solid fa-play"></i>
                            </div>
                            <span className={styles.durationBadge}>
                                3:15 min
                            </span>
                        </div>
                        <div className={styles.videoBody}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className={styles.tagBadge}>Triceps</span>
                                <span className={styles.viewCount}>
                                    <i className="fa-regular fa-eye"></i> 62
                                    member views
                                </span>
                            </div>
                            <h3 className={styles.videoTitle}>
                                Cable Tricep Pushdown vs Overhead Rope Extension
                            </h3>
                        </div>
                        <div className={styles.videoFooter}>
                            <button
                                className={styles.btnActionText}
                                onClick={() => setShowEditModal(true)}
                            >
                                <i className="fa-solid fa-pen"></i> Edit Details
                            </button>
                            <div className="d-flex gap-2">
                                <button className={styles.btnActionIcon}>
                                    <i className="fa-regular fa-eye-slash"></i>
                                </button>
                                <button className={styles.btnActionIconDanger}>
                                    <i className="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Add New Video Tutorial</h3>
                            <button onClick={() => setShowAddModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form
                            onSubmit={(e) =>
                                handleFormSubmit(e, setShowAddModal)
                            }
                            className={styles.modalBody}
                        >
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Video Title{" "}
                                    <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. Proper Deadlift Form"
                                    required
                                />
                            </div>
                            <div className="row g-3 mb-4">
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Target Muscle Group{" "}
                                        <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={styles.formSelect}
                                        required
                                    >
                                        <option value="">
                                            Select Category
                                        </option>
                                        <option value="Chest / Triceps">
                                            Chest / Triceps
                                        </option>
                                        <option value="Back / Biceps">
                                            Back / Biceps
                                        </option>
                                        <option value="Legs / Glutes">
                                            Legs / Glutes
                                        </option>
                                        <option value="Shoulders / Core">
                                            Shoulders / Core
                                        </option>
                                        <option value="Full Body / Mobility">
                                            Full Body / Mobility
                                        </option>
                                    </select>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Duration (mm:ss){" "}
                                        <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="e.g. 05:30"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Video Source URL{" "}
                                    <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="url"
                                    className={styles.formInput}
                                    placeholder="https://..."
                                    required
                                />
                                <span className={styles.helperText}>
                                    Provide a direct link to the hosted MP4 or
                                    video source.
                                </span>
                            </div>
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnPrimaryModal}
                                >
                                    Publish Tutorial
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Edit Video Details</h3>
                            <button onClick={() => setShowEditModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form
                            onSubmit={(e) =>
                                handleFormSubmit(e, setShowEditModal)
                            }
                            className={styles.modalBody}
                        >
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Video Title
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    defaultValue="Proper Barbell Bench Press Setup & Shoulder Retraction"
                                    required
                                />
                            </div>
                            <div className="row g-3 mb-4">
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Target Muscle Group
                                    </label>
                                    <select
                                        className={styles.formSelect}
                                        defaultValue="Chest / Triceps"
                                        required
                                    >
                                        <option value="Chest / Triceps">
                                            Chest / Triceps
                                        </option>
                                        <option value="Back / Biceps">
                                            Back / Biceps
                                        </option>
                                        <option value="Legs / Glutes">
                                            Legs / Glutes
                                        </option>
                                        <option value="Shoulders / Core">
                                            Shoulders / Core
                                        </option>
                                        <option value="Full Body / Mobility">
                                            Full Body / Mobility
                                        </option>
                                    </select>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Duration (mm:ss)
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        defaultValue="4:25"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Visibility Status
                                </label>
                                <select className={styles.formSelect}>
                                    <option value="public">
                                        Published (Visible to all members)
                                    </option>
                                    <option value="hidden">
                                        Hidden (Draft / Archived)
                                    </option>
                                </select>
                            </div>
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnPrimaryModal}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
