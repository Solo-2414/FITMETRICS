import { useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import styles from "./AdminMembershipPlans.module.css";

export default function AdminMembershipPlans() {
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPromoModal, setShowPromoModal] = useState(false);

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
                    <h1 className={styles.pageTitle}>Membership Plans</h1>
                    <p className={styles.pageDesc}>
                        Manage gym membership rates, student rates, and
                        discounts
                    </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    <button
                        className={styles.btnSecondary}
                        onClick={() => setShowPromoModal(true)}
                    >
                        <i className="fa-solid fa-tags"></i> Promos
                    </button>
                    <button
                        className={styles.btnSecondary}
                        onClick={() => setShowEditModal(true)}
                    >
                        <i className="fa-solid fa-pen"></i> Edit Rates
                    </button>
                    <button
                        className={styles.btnPrimary}
                        onClick={() => setShowAddModal(true)}
                    >
                        <i className="fa-solid fa-plus"></i> Add New Plan
                    </button>
                </div>
            </div>

            <div
                className="row g-3 mb-5"
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="col-12 col-md-4">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Total Active Passes</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-id-card-clip"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>148</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                +8% from yesterday
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Session Walk-Ins</span>
                            <div className={styles.iconBoxSecondary}>
                                <i className="fa-solid fa-person-walking"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>18</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>Logged today</span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Monthly Roster</span>
                            <div className={styles.iconBoxSuccess}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>98</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>
                                Most popular tier
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4"
                data-aos="fade-up"
                data-aos-delay="200"
            >
                <h3 className={styles.sectionTitle}>Standard Access Tiers</h3>
                <span className={styles.sectionSubtitle}>
                    Strict pure admission rates · Direct entry
                </span>
            </div>

            <div
                className="row g-4 mb-5"
                data-aos="fade-up"
                data-aos-delay="300"
            >
                <div className="col-12 col-md-6 col-xl-3">
                    <div className={styles.planCard}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className={styles.planTag}>
                                Daily Walk-In
                            </span>
                            <i className="fa-solid fa-person-walking text-secondary"></i>
                        </div>
                        <h4 className={styles.planName}>Session / Walk-In</h4>
                        <div className={styles.priceContainer}>
                            <h2 className={styles.planPrice}>₱90</h2>
                            <span className={styles.planDuration}>/ day</span>
                        </div>
                        <p className={styles.planDesc}>
                            Access to gym floor for the day.
                        </p>

                        <div className={styles.studentRateBox}>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className={styles.studentLabel}>
                                    Student Session Rate
                                </span>
                                <span className={styles.studentPrice}>₱70</span>
                            </div>
                            <p className={styles.studentDesc}>
                                Available upon counter registration.
                            </p>
                        </div>

                        <div className={styles.planFooter}>
                            <span className={styles.footerStat}>
                                <i className="fa-regular fa-user"></i> 18 today
                            </span>
                            <span className={styles.footerStatusActive}>
                                Active regular
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-xl-3">
                    <div className={styles.planCard}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className={styles.planTag}>Short Term</span>
                            <i className="fa-regular fa-calendar text-secondary"></i>
                        </div>
                        <h4 className={styles.planName}>Weekly Pass</h4>
                        <div className={styles.priceContainer}>
                            <h2 className={styles.planPrice}>₱270</h2>
                            <span className={styles.planDuration}>
                                / 7 days
                            </span>
                        </div>
                        <p className={styles.planDesc}>
                            Full gym access for 7 days.
                        </p>

                        <div className={styles.featureBox}>
                            <i className="fa-solid fa-check text-secondary"></i>
                            <div>
                                <span className={styles.featureTitle}>
                                    Unrestricted equipment entry
                                </span>
                                <p className={styles.featureDesc}>
                                    Direct admission. Valid for 7 consecutive
                                    days.
                                </p>
                            </div>
                        </div>

                        <div className={styles.planFooter}>
                            <span className={styles.footerStat}>
                                <i className="fa-solid fa-id-card-clip"></i> 14
                                active passes
                            </span>
                            <span className={styles.footerStatusNeutral}>
                                7-Day Cycle
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-xl-3">
                    <div className={styles.planCard}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className={styles.planTag}>Bi-Weekly</span>
                            <i className="fa-regular fa-calendar-check text-secondary"></i>
                        </div>
                        <h4 className={styles.planName}>Two Weeks Pass</h4>
                        <div className={styles.priceContainer}>
                            <h2 className={styles.planPrice}>₱540</h2>
                            <span className={styles.planDuration}>
                                / 14 days
                            </span>
                        </div>
                        <p className={styles.planDesc}>
                            Full gym access for 14 days.
                        </p>

                        <div className={styles.featureBox}>
                            <i className="fa-solid fa-check text-secondary"></i>
                            <div>
                                <span className={styles.featureTitle}>
                                    Unrestricted equipment entry
                                </span>
                                <p className={styles.featureDesc}>
                                    Straightforward access without renewal
                                    locks.
                                </p>
                            </div>
                        </div>

                        <div className={styles.planFooter}>
                            <span className={styles.footerStat}>
                                <i className="fa-solid fa-id-card-clip"></i> 18
                                active passes
                            </span>
                            <span className={styles.footerStatusNeutral}>
                                14-Day Cycle
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-md-6 col-xl-3">
                    <div className={styles.planCardPopular}>
                        <div className={styles.popularRibbon}>POPULAR</div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className={styles.planTagPopular}>
                                Standard 30 Days
                            </span>
                            <i className="fa-solid fa-calendar-days text-primary"></i>
                        </div>
                        <h4 className={styles.planName}>Monthly Plan</h4>
                        <div className={styles.priceContainer}>
                            <h2 className={styles.planPricePopular}>₱990</h2>
                            <span className={styles.planDuration}>
                                / 30 days
                            </span>
                        </div>
                        <p className={styles.planDesc}>
                            Full access to gym floor for 30 consecutive days.
                        </p>

                        <div className={styles.studentRateBox}>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className={styles.studentLabel}>
                                    Student Monthly Rate
                                </span>
                                <span className={styles.studentPrice}>
                                    ₱750
                                </span>
                            </div>
                            <p className={styles.studentDesc}>
                                Available upon counter registration.
                            </p>
                        </div>

                        <div className={styles.planFooter}>
                            <span className={styles.footerStatPopular}>
                                <i className="fa-solid fa-star"></i> 98 active
                                members
                            </span>
                            <span className={styles.footerStatusPrimary}>
                                Primary Volume
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={styles.policyBanner}
                data-aos="fade-up"
                data-aos-delay="400"
            >
                <i className="fa-solid fa-shield-halved"></i>
                <div>
                    <h5
                        className="text-white m-0 mb-1"
                        style={{ fontSize: "0.95rem" }}
                    >
                        Direct Gym Access Policy
                    </h5>
                    <p
                        className="text-secondary m-0"
                        style={{ fontSize: "0.85rem", lineHeight: "1.5" }}
                    >
                        All rates strictly cover standard admission to gym
                        equipment and the workout area for the designated
                        validity window. No personal trainer sessions or extra
                        facility tiers are bundled into these passes.
                    </p>
                </div>
            </div>

            {showEditModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Edit Membership Rates</h3>
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
                                    Select Plan to Edit
                                </label>
                                <select className={styles.formSelect}>
                                    <option>Monthly Plan</option>
                                    <option>Two Weeks Pass</option>
                                    <option>Weekly Pass</option>
                                    <option>Session / Walk-In</option>
                                </select>
                            </div>
                            <div className="row g-3 mb-4">
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Standard Rate (₱)
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        defaultValue="990"
                                        required
                                    />
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Student Rate (₱)
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        defaultValue="750"
                                    />
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

            {showAddModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Add New Plan</h3>
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
                                <div className="col-12 col-sm-8">
                                    <label className={styles.formLabel}>
                                        Plan Name
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="e.g. Quarterly Pass"
                                        required
                                    />
                                </div>
                                <div className="col-12 col-sm-4">
                                    <label className={styles.formLabel}>
                                        Duration (Days)
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        placeholder="90"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Standard Rate (₱)
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        placeholder="2500"
                                        required
                                    />
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Student Rate (₱)
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Short Description
                                </label>
                                <textarea
                                    className={styles.formTextarea}
                                    rows="2"
                                    placeholder="Describe the access privileges..."
                                ></textarea>
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
                                    Create Plan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPromoModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Set Promos & Discounts</h3>
                            <button onClick={() => setShowPromoModal(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <form
                            onSubmit={(e) =>
                                handleFormSubmit(e, setShowPromoModal)
                            }
                            className={styles.modalBody}
                        >
                            <div className="mb-3">
                                <label className={styles.formLabel}>
                                    Promo Title
                                </label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="e.g. Summer Special"
                                    required
                                />
                            </div>
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Discount Amount (₱)
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.formInput}
                                        placeholder="e.g. 100"
                                        required
                                    />
                                </div>
                                <div className="col-12 col-sm-6">
                                    <label className={styles.formLabel}>
                                        Valid Until
                                    </label>
                                    <input
                                        type="date"
                                        className={styles.formInput}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Applicable Plan
                                </label>
                                <select className={styles.formSelect}>
                                    <option>All Plans</option>
                                    <option>Monthly Plan</option>
                                    <option>Two Weeks Pass</option>
                                    <option>Weekly Pass</option>
                                </select>
                            </div>
                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setShowPromoModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnPrimaryModal}
                                >
                                    Activate Promo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
