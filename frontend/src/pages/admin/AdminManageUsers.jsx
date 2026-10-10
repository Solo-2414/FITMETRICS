import { useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminManageUsers.module.css";

export default function AdminManageUsers() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);

    const handleFormSubmit = (e, closeModal) => {
        e.preventDefault();
        closeModal(false);
    };

    return (
        <AdminLayout>
            <div className="d-flex flex-column mb-4" data-aos="fade-down">
                <h1 className={styles.pageTitle}>Manage Users</h1>
                <p className={styles.pageDesc}>
                    View and manage gym staff accounts and member profiles
                </p>
            </div>

            <div
                className="row g-3 mb-4"
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Total System Accounts</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-users-viewfinder"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            192{" "}
                            <span className={styles.kpiValueUnit}>Users</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-up"></i> +4 this
                                week
                            </span>
                            <span className={styles.kpiSub}>
                                All roles combined
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Gym Admin / Owners</span>
                            <div className={styles.iconBoxSecondary}>
                                <i className="fa-solid fa-user-shield"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            1{" "}
                            <span className={styles.kpiValueUnit}>Account</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>
                                Zhaider Mendoza (Sole Proprietor)
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Front Desk Staff / Clerks</span>
                            <div className={styles.iconBoxSecondary}>
                                <i className="fa-solid fa-headset"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            4 <span className={styles.kpiValueUnit}>Staff</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>
                                Juan, Maria, Carlo, Elena
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Active Gym Members</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-solid fa-dumbbell"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            187{" "}
                            <span className={styles.kpiValueUnit}>Members</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiPositive}>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                97.4% in good standing
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={styles.actionToolbar}
                data-aos="fade-up"
                data-aos-delay="200"
            >
                <div className={styles.searchBox}>
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        type="text"
                        placeholder="Search by name, email, or contact number..."
                    />
                </div>
                <div className="d-flex flex-wrap gap-3">
                    <select className={styles.filterSelect}>
                        <option>Role: All Accounts</option>
                        <option>Admin / Owner</option>
                        <option>Staff / Front Desk</option>
                        <option>Member</option>
                    </select>
                    <select className={styles.filterSelect}>
                        <option>Status: Active</option>
                        <option>Status: Inactive</option>
                        <option>Status: Suspended</option>
                    </select>
                    <button
                        className={styles.btnPrimary}
                        onClick={() => setShowAddModal(true)}
                    >
                        <i className="fa-solid fa-user-plus"></i> Add New Staff
                        Account
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-12" data-aos="fade-up" data-aos-delay="300">
                    <div className={styles.panelCard}>
                        <div className="table-responsive">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>NAME & AVATAR</th>
                                        <th>ROLE</th>
                                        <th>CONTACT NUMBER / EMAIL</th>
                                        <th>MEMBERSHIP / SHIFT</th>
                                        <th>ACCOUNT STATUS</th>
                                        <th className="text-end">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarAdmin
                                                    }
                                                >
                                                    ZM
                                                </div>
                                                <strong className="d-block text-white">
                                                    Zhaider Mendoza
                                                </strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.roleAdmin}>
                                                <i className="fa-solid fa-shield-halved"></i>{" "}
                                                Admin / Owner
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                +63 917 555 0192
                                            </strong>
                                            <span className={styles.subText}>
                                                owner@analynsgym.com
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                All Shifts
                                            </strong>
                                            <span className={styles.subText}>
                                                Full Ownership
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusActive}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Active
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowEditModal(true)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowViewModal(true)
                                                    }
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarStaff
                                                    }
                                                >
                                                    JR
                                                </div>
                                                <strong className="d-block text-white">
                                                    Juan Carlos Ramirez
                                                </strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.roleStaff}>
                                                <i className="fa-solid fa-desktop"></i>{" "}
                                                Staff / Front Desk
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                +63 928 441 9082
                                            </strong>
                                            <span className={styles.subText}>
                                                juan.desk@analynsgym.com
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Morning Shift
                                            </strong>
                                            <span className={styles.subText}>
                                                <i className="fa-regular fa-sun"></i>{" "}
                                                (06:00 - 14:00)
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusActive}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Active
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowEditModal(true)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowViewModal(true)
                                                    }
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarStaff
                                                    }
                                                >
                                                    MG
                                                </div>
                                                <strong className="d-block text-white">
                                                    Maria Gomez
                                                </strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.roleStaff}>
                                                <i className="fa-solid fa-desktop"></i>{" "}
                                                Staff / Front Desk
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                +63 939 120 7731
                                            </strong>
                                            <span className={styles.subText}>
                                                maria.desk@analynsgym.com
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Evening Shift
                                            </strong>
                                            <span className={styles.subText}>
                                                <i className="fa-solid fa-moon"></i>{" "}
                                                (14:00 - 22:00)
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusActive}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Active
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowEditModal(true)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowViewModal(true)
                                                    }
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarMember
                                                    }
                                                >
                                                    RC
                                                </div>
                                                <strong className="d-block text-white">
                                                    Roberto Cruz
                                                </strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.roleMember}>
                                                <i className="fa-regular fa-user"></i>{" "}
                                                Member
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                +63 905 889 1234
                                            </strong>
                                            <span className={styles.subText}>
                                                robert.cruz@gmail.com
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Monthly Regular
                                            </strong>
                                            <span
                                                className={styles.textWarning}
                                            >
                                                Valid until Nov 30, 2026
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusActive}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Active
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowEditModal(true)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowViewModal(true)
                                                    }
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <div
                                                    className={
                                                        styles.avatarMember
                                                    }
                                                >
                                                    CD
                                                </div>
                                                <strong className="d-block text-white">
                                                    Christian Dave Tan
                                                </strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.roleMember}>
                                                <i className="fa-regular fa-user"></i>{" "}
                                                Member
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                +63 918 332 5467
                                            </strong>
                                            <span className={styles.subText}>
                                                cdave.tan@yahoo.com
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white mb-1">
                                                Daily Walk-In
                                            </strong>
                                            <span className={styles.subText}>
                                                Single Session
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusActive}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Active
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowEditModal(true)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className={styles.btnAction}
                                                    onClick={() =>
                                                        setShowViewModal(true)
                                                    }
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.85rem" }}
                            >
                                Showing 1 - 5 of 192 total accounts
                            </span>
                            <div className="d-flex gap-2 mt-3 mt-sm-0">
                                <button className={styles.pageBtnText} disabled>
                                    <i className="fa-solid fa-chevron-left"></i>
                                </button>
                                <button className={styles.pageBtnTextActive}>
                                    1
                                </button>
                                <button className={styles.pageBtnText}>
                                    2
                                </button>
                                <button className={styles.pageBtnText}>
                                    3
                                </button>
                                <span className={styles.pageEllipsis}>...</span>
                                <button className={styles.pageBtnText}>
                                    39
                                </button>
                                <button className={styles.pageBtnText}>
                                    <i className="fa-solid fa-chevron-right"></i>
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
                            <h3>Add New Staff Account</h3>
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
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="e.g. Elena"
                                        required
                                    />
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="e.g. Santos"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className={styles.formLabel}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    className={styles.formInput}
                                    placeholder="name@analynsgym.com"
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className={styles.formLabel}>
                                    Temporary Password
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    defaultValue="FITMETRICS2026"
                                    required
                                />
                            </div>
                            <div className="row g-3 mb-4">
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Role Assignment
                                    </label>
                                    <select className={styles.formSelect}>
                                        <option>Staff / Front Desk</option>
                                        <option>Admin / Owner</option>
                                    </select>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Assigned Shift
                                    </label>
                                    <select className={styles.formSelect}>
                                        <option>Morning (06:00 - 14:00)</option>
                                        <option>Evening (14:00 - 22:00)</option>
                                        <option>Flexible / Reliever</option>
                                    </select>
                                </div>
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
                                    Create Account
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
                            <h3>Edit User Account</h3>
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
                            <div className="mb-3">
                                <label className={styles.formLabel}>
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    defaultValue="Roberto Cruz"
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className={styles.formLabel}>
                                    Contact Number
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    defaultValue="+63 905 889 1234"
                                    required
                                />
                            </div>
                            <div className="row g-3 mb-4">
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Account Role
                                    </label>
                                    <select
                                        className={styles.formSelect}
                                        defaultValue="Member"
                                    >
                                        <option value="Member">Member</option>
                                        <option value="Staff">
                                            Staff / Front Desk
                                        </option>
                                    </select>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Account Status
                                    </label>
                                    <select
                                        className={styles.formSelect}
                                        defaultValue="Active"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Suspended">
                                            Suspended
                                        </option>
                                        <option value="Inactive">
                                            Inactive
                                        </option>
                                    </select>
                                </div>
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

            {showViewModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>User Profile Details</h3>
                            <button onClick={() => setShowViewModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className="d-flex align-items-center gap-4 mb-4 pb-4 border-bottom border-secondary">
                                <div className={styles.avatarLarge}>RC</div>
                                <div>
                                    <h4
                                        className="text-white mb-1"
                                        style={{
                                            fontFamily: "var(--heading-font)",
                                        }}
                                    >
                                        Roberto Cruz
                                    </h4>
                                    <span
                                        className={styles.roleMember}
                                        style={{
                                            display: "inline-block",
                                            marginBottom: "8px",
                                        }}
                                    >
                                        <i className="fa-regular fa-user"></i>{" "}
                                        Member
                                    </span>
                                    <div
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        Registered: Nov 15, 2025
                                    </div>
                                </div>
                            </div>

                            <div className="row g-4 mb-4">
                                <div className="col-6">
                                    <span className={styles.detailLabel}>
                                        Email Address
                                    </span>
                                    <span className={styles.detailValue}>
                                        robert.cruz@gmail.com
                                    </span>
                                </div>
                                <div className="col-6">
                                    <span className={styles.detailLabel}>
                                        Contact Number
                                    </span>
                                    <span className={styles.detailValue}>
                                        +63 905 889 1234
                                    </span>
                                </div>
                                <div className="col-6">
                                    <span className={styles.detailLabel}>
                                        Current Plan
                                    </span>
                                    <span className={styles.detailValue}>
                                        Monthly Regular
                                    </span>
                                </div>
                                <div className="col-6">
                                    <span className={styles.detailLabel}>
                                        Plan Expiration
                                    </span>
                                    <span className={styles.detailValueWarning}>
                                        Nov 30, 2026
                                    </span>
                                </div>
                            </div>

                            <div
                                className="border border-secondary rounded p-3 text-secondary"
                                style={{
                                    fontSize: "0.85rem",
                                    lineHeight: "1.5",
                                }}
                            >
                                <i className="fa-solid fa-notes-medical text-primary mb-2 d-block fs-5"></i>
                                <strong>Health Notes:</strong> Mild knee
                                sensitivity, prefer dumbbell squats over heavy
                                barbell back squats.
                            </div>

                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setShowViewModal(false)}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnPrimaryModal}
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setShowEditModal(true);
                                    }}
                                >
                                    Edit Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
