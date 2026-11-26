import { useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import styles from "./ClerkPayments.module.css";

export default function ClerkPayments() {
    const [selectedPlan, setSelectedPlan] = useState("monthly");
    const [paymentMethod, setPaymentMethod] = useState("cash");

    const plans = {
        session: {
            name: "Session Walk-in",
            sub: "Student rate: ₱70",
            price: 90,
        },
        weekly: { name: "Weekly Pass", sub: "7 consecutive days", price: 270 },
        twoWeeks: {
            name: "Two Weeks Pass",
            sub: "14 consecutive days",
            price: 540,
        },
        monthly: {
            name: "Monthly Regular",
            sub: "Student rate: ₱750",
            price: 990,
        },
        coach: {
            name: "Coach Fee (Personal)",
            sub: "Mark ₱500 / Analyn ₱600",
            price: 500,
        },
    };

    const currentPrice = plans[selectedPlan].price;

    return (
        <ClerkLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Payments</h1>
                    <p className={styles.pageDesc}>
                        Record gym membership payments and manage the daily cash
                        drawer
                    </p>
                </div>
                <div className={styles.timeBadge}>
                    <i className="fa-regular fa-calendar"></i> Today: Tuesday,
                    Oct 13, 2026
                </div>
            </div>

            <div
                className={styles.drawerCard}
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 border-bottom border-secondary pb-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className={styles.iconBoxPrimary}>
                            <i className="fa-solid fa-cash-register"></i>
                        </div>
                        <div>
                            <h3 className={styles.panelTitle}>
                                Daily Cash Drawer Summary
                            </h3>
                            <p className={styles.panelDesc}>
                                Real-time front desk intake & drawer tally
                            </p>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button className={styles.btnOutline}>
                            <i className="fa-solid fa-bars-staggered"></i>{" "}
                            Record Starting Float
                        </button>
                        <button className={styles.btnOutlinePrimary}>
                            <i className="fa-regular fa-calendar-check"></i> End
                            of Day Review
                        </button>
                    </div>
                </div>

                <div className="row g-3">
                    <div className="col-12 col-sm-6 col-lg">
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>
                                STARTING FLOAT (MORNING)
                            </span>
                            <h3 className={styles.statValue}>₱2,000.00</h3>
                            <span className={styles.statSub}>
                                Initialized 06:00 AM
                            </span>
                        </div>
                    </div>
                    <div className="col-12 col-sm-6 col-lg">
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>
                                CASH COLLECTED TODAY
                            </span>
                            <h3 className={styles.statValueSuccess}>
                                +₱4,150.00
                            </h3>
                            <span className={styles.statSub}>
                                22 Cash Receipts
                            </span>
                        </div>
                    </div>
                    <div className="col-12 col-sm-6 col-lg">
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>
                                GCASH / MAYA TODAY
                            </span>
                            <h3 className={styles.statValuePrimary}>
                                ₱2,270.00
                            </h3>
                            <span className={styles.statSub}>
                                12 Digital Transfers
                            </span>
                        </div>
                    </div>
                    <div className="col-12 col-sm-6 col-lg">
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>
                                TOTAL COLLECTED TODAY
                            </span>
                            <h3 className={styles.statValue}>₱6,420.00</h3>
                            <span className={styles.statSubSuccess}>
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                34 transactions
                            </span>
                        </div>
                    </div>
                    <div className="col-12 col-lg">
                        <div className={styles.statBoxHighlight}>
                            <span className={styles.statLabel}>
                                EXPECTED IN DRAWER
                            </span>
                            <h3 className={styles.statValue}>₱6,150.00</h3>
                            <span className={styles.statSub}>
                                Float (₱2k) + Cash (₱4.15k)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div
                    className="col-12 col-xl-7"
                    data-aos="fade-right"
                    data-aos-delay="200"
                >
                    <div className={styles.panelCard}>
                        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary">
                            <div className="d-flex align-items-center gap-2">
                                <i className="fa-solid fa-file-invoice-dollar text-primary fs-5"></i>
                                <h4
                                    className={styles.panelTitle}
                                    style={{ margin: 0 }}
                                >
                                    Record New Payment
                                </h4>
                            </div>
                            <span className={styles.badgeOutline}>
                                POS Terminal Active
                            </span>
                        </div>

                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Select Member / Walk-in Guest
                                </label>
                                <div className={styles.inputGroup}>
                                    <i className="fa-solid fa-user-tag text-secondary"></i>
                                    <input
                                        type="text"
                                        className={styles.formInputGroup}
                                        defaultValue="Carlos Miguel Mendoza (carlos.mendoza@gmail.com) · Member #049"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="d-flex justify-content-between mb-2">
                                    <label
                                        className={styles.formLabel}
                                        style={{ marginBottom: 0 }}
                                    >
                                        Purchase Item / Service Plan
                                    </label>
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        Single choice selection
                                    </span>
                                </div>
                                <div className="row g-3">
                                    {Object.entries(plans).map(
                                        ([key, plan]) => (
                                            <div
                                                className="col-12 col-md-6"
                                                key={key}
                                            >
                                                <div
                                                    className={`${styles.planOptionCard} ${selectedPlan === key ? styles.planOptionActive : ""}`}
                                                    onClick={() =>
                                                        setSelectedPlan(key)
                                                    }
                                                >
                                                    <div className="d-flex align-items-start gap-3">
                                                        <div
                                                            className={`${styles.radioCircle} ${selectedPlan === key ? styles.radioCircleActive : ""}`}
                                                        >
                                                            {selectedPlan ===
                                                                key && (
                                                                <div
                                                                    className={
                                                                        styles.radioInner
                                                                    }
                                                                ></div>
                                                            )}
                                                        </div>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                                <span
                                                                    className={
                                                                        styles.planName
                                                                    }
                                                                >
                                                                    {plan.name}{" "}
                                                                    {selectedPlan ===
                                                                        key && (
                                                                        <span
                                                                            className={
                                                                                styles.dotIndicator
                                                                            }
                                                                        ></span>
                                                                    )}
                                                                </span>
                                                                <span
                                                                    className={
                                                                        styles.planPrice
                                                                    }
                                                                >
                                                                    ₱
                                                                    {plan.price}
                                                                </span>
                                                            </div>
                                                            <span
                                                                className={
                                                                    styles.planSub
                                                                }
                                                            >
                                                                {plan.sub}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>

                            <div className={styles.totalBox}>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.9rem" }}
                                >
                                    Total Payable Amount
                                </span>
                                <h2 className={styles.totalPrice}>
                                    ₱{currentPrice.toFixed(2)}
                                </h2>
                            </div>

                            <div className="mb-4">
                                <span className={styles.formLabel}>
                                    Select Payment Method
                                </span>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className={`${styles.btnPaymentMethod} ${paymentMethod === "cash" ? styles.btnPaymentMethodActive : ""}`}
                                        onClick={() => setPaymentMethod("cash")}
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
                                        onClick={() => setPaymentMethod("maya")}
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
                                            Cash Tendered (₱)
                                        </label>
                                        <div
                                            className={styles.inputGroupPrefix}
                                        >
                                            <span>₱</span>
                                            <input
                                                type="number"
                                                className={styles.formInputRaw}
                                                defaultValue="1000.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <label className={styles.formLabel}>
                                            Calculated Change
                                        </label>
                                        <div className={styles.changeDisplay}>
                                            <span>₱</span>
                                            <span>
                                                {(1000 - currentPrice).toFixed(
                                                    2,
                                                )}
                                            </span>
                                        </div>
                                    </div>
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
                                        Paperless automated invoice delivered to
                                        carlos.mendoza@gmail.com
                                    </span>
                                </div>
                            </label>

                            <button type="submit" className={styles.btnSubmit}>
                                <i className="fa-solid fa-check"></i> Complete
                                Payment & Issue Receipt
                            </button>
                        </form>
                    </div>
                </div>

                <div
                    className="col-12 col-xl-5 d-flex flex-column gap-4"
                    data-aos="fade-left"
                    data-aos-delay="300"
                >
                    <div className={styles.receiptPreviewCard}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <span className={styles.previewLabel}>
                                EMAIL DISPATCH PREVIEW
                            </span>
                            <i className="fa-regular fa-envelope text-secondary"></i>
                        </div>

                        <h3
                            className="text-white mb-4"
                            style={{
                                fontFamily: "var(--heading-font)",
                                fontSize: "1.3rem",
                                fontWeight: "700",
                            }}
                        >
                            Analyn's Fitness Gym
                        </h3>

                        <div
                            className="d-flex flex-column gap-2 mb-4 pb-4 border-bottom border-secondary border-dashed"
                            style={{ fontSize: "0.85rem" }}
                        >
                            <div className="d-flex justify-content-between">
                                <span className="text-secondary">
                                    Receipt No:
                                </span>
                                <span className="text-white">
                                    REC-2026-1082
                                </span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span className="text-secondary">Date:</span>
                                <span className="text-white">
                                    Today, Oct 13, 2026 · 09:42 AM
                                </span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span className="text-secondary">
                                    Member Name:
                                </span>
                                <span className="text-white">
                                    Carlos Miguel Mendoza
                                </span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span className="text-secondary">
                                    Email Recipient:
                                </span>
                                <span className="text-secondary">
                                    carlos.mendoza@gmail.com
                                </span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span className="text-secondary">
                                    Recorded By:
                                </span>
                                <span className="text-white">
                                    Clerk Juan (Front Desk)
                                </span>
                            </div>
                        </div>

                        <div
                            className="d-flex flex-column gap-2 mb-4 pb-4 border-bottom border-secondary border-dashed"
                            style={{ fontSize: "0.85rem" }}
                        >
                            <div className="d-flex justify-content-between">
                                <span className="text-secondary">
                                    {plans[selectedPlan].name}
                                </span>
                                <span className="text-white">
                                    ₱{currentPrice.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <span
                                className="text-white fw-bold"
                                style={{ fontSize: "0.9rem" }}
                            >
                                Total Paid (Cash):
                            </span>
                            <span
                                className="text-primary fw-bold"
                                style={{
                                    fontSize: "1.5rem",
                                    fontFamily: "var(--heading-font)",
                                }}
                            >
                                ₱{currentPrice.toFixed(2)}
                            </span>
                        </div>

                        <div className="d-flex flex-column flex-sm-row gap-3">
                            <div className={styles.statusPaidBadge}>
                                <span className={styles.dotGreen}></span> Paid ·
                                Receipt Sent to Email
                            </div>
                            <button className={styles.btnResend}>
                                <i className="fa-solid fa-rotate-right"></i>{" "}
                                Resend Receipt Email
                            </button>
                        </div>
                    </div>

                    <div className={styles.panelCard}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="d-flex align-items-center gap-2">
                                <i className="fa-solid fa-clock-rotate-left text-secondary"></i>
                                <h4
                                    className={styles.panelTitle}
                                    style={{ margin: 0 }}
                                >
                                    Today's Recent Transactions
                                </h4>
                            </div>
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.75rem" }}
                            >
                                Last 4 recorded
                            </span>
                        </div>

                        <div className="table-responsive mb-3">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>TIME</th>
                                        <th>MEMBER</th>
                                        <th>ITEM</th>
                                        <th className="text-end">AMOUNT</th>
                                        <th>METHOD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>09:42 AM</td>
                                        <td>
                                            <strong className="text-white">
                                                Carlos Miguel M.
                                            </strong>
                                        </td>
                                        <td>Monthly Regular</td>
                                        <td className="text-white text-end fw-bold">
                                            ₱990.00
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.methodBadgeOutline
                                                }
                                            >
                                                Cash
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>09:15 AM</td>
                                        <td>
                                            <strong className="text-white">
                                                Rico Paolo Cruz
                                            </strong>
                                        </td>
                                        <td>Session Walk-in</td>
                                        <td className="text-white text-end fw-bold">
                                            ₱90.00
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.methodBadgePrimary
                                                }
                                            >
                                                GCash
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>08:50 AM</td>
                                        <td>
                                            <strong className="text-white">
                                                Liza Mae Santos
                                            </strong>
                                        </td>
                                        <td>Coach Analyn</td>
                                        <td className="text-white text-end fw-bold">
                                            ₱600.00
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.methodBadgeOutline
                                                }
                                            >
                                                Maya
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>08:22 AM</td>
                                        <td>
                                            <strong className="text-white">
                                                Walk-in Guest #02
                                            </strong>
                                        </td>
                                        <td>Session Walk-in</td>
                                        <td className="text-white text-end fw-bold">
                                            ₱90.00
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    styles.methodBadgeOutline
                                                }
                                            >
                                                Cash
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex justify-content-between align-items-center border-top border-secondary pt-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                All receipts synced with front desk audit
                            </span>
                            <button className={styles.btnLink}>
                                View full shift ledger
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ClerkLayout>
    );
}
