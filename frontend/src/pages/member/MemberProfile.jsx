import { useEffect, useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberProfile.module.css";
import { api } from "../../lib/api";

export default function MemberProfile() {
    const [data, setData] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [profile, setProfile] = useState(null);
    const attendance = dashboard?.attendance;
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const membership = dashboard?.membership;
    const current = data?.current;
    const currentPlan = current?.membership_plans;
    const plan = membership?.membership_plans;
    const expiration = membership?.end_date ? new Date(membership.end_date).toLocaleDateString() : "...";
    useEffect(() => { api("/member/membership").then(setData).catch((err) => setError(err.message)); }, []);
    useEffect(() => { api("/member/dashboard").then(setDashboard).catch((err) => setError(err.message)); }, []);
    useEffect(() => { api("/me").then(setProfile).catch((err) => setError(err.message)); }, []);
    const save = async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        try {
            const result = await api("/me", { method: "PATCH", body: {
                full_name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
                phone: data.phone,
                gender: data.gender,
                emergency_contact_name: data.emergency_contact_name,
                emergency_contact_phone: data.emergency_contact_phone,
            }});
            setProfile(result); setSaved(true);
        } catch (err) { setError(err.message); }
    };
    return (
        <MemberLayout>
            {error && <div className="alert alert-danger">{error}</div>}
            {saved && <div className="alert alert-success">Profile saved.</div>}
            <div className="mb-4" data-aos="fade-down" data-aos-delay="100">
                <h1 className={styles.pageTitle}>My Profile</h1>
                <p className={styles.pageDesc}>
                    Update your personal information, membership details, and
                    training notes for the gym staff.
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
                            {profile?.full_name ? profile.full_name : "Member Name"}

                        </h2>
                        <span className={styles.statusBadge}>
                            <span className={styles.statusDot}></span> Active
                            Member
                        </span>
                    </div>
                    <p className={styles.memberSince}>
                        Analyn's Fitness Gym Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "..."}
                    </p>
                    <div
                        className="d-flex flex-column flex-sm-row align-items-sm-center gap-2 text-white"
                        style={{ fontSize: "0.8rem" }}
                    >
                        <span>{currentPlan?.name || "No active membership"} </span>
                        <span
                            className={`${styles.divider} d-none d-sm-block`}
                        ></span>
                        <span>
                            <i className="fa-solid fa-dumbbell text-success"></i>{" "}
                            Assigned Trainer: {" " +(current?.coaches?.display_name || "No assigned trainer")}
                        </span>
                    </div>
                </div>
                <div className="d-flex gap-3">
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>ATTENDANCE</span>
                        <span className={styles.statValue}>{attendance?.visit_count ?? "..."}</span>
                        <span className={styles.statSub}>This Month</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>NEXT DUE</span>
                        <span className={styles.statValue}>{expiration ? new Date(expiration).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "..."}</span>
                        <span className={styles.statSub}>Auto-renew</span>
                    </div>
                </div>
            </div>

            <form onSubmit={save} key={profile?.updated_at || "profile-loading"}>
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
                                        Keep your contact details accurate for
                                        gym desk updates.
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
                                        defaultValue={profile?.full_name?.split(" ").slice(0, -1).join(" ") || ""}
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
                                        defaultValue={profile?.full_name?.split(" ").slice(-1)[0] || ""}
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
                                            className={styles.formInputGroup}
                                            defaultValue={profile?.email || ""}
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
                                        defaultValue={profile?.gender || ""}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
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
                                            className={styles.formInputGroup}
                                            name="phone"
                                            defaultValue={profile?.phone || ""}
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
                                        A family member or close friend gym
                                        staff can reach in case you feel unwell.
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
                                        defaultValue={profile?.emergency_contact_name || ""}
                                    />
                                </div>
                                <div className="col-12 col-md-4">
                                    <label className={styles.formLabel}>
                                        Relationship
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
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
                                            className={styles.formInputGroup}
                                            name="emergency_contact_phone"
                                            defaultValue={profile?.emergency_contact_phone || ""}
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
                                        Personal physical considerations and
                                        reminders for Coach Mark and the gym
                                        team.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3">
                                <label className={styles.formLabel}>
                                    Notes for Trainers & Floor Instructors
                                </label>
                                <textarea
                                    className={styles.formTextarea}
                                    rows="4"
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
                                    Analyn's Fitness Gym instructors check these
                                    notes when guiding you through safe circuit
                                    setups or personal training sessions.
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
                                <div className={styles.largeAvatar}>{profile?.full_name ? profile?.full_name.trim().split(" ").map((n) => n[0]).join("").toUpperCase() : "M"}</div>
                                <h4
                                    className="mt-3 mb-1 text-white"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                    }}
                                >
                                    {profile?.full_name ? profile.full_name : "Member Name"}
                                </h4>
                                <p
                                    className="text-secondary mb-4"
                                    style={{ fontSize: "0.85rem" }}
                                >
                                    Max file size: 5MB
                                </p>

                                <div className="d-flex gap-2 w-100">
                                    <button
                                        type="button"
                                        className={`${styles.btnOutlinePrimary} flex-grow-1`}
                                    >
                                        <i className="fa-solid fa-camera"></i>{" "}
                                        Change Photo
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.btnOutlineDanger}
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
                    <button type="button" className={styles.btnCancel}>
                        Cancel
                    </button>
                    <button type="button" className={styles.btnSave}>
                        <i className="fa-regular fa-circle-check"></i> Save
                        Profile Changes
                    </button>
                </div>
            </form>
        </MemberLayout>
    );
}
