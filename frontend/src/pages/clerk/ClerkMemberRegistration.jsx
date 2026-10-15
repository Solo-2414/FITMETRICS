import { useEffect, useRef, useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import { api } from "../../lib/api";
import styles from "./ClerkMemberRegistration.module.css";

export default function ClerkMemberRegistration() {
    const [selectedPlan, setSelectedPlan] = useState("monthly");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [addCoach, setAddCoach] = useState(false);
    const [isStudent, setIsStudent] = useState(false);
    const formRef = useRef(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [saving, setSaving] = useState(false);
    const draftKey = "fitmetrics.clerk.member-registration.draft";

    const defaultPlans = {
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

    const [plans, setPlans] = useState(defaultPlans);
    useEffect(() => {
        api("/clerk/plans").then((rows) => {
            const livePlans = Object.fromEntries(rows.map((plan) => [plan.code, {
                name: plan.name,
                duration: `${plan.duration_days} Days Valid`,
                price: Number(plan.price),
                studentPrice: plan.student_price == null ? null : Number(plan.student_price),
            }]));
            setPlans(livePlans);
            if (!livePlans[selectedPlan]) setSelectedPlan(Object.keys(livePlans)[0] || "monthly");
        }).catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        const savedDraft = sessionStorage.getItem(draftKey);
        if (!savedDraft || !formRef.current) return;
        try {
            const draft = JSON.parse(savedDraft);
            if (draft.selectedPlan) setSelectedPlan(draft.selectedPlan);
            if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
            if (typeof draft.addCoach === "boolean") setAddCoach(draft.addCoach);
            if (typeof draft.isStudent === "boolean") setIsStudent(draft.isStudent);
            const inputs = formRef.current.querySelectorAll("input");
            const selects = formRef.current.querySelectorAll("select");
            (draft.inputs || []).forEach((value, index) => {
                if (inputs[index] && inputs[index].type !== "checkbox") inputs[index].value = value;
            });
            (draft.selects || []).forEach((value, index) => {
                if (selects[index]) selects[index].value = value;
            });
        } catch {
            sessionStorage.removeItem(draftKey);
        }
    }, []);

    useEffect(() => {
        const form = formRef.current;
        if (!form) return undefined;
        const saveDraft = () => {
            sessionStorage.setItem(draftKey, JSON.stringify({
                inputs: [...form.querySelectorAll("input")].map((input) => input.type === "checkbox" ? input.checked : input.value),
                selects: [...form.querySelectorAll("select")].map((select) => select.value),
                selectedPlan,
                paymentMethod,
                addCoach,
                isStudent,
            }));
        };
        form.addEventListener("input", saveDraft);
        form.addEventListener("change", saveDraft);
        return () => {
            form.removeEventListener("input", saveDraft);
            form.removeEventListener("change", saveDraft);
        };
    }, [selectedPlan, paymentMethod, addCoach, isStudent]);

    const clearDraft = ({ clearMessages = true } = {}) => {
        formRef.current?.reset();
        sessionStorage.removeItem(draftKey);
        setSelectedPlan(Object.keys(plans)[0] || "monthly");
        setPaymentMethod("cash");
        setAddCoach(false);
        setIsStudent(false);
        if (clearMessages) {
            setError("");
            setSuccess("");
        }
    };
    const currentPlan = plans[selectedPlan] || Object.values(plans)[0] || defaultPlans.monthly;
    const currentPrice = isStudent && currentPlan.studentPrice != null
        ? currentPlan.studentPrice
        : currentPlan.price || 0;
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

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <form ref={formRef} onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setError("");
                setSuccess("");
                const inputs = [...formRef.current.querySelectorAll("input")];
                const selects = [...formRef.current.querySelectorAll("select")];
                try {
                    await api("/clerk/register", {
                        method: "POST",
                        body: {
                            full_name: inputs[0].value,
                            phone: inputs[1].value,
                            email: inputs[2].value,
                            password: inputs[3].value,
                            gender: selects[0].value,
                            emergency_contact_name: inputs[4].value,
                            emergency_contact_phone: inputs[5].value,
                            plan_code: selectedPlan,
                            is_student: isStudent,
                            coach_addon_amount: addCoach ? 500 : 0,
                            payment_method: paymentMethod,
                        },
                    });
                    clearDraft({ clearMessages: false });
                    setSuccess(selectedPlan === "session"
                        ? "Session pass payment was recorded for the walk-in visitor."
                        : "Member account, membership, and payment were created successfully.");
                } catch (err) {
                    setError(err.message);
                } finally {
                    setSaving(false);
                }
            }}>
                <div className="d-flex justify-content-end mb-3">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={clearDraft}
                        title="Clear the saved registration draft"
                    >
                        <i className="fa-solid fa-rotate-left me-2"></i>
                        Clear form
                    </button>
                </div>
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
                                            required={selectedPlan !== "session"}
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
                                            required={selectedPlan !== "session"}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Gender
                                        </label>
                                        <select
                                            className={styles.formSelect}
                                            required={selectedPlan !== "session"}
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
                                            required={selectedPlan !== "session"}
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
                                            required={selectedPlan !== "session"}
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
                                    {Object.entries(plans).map(([code, plan]) => (
                                        <div className="col-12 col-sm-6" key={code}>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                className={`${styles.planCard} ${selectedPlan === code ? styles.planCardActive : ""}`}
                                                onClick={() => setSelectedPlan(code)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") setSelectedPlan(code);
                                                }}
                                            >
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <span className={styles.planName}>{plan.name}</span>
                                                        <span className={styles.planDuration}>{plan.duration}</span>
                                                    </div>
                                                    <span className={`${styles.radioCircle} ${selectedPlan === code ? styles.radioCircleActive : ""}`}>
                                                        {selectedPlan === code && <span className={styles.radioInner}></span>}
                                                    </span>
                                                </div>
                                                <h3 className={styles.planPrice}>
                                                    ₱{plan.price.toLocaleString()}
                                                    {plan.studentPrice != null && <span className={styles.planPriceSub}> (Student: ₱{plan.studentPrice.toLocaleString()})</span>}
                                                </h3>
                                            </div>
                                        </div>
                                    ))}
                                    {!Object.keys(plans).length && <div className="col-12 text-secondary">No membership passes configured.</div>}
                                </div>
                                <label className={`${styles.infoAlert} ${styles.studentRateToggle}`}>
                                    <input
                                        type="checkbox"
                                        className={styles.customCheckbox}
                                        checked={isStudent}
                                        onChange={(event) => setIsStudent(event.target.checked)}
                                    />
                                    <i className="fa-regular fa-circle-check"></i>
                                    <span>
                                        Apply student rate for this member
                                        <small className="d-block mt-1">
                                            {currentPlan.studentPrice == null
                                                ? "No student rate is configured for this plan."
                                                : `This uses ₱${currentPlan.studentPrice.toLocaleString()} instead of ₱${Number(currentPlan.price).toLocaleString()}.`}
                                        </small>
                                    </span>
                                </label>
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
                                        {currentPlan.name} (
                                        {currentPlan.duration.replace(
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
                            <button type="submit" disabled={saving} className={styles.btnSubmit}>
                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                {saving ? "Saving..." : "Complete Registration & Send Email"}
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
