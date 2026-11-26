import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberBilling.module.css";

export default function MemberBilling() {
    return (
        <MemberLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
                data-aos-delay="100"
            >
                <div>
                    <h1 className={styles.pageTitle}>Billing & Receipts</h1>
                    <p className={styles.pageDesc}>
                        Review your payments, upcoming monthly renewals, and
                        instant copies of gym receipts.
                    </p>
                </div>
                <div className={styles.emailBadge}>
                    <i className="fa-regular fa-envelope"></i> Official digital
                    receipts are auto-sent to michael.tanza@example.com
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div
                    className="col-12 col-md-4"
                    data-aos="fade-up"
                    data-aos-delay="100"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div
                            className="d-flex justify-content-between align-items-center mb-3 text-secondary"
                            style={{
                                fontSize: "0.75rem",
                                letterSpacing: "1px",
                            }}
                        >
                            <span>CURRENT ACCOUNT BALANCE</span>
                            <i className="fa-regular fa-circle-check text-success fs-5"></i>
                        </div>
                        <h3 className={styles.kpiValue}>₱0.00</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.statusSettled}>
                                <span className={styles.dotSettled}></span>{" "}
                                Fully Settled
                            </span>
                            <span className={styles.kpiSub}>
                                No pending fees
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-md-4"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <div className={`${styles.kpiCard} h-100 p-4`}>
                        <div
                            className="d-flex justify-content-between align-items-center mb-3 text-secondary"
                            style={{
                                fontSize: "0.75rem",
                                letterSpacing: "1px",
                            }}
                        >
                            <span>NEXT RENEWAL DATE</span>
                            <i className="fa-regular fa-calendar fs-5"></i>
                        </div>
                        <h3 className={styles.kpiValue}>November 28, 2026</h3>
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className={styles.kpiSub}>
                                <i className="fa-regular fa-clock"></i> 14 Days
                                Remaining
                            </span>
                            <span className={styles.kpiSub}>
                                Monthly Membership
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-md-4"
                    data-aos="fade-up"
                    data-aos-delay="300"
                >
                    <div className={`${styles.kpiCardBlue} h-100 p-4`}>
                        <div
                            className="d-flex justify-content-between align-items-center mb-3 text-secondary"
                            style={{
                                fontSize: "0.75rem",
                                letterSpacing: "1px",
                            }}
                        >
                            <span>EXPECTED RENEWAL AMOUNT</span>
                            <span className={styles.upcomingBadge}>
                                Upcoming
                            </span>
                        </div>
                        <h3 className={styles.kpiValueBlue}>₱1,490.00</h3>
                        <p className={styles.kpiDescBlue}>
                            Monthly Regular ₱990 + Coach Mark ₱500
                        </p>
                        <div className={styles.settleNotice}>
                            <i className="fa-solid fa-circle-info"></i> Settled
                            directly with staff at the counter
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div
                    className="col-12 col-lg-8"
                    data-aos="fade-right"
                    data-aos-delay="400"
                >
                    <div className={`${styles.panelCard} p-4`}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3">
                            <div>
                                <h3 className={styles.panelTitle}>
                                    Payment History
                                </h3>
                                <p className={styles.panelDesc}>
                                    All verified counter payments and automated
                                    digital slips
                                </p>
                            </div>
                            <div className="d-flex flex-column flex-sm-row gap-3">
                                <div className={styles.searchBox}>
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                    <input
                                        type="text"
                                        placeholder="Search receipt or item..."
                                    />
                                </div>
                                <button className={styles.btnFilter}>
                                    All Payments{" "}
                                    <i className="fa-solid fa-chevron-down"></i>
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className={`table ${styles.customTable}`}>
                                <thead>
                                    <tr>
                                        <th>RECEIPT #</th>
                                        <th>DATE</th>
                                        <th>ITEM / SERVICE</th>
                                        <th>METHOD</th>
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className={styles.colMuted}>
                                            REC-2026-1949
                                        </td>
                                        <td className={styles.colMuted}>
                                            Oct 29, 2026
                                        </td>
                                        <td>
                                            <strong className="d-block mb-1 text-white">
                                                Monthly Regular + Coach Mark
                                            </strong>
                                            <span className={styles.itemDesc}>
                                                Member renewal cycle #10
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="d-inline-flex align-items-center gap-2"
                                                style={{ fontSize: "0.8rem" }}
                                            >
                                                <span
                                                    className={styles.dotBlue}
                                                ></span>{" "}
                                                GCash
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white">
                                                ₱1,490.00
                                            </strong>
                                        </td>
                                        <td>
                                            <span className={styles.statusPaid}>
                                                Paid
                                            </span>
                                        </td>
                                        <td>
                                            <button className={styles.btnLink}>
                                                View{" "}
                                                <i className="fa-solid fa-receipt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.colMuted}>
                                            REC-2026-1912
                                        </td>
                                        <td className={styles.colMuted}>
                                            Oct 15, 2026
                                        </td>
                                        <td>
                                            <strong className="d-block mb-1 text-white">
                                                Water Cup Refill (₱10)
                                            </strong>
                                            <span className={styles.itemDesc}>
                                                Counter mineral dispenser
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="d-inline-flex align-items-center gap-2"
                                                style={{ fontSize: "0.8rem" }}
                                            >
                                                <span
                                                    className={styles.dotGreen}
                                                ></span>{" "}
                                                Cash
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white">
                                                ₱10.00
                                            </strong>
                                        </td>
                                        <td>
                                            <span className={styles.statusPaid}>
                                                Paid
                                            </span>
                                        </td>
                                        <td>
                                            <button className={styles.btnLink}>
                                                View{" "}
                                                <i className="fa-solid fa-receipt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.colMuted}>
                                            REC-2026-8965
                                        </td>
                                        <td className={styles.colMuted}>
                                            Sep 29, 2026
                                        </td>
                                        <td>
                                            <strong className="d-block mb-1 text-white">
                                                Monthly Regular Pass
                                            </strong>
                                            <span className={styles.itemDesc}>
                                                Gym floor access pass
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="d-inline-flex align-items-center gap-2"
                                                style={{ fontSize: "0.8rem" }}
                                            >
                                                <span
                                                    className={styles.dotOrange}
                                                ></span>{" "}
                                                Maya
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white">
                                                ₱990.00
                                            </strong>
                                        </td>
                                        <td>
                                            <span className={styles.statusPaid}>
                                                Paid
                                            </span>
                                        </td>
                                        <td>
                                            <button className={styles.btnLink}>
                                                View{" "}
                                                <i className="fa-solid fa-receipt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.colMuted}>
                                            REC-2026-8891
                                        </td>
                                        <td className={styles.colMuted}>
                                            Aug 29, 2026
                                        </td>
                                        <td>
                                            <strong className="d-block mb-1 text-white">
                                                Monthly Regular + Coach Mark
                                            </strong>
                                            <span className={styles.itemDesc}>
                                                Member renewal cycle #8
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="d-inline-flex align-items-center gap-2"
                                                style={{ fontSize: "0.8rem" }}
                                            >
                                                <span
                                                    className={styles.dotBlue}
                                                ></span>{" "}
                                                GCash
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="d-block text-white">
                                                ₱1,490.00
                                            </strong>
                                        </td>
                                        <td>
                                            <span className={styles.statusPaid}>
                                                Paid
                                            </span>
                                        </td>
                                        <td>
                                            <button className={styles.btnLink}>
                                                View{" "}
                                                <i className="fa-solid fa-receipt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-bottom border-secondary pb-4 mt-4 mb-4 gap-3">
                            <span
                                className="text-secondary"
                                style={{ fontSize: "0.8rem" }}
                            >
                                Showing 4 recorded payments for year 2026
                            </span>
                            <button className={styles.btnLinkText}>
                                View Archived Receipts (2025){" "}
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>

                        <div
                            className="mt-4"
                            data-aos="fade-up"
                            data-aos-delay="500"
                        >
                            <div className="d-flex flex-column flex-md-row align-items-md-start gap-3 mb-4">
                                <i className="fa-solid fa-cash-register text-secondary fs-4 mt-1"></i>
                                <div>
                                    <h5
                                        className="text-white mb-2"
                                        style={{ fontSize: "1rem" }}
                                    >
                                        Accepted Counter Payment Methods
                                    </h5>
                                    <p
                                        className="mb-0 text-secondary"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        You can pay or top up anytime right at
                                        the gym counter using Cash, or GCash /
                                        Maya instant mobile transfer.
                                    </p>
                                </div>
                            </div>
                            <div className={styles.methodsGrid}>
                                <div className={styles.methodCard}>
                                    <i className="fa-solid fa-money-bill text-success"></i>
                                    <div>
                                        <h6>Cash</h6>
                                        <p>Hand directly to staff</p>
                                    </div>
                                </div>
                                <div className={styles.methodCard}>
                                    <i className="fa-solid fa-mobile-screen text-primary"></i>
                                    <div>
                                        <h6>GCash</h6>
                                        <p>Instant mobile transfer</p>
                                    </div>
                                </div>
                                <div className={styles.methodCard}>
                                    <i className="fa-solid fa-mobile-button text-warning"></i>
                                    <div>
                                        <h6>Maya</h6>
                                        <p>Instant zero-fee transfer</p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="d-flex align-items-center gap-2 text-secondary mt-3"
                                style={{ fontSize: "0.8rem" }}
                            >
                                <i className="fa-regular fa-circle-check"></i>{" "}
                                All receipts are sent automatically to your
                                registered email address right after payment.
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="col-12 col-lg-4"
                    data-aos="fade-left"
                    data-aos-delay="500"
                >
                    <div className={styles.receiptPanel}>
                        <div
                            className={`${styles.receiptHeader} p-4 border-bottom border-secondary border-dashed`}
                        >
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h3 className={styles.receiptBrand}>
                                        Analyn's Fitness Gym
                                    </h3>
                                    <p className={styles.receiptSubBrand}>
                                        Neighborhood Gym & Training Club
                                    </p>
                                </div>
                                <span className={styles.officialBadge}>
                                    OFFICIAL RECEIPT
                                </span>
                            </div>
                            <p className={styles.receiptAddress}>
                                Purok 3, San Isidro St. Main Gym Hub
                            </p>
                        </div>

                        <div className="p-4">
                            <div className="row g-4 mb-4">
                                <div className="col-6">
                                    <span className={styles.recLabel}>
                                        Member Name
                                    </span>
                                    <span className={styles.recValue}>
                                        Michael Andre Tanza
                                    </span>
                                </div>
                                <div className="col-6">
                                    <span className={styles.recLabel}>
                                        Date & Time
                                    </span>
                                    <span className={styles.recValue}>
                                        Oct 29, 2026
                                        <br />
                                        04:15 PM
                                    </span>
                                </div>
                                <div className="col-6">
                                    <span className={styles.recLabel}>
                                        Handled By
                                    </span>
                                    <span className={styles.recValue}>
                                        Staff
                                    </span>
                                    <span className={styles.recSub}>
                                        Counter Shift
                                    </span>
                                </div>
                                <div className="col-6">
                                    <span className={styles.recLabel}>
                                        Payment Mode
                                    </span>
                                    <span className={styles.recValue}>
                                        GCash
                                    </span>
                                    <span className={styles.recSub}>
                                        Ref #902812
                                    </span>
                                </div>
                            </div>

                            <div className="border-bottom border-secondary border-dashed pb-4 mb-4">
                                <span className={styles.recLabel}>
                                    PURCHASED ITEMS
                                </span>
                                <div className="d-flex justify-content-between align-items-start mt-3">
                                    <div>
                                        <h6
                                            className="text-white mb-1"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Monthly Regular Pass
                                        </h6>
                                        <p
                                            className="mb-0 text-secondary"
                                            style={{ fontSize: "0.75rem" }}
                                        >
                                            Unlimited floor access (30 days)
                                        </p>
                                    </div>
                                    <span
                                        className="text-white fw-bold"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        ₱990.00
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-start mt-3">
                                    <div>
                                        <h6
                                            className="text-white mb-1"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Personal Coach Mark
                                        </h6>
                                        <p
                                            className="mb-0 text-secondary"
                                            style={{ fontSize: "0.75rem" }}
                                        >
                                            Custom program & gym check-ins
                                        </p>
                                    </div>
                                    <span
                                        className="text-white fw-bold"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        ₱500.00
                                    </span>
                                </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className={styles.recLabel}>
                                        Total Paid
                                    </span>
                                    <span className={styles.recLabel}>
                                        Status
                                    </span>
                                </div>
                                <div className="text-end">
                                    <h2 className={styles.totalAmount}>
                                        ₱1,490.00
                                    </h2>
                                    <span className={styles.statusSuccess}>
                                        Paid in Full · Thank you!
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div
                            className="d-flex flex-column gap-3 p-4 border-top border-secondary"
                            style={{
                                backgroundColor:
                                    "var(--secondary-background-color)",
                            }}
                        >
                            <div
                                className="d-flex flex-column align-items-center text-center gap-2 text-secondary mb-2"
                                style={{ fontSize: "0.75rem" }}
                            >
                                <i className="fa-regular fa-envelope fs-6"></i>
                                <p className="mb-0 lh-base">
                                    Official digital copy sent to:
                                    <br />
                                    michael.tanza@example.com
                                </p>
                            </div>
                            <button className={styles.btnDownload}>
                                <i className="fa-solid fa-download"></i>{" "}
                                Download PDF
                            </button>
                            <button className={styles.btnEmail}>
                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                Send to My Email
                            </button>
                        </div>
                    </div>

                    <div
                        className="mt-4"
                        data-aos="fade-left"
                        data-aos-delay="600"
                    >
                        <p
                            className="text-center text-secondary mb-4"
                            style={{ fontSize: "0.8rem" }}
                        >
                            Keep fit, stay healthy · See you tomorrow Michael!
                        </p>
                        <div
                            className="d-flex align-items-start gap-3 p-3 rounded"
                            style={{
                                backgroundColor: "rgba(30, 41, 59, 0.4)",
                                border: "1px solid var(--card-stroke-color)",
                            }}
                        >
                            <i className="fa-solid fa-headset text-secondary fs-5 mt-1"></i>
                            <p
                                className="mb-0 text-secondary lh-base"
                                style={{ fontSize: "0.8rem" }}
                            >
                                <strong className="text-white">
                                    Questions regarding your receipt?
                                </strong>
                                <br />
                                Speak directly with Coach Mark or the staff at
                                the counter.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </MemberLayout>
    );
}
