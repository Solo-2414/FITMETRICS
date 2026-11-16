import { useEffect, useState, useRef } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberProfile.module.css";
import { api } from "../../lib/api";
import { SkeletonMemberProfile } from "../../components/ui/Skeleton";
import InlineError from "../../components/ui/InlineError";
import { useToast } from "../../components/ui/toast/useToast";

export default function MemberProfile() {
    const toast = useToast();
    const fileInputRef = useRef(null);
    const formRef = useRef(null);

    const [data, setData] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [profile, setProfile] = useState(null);
    const [devices, setDevices] = useState([]);
    const [error, setError] = useState("");
    const [saveAlert, setSaveAlert] = useState({ type: "", message: "" });
    const [isSaving, setIsSaving] = useState(false);

    // Staged photo states (only persisted when "Save Profile Changes" is clicked)
    const [stagedPhotoFile, setStagedPhotoFile] = useState(null);
    const [stagedPhotoPreview, setStagedPhotoPreview] = useState(null);
    const [isPhotoMarkedDeleted, setIsPhotoMarkedDeleted] = useState(false);

    const attendance = dashboard?.attendance;
    const membership = dashboard?.membership;
    const current = data?.current;
    const currentPlan = current?.membership_plans;
    const expiration = membership?.end_date
        ? new Date(membership.end_date).toLocaleDateString()
        : "...";

    useEffect(() => {
        api("/member/membership")
            .then(setData)
            .catch((err) => setError(err.message));
    }, []);
    useEffect(() => {
        api("/member/dashboard")
            .then(setDashboard)
            .catch((err) => setError(err.message));
    }, []);
    useEffect(() => {
        api("/me")
            .then(setProfile)
            .catch((err) => setError(err.message));
    }, []);
    useEffect(() => {
        api("/member/check-in-devices")
            .then(setDevices)
            .catch((err) => setError(err.message));
    }, []);

    // Clean up local object URL when preview changes or unmounts
    useEffect(() => {
        return () => {
            if (stagedPhotoPreview && stagedPhotoPreview.startsWith("blob:")) {
                URL.revokeObjectURL(stagedPhotoPreview);
            }
        };
    }, [stagedPhotoPreview]);

    const removeDevice = async (id) => {
        try {
            await api(`/member/check-in-devices/${id}`, { method: "DELETE" });
            setDevices((currentDevices) =>
                currentDevices.filter((device) => device.id !== id),
            );
            toast.success("Check-in device removed.");
        } catch (err) {
            toast.error(err.message);
        }
    };

    // Trigger hidden file explorer when "Change Photo" is clicked
    const handleChangePhotoClick = () => {
        fileInputRef.current?.click();
    };

    // Stage selected photo locally (5MB max) without saving to backend yet
    const handleFileSelected = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error(
                "Please select a valid image file (JPG, PNG, or WebP).",
            );
            event.target.value = "";
            return;
        }

        const maxBytes = 5 * 1024 * 1024; // 5MB
        if (file.size > maxBytes) {
            toast.error("Image exceeds the 5MB maximum file size.");
            event.target.value = "";
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setStagedPhotoFile(file);
        setStagedPhotoPreview(previewUrl);
        setIsPhotoMarkedDeleted(false);
        setSaveAlert({
            type: "info",
            message:
                "New profile photo selected. Click 'Save Profile Changes' to apply.",
        });
    };

    // Stage photo deletion locally (only if a saved or staged photo exists)
    const handleDeletePhotoClick = () => {
        const existingAvatar =
            profile?.avatar_url || profile?.photo_url || profile?.profile_photo;

        if (!existingAvatar && !stagedPhotoPreview) {
            toast.error("No profile photo to delete.");
            return;
        }

        if (stagedPhotoPreview && stagedPhotoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(stagedPhotoPreview);
        }

        setStagedPhotoFile(null);
        setStagedPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (existingAvatar) {
            setIsPhotoMarkedDeleted(true);
            setSaveAlert({
                type: "info",
                message:
                    "Profile photo marked for removal. Click 'Save Profile Changes' to confirm.",
            });
        } else {
            setSaveAlert({ type: "", message: "" });
        }
    };

    // Revert unsaved form inputs and staged photo changes
    const handleCancel = () => {
        formRef.current?.reset();
        if (stagedPhotoPreview && stagedPhotoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(stagedPhotoPreview);
        }
        setStagedPhotoFile(null);
        setStagedPhotoPreview(null);
        setIsPhotoMarkedDeleted(false);
        setSaveAlert({ type: "", message: "" });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Helper to convert selected File to base64 Data URL for JSON PATCH payloads
    const fileToDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const save = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setSaveAlert({ type: "", message: "" });

        const formEntries = Object.fromEntries(
            new FormData(event.currentTarget).entries(),
        );

        try {
            const payload = {
                full_name: `${formEntries.first_name || ""} ${
                    formEntries.last_name || ""
                }`.trim(),
                email: formEntries.email,
                phone: formEntries.phone,
                gender: formEntries.gender,
                emergency_contact_name: formEntries.emergency_contact_name,
                emergency_contact_relationship:
                    formEntries.emergency_contact_relationship,
                emergency_contact_phone: formEntries.emergency_contact_phone,
                health_notes: formEntries.health_notes,
            };

            // Apply staged photo upload or deletion only on Save
            if (stagedPhotoFile) {
                const base64Photo = await fileToDataUrl(stagedPhotoFile);
                payload.avatar_url = base64Photo;
                payload.profile_photo = base64Photo;
            } else if (isPhotoMarkedDeleted) {
                payload.avatar_url = null;
                payload.profile_photo = null;
                payload.remove_avatar = true;
            }

            const result = await api("/me", {
                method: "PATCH",
                body: payload,
            });

            const updatedProfile = {
                ...profile,
                ...result,
                avatar_url: stagedPhotoFile
                    ? result?.avatar_url || payload.avatar_url
                    : isPhotoMarkedDeleted
                      ? null
                      : (result?.avatar_url ?? profile?.avatar_url),
            };

            setProfile(updatedProfile);

            // Persist across route changes without refreshing ("" means explicitly deleted)
            sessionStorage.setItem(
                "cached_avatar_url",
                updatedProfile.avatar_url || "",
            );

            // Notify MemberLayout / Topbar immediately
            window.dispatchEvent(
                new CustomEvent("profile-updated", { detail: updatedProfile }),
            );

            // Clear staged states after successful save
            setStagedPhotoFile(null);
            setStagedPhotoPreview(null);
            setIsPhotoMarkedDeleted(false);
            if (fileInputRef.current) fileInputRef.current.value = "";

            const successMsg = "Profile changes have been successfully saved!";
            setSaveAlert({ type: "success", message: successMsg });
        } catch (err) {
            const errMsg = err.message || "Failed to save profile changes.";
            setSaveAlert({ type: "danger", message: errMsg });
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        // Existing fetch
        api("/me").then(setProfile).catch(console.error);

        // Sync immediately when profile or avatar is updated on MemberProfile
        const handleProfileUpdate = (event) => {
            if (event.detail) {
                setProfile((prev) => ({ ...prev, ...event.detail }));
            } else {
                api("/me").then(setProfile).catch(console.error);
            }
        };

        window.addEventListener("profile-updated", handleProfileUpdate);
        return () =>
            window.removeEventListener("profile-updated", handleProfileUpdate);
    }, []);

    const savedAvatarUrl =
        profile?.avatar_url || profile?.photo_url || profile?.profile_photo;
    const activeAvatarUrl = isPhotoMarkedDeleted
        ? null
        : stagedPhotoPreview || savedAvatarUrl;
    const hasDeletablePhoto = Boolean(activeAvatarUrl);

    return (
        <MemberLayout>
            {error && <InlineError error={error} />}
            {!profile || !data || !dashboard ? (
                <SkeletonMemberProfile />
            ) : (
                <>
                    {saveAlert.message && (
                        <div
                            className={`alert alert-${saveAlert.type} d-flex align-items-center justify-content-between mb-4`}
                            role="alert"
                        >
                            <span>
                                <i
                                    className={`fa-solid ${
                                        saveAlert.type === "success"
                                            ? "fa-circle-check"
                                            : "fa-circle-info"
                                    } me-2`}
                                ></i>
                                {saveAlert.message}
                            </span>
                            <button
                                type="button"
                                className="btn-close"
                                aria-label="Close"
                                onClick={() =>
                                    setSaveAlert({ type: "", message: "" })
                                }
                            ></button>
                        </div>
                    )}
                    <div
                        className="mb-4"
                        data-aos="fade-down"
                        data-aos-delay="100"
                    >
                        <h1 className={styles.pageTitle}>My Profile</h1>
                        <p className={styles.pageDesc}>
                            Update your personal information, membership
                            details, and training notes for the gym staff.
                        </p>
                    </div>

                    <div
                        className={`${styles.profileBanner} p-4 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4`}
                        data-aos="fade-up"
                        data-aos-delay="200"
                    >
                        <div className="d-flex flex-column">
                            <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
                                <h2 className={styles.memberName}>
                                    {profile?.full_name
                                        ? profile.full_name
                                        : "Member Name"}
                                </h2>
                                <span className={styles.statusBadge}>
                                    <span className={styles.statusDot}></span>{" "}
                                    Active Member
                                </span>
                            </div>
                            <p className={styles.memberSince}>
                                Analyn's Fitness Gym Member since{" "}
                                {profile?.created_at
                                    ? new Date(
                                          profile.created_at,
                                      ).toLocaleDateString("en-US", {
                                          month: "long",
                                          day: "numeric",
                                          year: "numeric",
                                      })
                                    : "..."}
                            </p>
                            <div
                                className="d-flex flex-column flex-sm-row align-items-sm-center gap-2 text-white"
                                style={{ fontSize: "0.8rem" }}
                            >
                                <span>
                                    {currentPlan?.name ||
                                        "No active membership"}{" "}
                                </span>
                                <span
                                    className={`${styles.divider} d-none d-sm-block`}
                                ></span>
                                <span>
                                    <i className="fa-solid fa-dumbbell text-success"></i>{" "}
                                    Assigned Trainer:{" "}
                                    {current?.coaches?.display_name ||
                                        "No assigned trainer"}
                                </span>
                            </div>
                        </div>
                        <div className="d-flex gap-3">
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>
                                    ATTENDANCE
                                </span>
                                <span className={styles.statValue}>
                                    {attendance?.visit_count ?? "..."}
                                </span>
                                <span className={styles.statSub}>
                                    This Month
                                </span>
                            </div>
                            <div className={styles.statBox}>
                                <span className={styles.statLabel}>
                                    NEXT DUE
                                </span>
                                <span className={styles.statValue}>
                                    {expiration
                                        ? new Date(
                                              expiration,
                                          ).toLocaleDateString("en-US", {
                                              month: "long",
                                              day: "numeric",
                                              year: "numeric",
                                          })
                                        : "..."}
                                </span>
                                <span className={styles.statSub}>
                                    Auto-renew
                                </span>
                            </div>
                        </div>
                    </div>

                    <form
                        ref={formRef}
                        onSubmit={save}
                        key={profile?.updated_at || "profile-loading"}
                    >
                        <div className="row g-4 mb-4">
                            <div className="col-12 col-lg-8">
                                <div
                                    className={`${styles.panelCard} p-4`}
                                    data-aos="fade-right"
                                    data-aos-delay="300"
                                >
                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start mb-4 border-bottom border-secondary pb-3 gap-3">
                                        <div>
                                            <h3 className={styles.panelTitle}>
                                                Personal Information
                                            </h3>
                                            <p className={styles.panelDesc}>
                                                Keep your contact details
                                                accurate for gym desk updates.
                                            </p>
                                        </div>
                                        <span className={styles.editableBadge}>
                                            Editable Details
                                        </span>
                                    </div>

                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <label className={styles.formLabel}>
                                                First Name
                                            </label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                name="first_name"
                                                defaultValue={
                                                    profile?.full_name
                                                        ?.split(" ")
                                                        .slice(0, -1)
                                                        .join(" ") || ""
                                                }
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className={styles.formLabel}>
                                                Last Name
                                            </label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                name="last_name"
                                                defaultValue={
                                                    profile?.full_name
                                                        ?.split(" ")
                                                        .slice(-1)[0] || ""
                                                }
                                            />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className={styles.formLabel}>
                                                Email Address
                                            </label>
                                            <div className={styles.inputGroup}>
                                                <i className="fa-regular fa-envelope"></i>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    className={
                                                        styles.formInputGroup
                                                    }
                                                    defaultValue={
                                                        profile?.email || ""
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className={styles.formLabel}>
                                                Gender
                                            </label>
                                            <select
                                                className={styles.formSelect}
                                                name="gender"
                                                defaultValue={
                                                    profile?.gender || ""
                                                }
                                            >
                                                <option value="Male">
                                                    Male
                                                </option>
                                                <option value="Female">
                                                    Female
                                                </option>
                                                <option value="Other">
                                                    Other
                                                </option>
                                            </select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className={styles.formLabel}>
                                                Phone Number
                                            </label>
                                            <div className={styles.inputGroup}>
                                                <i className="fa-solid fa-phone"></i>
                                                <input
                                                    type="text"
                                                    className={
                                                        styles.formInputGroup
                                                    }
                                                    name="phone"
                                                    defaultValue={
                                                        profile?.phone || ""
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`${styles.panelCard} p-4 mt-4`}
                                    data-aos="fade-right"
                                    data-aos-delay="400"
                                >
                                    <div className="d-flex align-items-start gap-3 mb-4">
                                        <i className="fa-regular fa-address-card text-warning fs-4 mt-1"></i>
                                        <div>
                                            <h3 className={styles.panelTitle}>
                                                Emergency Contact Details
                                            </h3>
                                            <p className={styles.panelDesc}>
                                                A family member or close friend
                                                gym staff can reach in case you
                                                feel unwell.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="row g-3">
                                        <div className="col-12 col-md-4">
                                            <label className={styles.formLabel}>
                                                Contact Person
                                            </label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                name="emergency_contact_name"
                                                defaultValue={
                                                    profile?.emergency_contact_name ||
                                                    ""
                                                }
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className={styles.formLabel}>
                                                Relationship
                                            </label>
                                            <input
                                                type="text"
                                                className={styles.formInput}
                                                name="emergency_contact_relationship"
                                                defaultValue={
                                                    profile?.emergency_contact_relationship ||
                                                    ""
                                                }
                                                placeholder="e.g., Mother, Brother, Spouse"
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className={styles.formLabel}>
                                                Emergency Phone Number
                                            </label>
                                            <div className={styles.inputGroup}>
                                                <i className="fa-solid fa-phone"></i>
                                                <input
                                                    type="text"
                                                    className={
                                                        styles.formInputGroup
                                                    }
                                                    name="emergency_contact_phone"
                                                    defaultValue={
                                                        profile?.emergency_contact_phone ||
                                                        ""
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`${styles.panelCard} p-4 mt-4`}
                                    data-aos="fade-right"
                                    data-aos-delay="500"
                                >
                                    <div className="d-flex align-items-start gap-3 mb-4">
                                        <i className="fa-solid fa-notes-medical text-warning fs-4 mt-1"></i>
                                        <div>
                                            <h3 className={styles.panelTitle}>
                                                Health & Workout Notes
                                            </h3>
                                            <p className={styles.panelDesc}>
                                                Personal physical considerations
                                                and reminders for Coach Mark and
                                                the gym team.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className={styles.formLabel}>
                                            Notes for Trainers & Floor
                                            Instructors
                                        </label>
                                        <textarea
                                            className={styles.formTextarea}
                                            name="health_notes"
                                            rows="4"
                                            defaultValue={
                                                profile?.health_notes || ""
                                            }
                                            placeholder="e.g., Mild knee sensitivity, prefer dumbbell squats over heavy barbell back squats. Working on endurance and general core conditioning."
                                        ></textarea>
                                    </div>

                                    <div className="d-flex align-items-start gap-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded p-3 mt-4">
                                        <i className="fa-solid fa-circle-info text-primary mt-1"></i>
                                        <span
                                            className="text-secondary"
                                            style={{
                                                fontSize: "0.8rem",
                                                lineHeight: "1.5",
                                            }}
                                        >
                                            Analyn's Fitness Gym instructors
                                            check these notes when guiding you
                                            through safe circuit setups or
                                            personal training sessions.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-lg-4">
                                <div
                                    className={`${styles.panelCard} p-4`}
                                    data-aos="fade-left"
                                    data-aos-delay="400"
                                >
                                    <div className="mb-4 border-bottom border-secondary pb-3">
                                        <div>
                                            <span className={styles.panelLabel}>
                                                PROFILE PICTURE
                                            </span>
                                            <h3 className={styles.panelTitle}>
                                                Avatar
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-column align-items-center justify-content-center py-4">
                                        {/* Hidden File Input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png, image/jpeg, image/webp"
                                            className="d-none"
                                            onChange={handleFileSelected}
                                        />

                                        <div className={styles.largeAvatar}>
                                            {activeAvatarUrl ? (
                                                <img
                                                    src={activeAvatarUrl}
                                                    alt="Profile Avatar"
                                                    className={
                                                        styles.avatarImage
                                                    }
                                                />
                                            ) : profile?.full_name ? (
                                                profile.full_name
                                                    .trim()
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                            ) : (
                                                "M"
                                            )}
                                        </div>

                                        <h4
                                            className="mt-3 mb-1 text-white"
                                            style={{
                                                fontFamily:
                                                    "var(--heading-font)",
                                            }}
                                        >
                                            {profile?.full_name
                                                ? profile.full_name
                                                : "Member Name"}
                                        </h4>
                                        <p
                                            className="text-secondary mb-4"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            {stagedPhotoFile
                                                ? "Pending save · Click Save Profile Changes"
                                                : isPhotoMarkedDeleted
                                                  ? "Photo marked for removal · Click Save"
                                                  : "Max file size: 5MB"}
                                        </p>

                                        <div className="d-flex gap-2 w-100">
                                            <button
                                                type="button"
                                                onClick={handleChangePhotoClick}
                                                className={`${styles.btnOutlinePrimary} flex-grow-1`}
                                            >
                                                <i className="fa-solid fa-camera"></i>{" "}
                                                Change Photo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeletePhotoClick}
                                                disabled={!hasDeletablePhoto}
                                                title={
                                                    hasDeletablePhoto
                                                        ? "Delete profile photo"
                                                        : "No saved profile photo"
                                                }
                                                className={
                                                    styles.btnOutlineDanger
                                                }
                                                style={
                                                    !hasDeletablePhoto
                                                        ? {
                                                              opacity: 0.45,
                                                              cursor: "not-allowed",
                                                          }
                                                        : undefined
                                                }
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`${styles.panelCard} p-4 mt-4`}
                                    data-aos="fade-left"
                                    data-aos-delay="500"
                                >
                                    <div className="mb-4 border-bottom border-secondary pb-3">
                                        <div>
                                            <span className={styles.panelLabel}>
                                                SUPPORT
                                            </span>
                                            <h3 className={styles.panelTitle}>
                                                Gym Desk Information
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-column gap-3 mb-4">
                                        <div
                                            className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            <span className="text-secondary">
                                                Monday - Saturday
                                            </span>
                                            <span className="text-white fw-bold">
                                                6:00 AM - 9:00 PM
                                            </span>
                                        </div>
                                        <div
                                            className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            <span className="text-secondary">
                                                Sunday
                                            </span>
                                            <span className="text-white fw-bold">
                                                8:00 AM - 6:00 PM
                                            </span>
                                        </div>
                                        <div
                                            className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            <span className="text-secondary">
                                                Front Desk Contact
                                            </span>
                                            <span className="text-white fw-bold">
                                                0920-112-4491
                                            </span>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-start gap-3 p-3 rounded">
                                        <i className="fa-regular fa-circle-check text-success fs-5 mt-1"></i>
                                        <div>
                                            <h6
                                                className="text-white mb-1"
                                                style={{ fontSize: "0.85rem" }}
                                            >
                                                Regular Check-in Ready
                                            </h6>
                                            <p
                                                className="text-secondary mb-0"
                                                style={{ fontSize: "0.75rem" }}
                                            >
                                                No appointments needed for floor
                                                training.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className={`${styles.actionBar} d-flex justify-content-end gap-3 p-3 mt-4 border border-secondary rounded`}
                            data-aos="fade-up"
                            data-aos-delay="600"
                        >
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSaving}
                                className={styles.btnCancel}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={styles.btnSave}
                            >
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                {isSaving
                                    ? "Saving Changes..."
                                    : "Save Profile Changes"}
                            </button>
                        </div>
                    </form>

                    <div className={`${styles.panelCard} p-4 mt-4`}>
                        <h3 className={styles.panelTitle}>Check-in devices</h3>
                        <p className={styles.panelDesc}>
                            Trusted phones can check you in without an email
                            code.
                        </p>
                        {devices.length === 0 ? (
                            <p className="text-secondary mb-0">
                                No trusted devices.
                            </p>
                        ) : (
                            devices.map((device) => (
                                <div
                                    className="d-flex justify-content-between align-items-center border-bottom border-secondary py-2"
                                    key={device.id}
                                >
                                    <span className="text-white">
                                        {device.label}
                                        <small className="d-block text-secondary">
                                            Last used{" "}
                                            {new Date(
                                                device.last_used_at,
                                            ).toLocaleDateString()}
                                        </small>
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.btnCancel}
                                        onClick={() => removeDevice(device.id)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </MemberLayout>
    );
}
