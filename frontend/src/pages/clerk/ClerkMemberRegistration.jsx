import { useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import styles from "./ClerkMemberRegistration.module.css";

export default function ClerkMemberRegistration() {
    const [selectedPlan, setSelectedPlan] = useState("monthly");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [addCoach, setAddCoach] = useState(false);

    const plans = {
        session: {
            name: "Session / Walk-In",
            duration: "Single Day Pass",
            price: 90,
        },
        weekly: { name: "Weekly Pass", duration: "7 Days Valid", price: 270 },
        biweekly: {
            name: "Two Weeks Pass",
            duration: "14 Days Valid",
            price: 540,
        },
        monthly: {
            name: "Monthly Regular",
            duration: "30 Days Valid",
            price: 990,
        },
    };

    const currentPrice = plans[selectedPlan].price;
    const totalDue = currentPrice + (addCoach ? 500 : 0);

    return (
        <ClerkLayout>
            <div
                className="d-flex align-items-center gap-2 mb-3 text-secondary"
                style={{ fontSize: "0.8rem" }}
                data-aos="fade-down"
            >
                <span>Desk Console</span>
                <i
                    className="fa-solid fa-chevron-right"
                    style={{ fontSize: "0.6rem" }}
                ></i>
                <span className="text-white fw-bold">Register Member</span>
            </div>

            <div className="mb-4" data-aos="fade-down" data-aos-delay="100">
                <h1 className={styles.pageTitle}>Member Registration</h1>
                <p className={styles.pageDesc}>
                    Register a new gym member and set up their member account
                </p>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-xl-8 d-flex flex-column gap-4">
                        {/* Personal Info Card */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-right"
                            data-aos-delay="200"
                        >
                            <div className={styles.panelHeader}>
                                <i className="fa-regular fa-user text-primary"></i>
                                <span>Member Personal Information</span>
                            </div>

                            <div className={styles.panelBody}>
                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="e.g. Juanito dela Cruz"
                                        required
                                    />
                                </div>
                                <div className="row g-3 mb-3">
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Mobile Contact Number
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="0917 123 4567"
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            className={styles.formInput}
                                            placeholder="juan.delacruz@example.com"
                                            required
                                        />
                                        <span className={styles.helperText}>
                                            <i className="fa-solid fa-circle-info me-1"></i>{" "}
                                            Used to send digital receipts and
                                            login credentials
                                        </span>
                                    </div>
                                </div>
                                <div className="row g-3 mb-3">
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Password
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Create a strong password"
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Gender
                                        </label>
                                        <select
                                            className={styles.formSelect}
                                            required
                                        >
                                            <option value="">
                                                Select gender
                                            </option>
                                            <option value="male">Male</option>
                                            <option value="female">
                                                Female
                                            </option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Emergency Contact Name
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Maria dela Cruz"
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Emergency Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="0918 765 4321"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Membership Plan Selection */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-right"
                            data-aos-delay="300"
                        >
                            <div className="d-flex justify-content-between align-items-center border-bottom border-secondary p-4">
                                <div className={styles.panelHeaderNoBorder}>
                                    <i className="fa-solid fa-id-card-clip text-primary"></i>
                                    <span>Membership Plan Selection</span>
                                </div>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.8rem" }}
                                >
                                    Local gym rates
                                </span>
                            </div>

                            <div className={styles.panelBody}>
                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-sm-6">
                                        <div
                                            className={`${styles.planCard} ${selectedPlan === "session" ? styles.planCardActive : ""}`}
                                            onClick={() =>
                                                setSelectedPlan("session")
                                            }
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span
                                                        className={
                                                            styles.planName
                                                        }
                                                    >
                                                        Session / Walk-In
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.planDuration
                                                        }
                                                    >
                                                        Single Day Pass
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.radioCircle} ${selectedPlan === "session" ? styles.radioCircleActive : ""}`}
                                                ></div>
                                            </div>
                                            <h3 className={styles.planPrice}>
                                                ₱90{" "}
                                                <span
                                                    className={
                                                        styles.planPriceSub
                                                    }
                                                >
                                                    (Student: ₱70)
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div
                                            className={`${styles.planCard} ${selectedPlan === "weekly" ? styles.planCardActive : ""}`}
                                            onClick={() =>
                                                setSelectedPlan("weekly")
                                            }
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span
                                                        className={
                                                            styles.planName
                                                        }
                                                    >
                                                        Weekly Pass
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.planDuration
                                                        }
                                                    >
                                                        7 Days Valid
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.radioCircle} ${selectedPlan === "weekly" ? styles.radioCircleActive : ""}`}
                                                ></div>
                                            </div>
                                            <h3 className={styles.planPrice}>
                                                ₱270
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div
                                            className={`${styles.planCard} ${selectedPlan === "biweekly" ? styles.planCardActive : ""}`}
                                            onClick={() =>
                                                setSelectedPlan("biweekly")
                                            }
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span
                                                        className={
                                                            styles.planName
                                                        }
                                                    >
                                                        Two Weeks Pass
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.planDuration
                                                        }
                                                    >
                                                        14 Days Valid
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.radioCircle} ${selectedPlan === "biweekly" ? styles.radioCircleActive : ""}`}
                                                ></div>
                                            </div>
                                            <h3 className={styles.planPrice}>
                                                ₱540
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div
                                            className={`${styles.planCard} ${selectedPlan === "monthly" ? styles.planCardActive : ""}`}
                                            onClick={() =>
                                                setSelectedPlan("monthly")
                                            }
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span
                                                        className={
                                                            styles.planName
                                                        }
                                                    >
                                                        Monthly Regular{" "}
                                                        <span
                                                            className={
                                                                styles.popularBadge
                                                            }
                                                        >
                                                            Popular
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.planDuration
                                                        }
                                                    >
                                                        30 Days Valid
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.radioCircle} ${selectedPlan === "monthly" ? styles.radioCircleActive : ""}`}
                                                >
                                                    {selectedPlan ===
                                                        "monthly" && (
                                                        <div
                                                            className={
                                                                styles.radioInner
                                                            }
                                                        ></div>
                                                    )}
                                                </div>
                                            </div>
                                            <h3 className={styles.planPrice}>
                                                ₱990{" "}
                                                <span
                                                    className={
                                                        styles.planPriceSub
                                                    }
                                                >
                                                    (Student: ₱750)
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.infoAlert}>
                                    <i className="fa-regular fa-circle-check"></i>
                                    <span>
                                        Student rates apply automatically upon
                                        clerk verification.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Optional Coach */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-right"
                            data-aos-delay="400"
                        >
                            <div className={styles.panelHeader}>
                                <i className="fa-solid fa-user-tie text-primary"></i>
                                <span>Optional Coach Assistance</span>
                            </div>

                            <div className={styles.panelBody}>
                                <div className={styles.coachToggleBox}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.customCheckbox}
                                            checked={addCoach}
                                            onChange={() =>
                                                setAddCoach(!addCoach)
                                            }
                                        />
                                        <div>
                                            <span className={styles.planName}>
                                                Add Coach Assistance (+₱500)
                                            </span>
                                            <span
                                                className={styles.planDuration}
                                            >
                                                Adds personal guidance for
                                                fitness routines
                                            </span>
                                        </div>
                                    </label>
                                    <select
                                        className={styles.formSelect}
                                        disabled={!addCoach}
                                        style={{ width: "200px" }}
                                    >
                                        <option value="none">
                                            Select Coach
                                        </option>
                                        <option value="mark">Coach Mark</option>
                                        <option value="analyn">
                                            Coach Analyn
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                        {/* Receipt Box */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-left"
                            data-aos-delay="200"
                        >
                            <div className={styles.panelHeader}>
                                <i className="fa-solid fa-receipt text-primary"></i>
                                <span>Payment & Digital Receipt</span>
                            </div>

                            <div className={styles.panelBody}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        {plans[selectedPlan].name} (
                                        {plans[selectedPlan].duration.replace(
                                            " Valid",
                                            "",
                                        )}
                                        )
                                    </span>
                                    <span className="text-white fw-bold">
                                        ₱{currentPrice}
                                    </span>
                                </div>
                                {addCoach && (
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <span
                                            className="text-secondary"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Coach Assistance
                                        </span>
                                        <span className="text-white fw-bold">
                                            ₱500
                                        </span>
                                    </div>
                                )}

                                <div className={styles.totalBox}>
                                    <span
                                        className="text-white"
                                        style={{ fontSize: "0.9rem" }}
                                    >
                                        Total Amount Due
                                    </span>
                                    <h2 className={styles.totalPrice}>
                                        ₱{totalDue}
                                    </h2>
                                </div>

                                <div className="mb-4">
                                    <span className={styles.formLabel}>
                                        Payment Method
                                    </span>
                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className={`${styles.btnPaymentMethod} ${paymentMethod === "cash" ? styles.btnPaymentMethodActive : ""}`}
                                            onClick={() =>
                                                setPaymentMethod("cash")
                                            }
                                        >
                                            <i className="fa-solid fa-money-bill"></i>{" "}
                                            Cash
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.btnPaymentMethod} ${paymentMethod === "gcash" ? styles.btnPaymentMethodActive : ""}`}
                                            onClick={() =>
                                                setPaymentMethod("gcash")
                                            }
                                        >
                                            <i className="fa-solid fa-mobile-screen"></i>{" "}
                                            GCash
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.btnPaymentMethod} ${paymentMethod === "maya" ? styles.btnPaymentMethodActive : ""}`}
                                            onClick={() =>
                                                setPaymentMethod("maya")
                                            }
                                        >
                                            <i className="fa-solid fa-mobile-button"></i>{" "}
                                            Maya
                                        </button>
                                    </div>
                                </div>

                                {paymentMethod === "cash" && (
                                    <div className="row g-3 mb-4">
                                        <div className="col-6">
                                            <label className={styles.formLabel}>
                                                Cash Tendered
                                            </label>
                                            <div
                                                className={
                                                    styles.inputGroupPrefix
                                                }
                                            >
                                                <span>₱</span>
                                                <input
                                                    type="number"
                                                    className={styles.formInput}
                                                    placeholder="1000"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <label className={styles.formLabel}>
                                                Change
                                            </label>
                                            <div
                                                className={styles.changeDisplay}
                                            >
                                                ₱0
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {paymentMethod !== "cash" && (
                                    <div className="mb-4">
                                        <label className={styles.formLabel}>
                                            Reference Number
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Enter transaction ref"
                                        />
                                    </div>
                                )}

                                <label className={styles.checkboxLabelFull}>
                                    <input
                                        type="checkbox"
                                        className={styles.customCheckbox}
                                        defaultChecked
                                    />
                                    <div>
                                        <span
                                            className="d-block text-white fw-bold mb-1"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Send Digital Receipt to Member Email
                                        </span>
                                        <span
                                            className="text-secondary"
                                            style={{
                                                fontSize: "0.75rem",
                                                lineHeight: "1.4",
                                            }}
                                        >
                                            Sends breakdown and credentials.
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div
                            className={styles.actionPanel}
                            data-aos="fade-left"
                            data-aos-delay="300"
                        >
                            <button type="button" className={styles.btnSubmit}>
                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                Complete Registration & Send Email
                            </button>
                            <button
                                type="button"
                                className={styles.btnCancelFull}
                            >
                                Cancel
                            </button>
                            <p
                                className="text-center text-secondary mt-3 mb-0"
                                style={{
                                    fontSize: "0.75rem",
                                    lineHeight: "1.5",
                                }}
                            >
                                An account will be created automatically. The
                                member can log in using their email and
                                temporary password to access the Gym Member
                                Portal.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </ClerkLayout>
    );
}
