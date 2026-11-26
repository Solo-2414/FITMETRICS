import ClerkLayout from "../../components/clerk/ClerkLayout";
import styles from "./ClerkAttendance.module.css";

export default function ClerkAttendance() {
    return (
        <ClerkLayout>
            <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                data-aos="fade-down"
            >
                <div>
                    <h1 className={styles.pageTitle}>Attendance</h1>
                    <p className={styles.pageDesc}>
                        Record member check-ins, scans, and monitor active gym
                        members
                    </p>
                </div>
            </div>

            <div
                className="row g-4 mb-4"
                data-aos="fade-up"
                data-aos-delay="100"
            >
                <div className="col-12 col-xl-7">
                    <div className={styles.actionCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className={styles.iconBoxPrimaryOutline}>
                                    <i className="fa-solid fa-user-check"></i>
                                </div>
                                <div>
                                    <h3 className={styles.cardTitle}>
                                        Clerk Fast Check-in
                                    </h3>
                                    <p className={styles.cardDesc}>
                                        Manual counter check-in for members
                                        without their phone pass
                                    </p>
                                </div>
                            </div>
                            <span className={styles.badgeOutline}>
                                Method 1
                            </span>
                        </div>

                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="mb-4">
                                <label className={styles.formLabel}>
                                    Search Member
                                </label>
                                <div className={styles.inputGroup}>
                                    <input
                                        type="text"
                                        className={styles.formInputGroup}
                                        placeholder="Type member name or ID..."
                                    />
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className={styles.queueLabel}>
                                    RECENT FRONT DESK QUEUE
                                </span>
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    <button
                                        type="button"
                                        className={styles.queuePill}
                                    >
                                        <span
                                            className={styles.dotGreen}
                                        ></span>{" "}
                                        Kenneth Bautista (0917-882-9912)
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.queuePill}
                                    >
                                        <span
                                            className={styles.dotGreen}
                                        ></span>{" "}
                                        Maricel Santos (0922-311-8401)
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.queuePill}
                                    >
                                        <span
                                            className={styles.dotWarning}
                                        ></span>{" "}
                                        Andrea Lim (0908-119-4452)
                                    </button>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end pt-3 border-top border-secondary">
                                <button
                                    type="submit"
                                    className={styles.btnPrimaryFull}
                                >
                                    <i className="fa-regular fa-circle-check"></i>{" "}
                                    Record Check-in
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="col-12 col-xl-5">
                    <div className={styles.actionCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className={styles.iconBoxSuccessOutline}>
                                    <i className="fa-solid fa-qrcode"></i>
                                </div>
                                <div>
                                    <h3 className={styles.cardTitle}>
                                        Member QR Code Station
                                    </h3>
                                    <p className={styles.cardDesc}>
                                        Contactless self-scan or pass reading
                                    </p>
                                </div>
                            </div>
                            <span className={styles.badgeSuccessOutline}>
                                Method 2
                            </span>
                        </div>

                        <div className={styles.qrBox}>
                            <div className={styles.qrIconWrapper}>
                                <i className="fa-solid fa-qrcode"></i>
                            </div>
                            <div>
                                <h4
                                    className="text-white mb-2"
                                    style={{
                                        fontFamily: "var(--heading-font)",
                                        fontSize: "1rem",
                                        fontWeight: "600",
                                    }}
                                >
                                    Gym Entrance QR Code
                                </h4>
                                <p
                                    className="text-secondary m-0"
                                    style={{
                                        fontSize: "0.85rem",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Members scan this QR code using their phone
                                    camera to check in automatically through
                                    their portal, or clerk can scan member's QR
                                    pass.
                                </p>
                            </div>
                        </div>

                        <div className="d-flex flex-column flex-sm-row gap-3 mt-4">
                            <button className={styles.btnOutlineAction}>
                                <i className="fa-solid fa-print"></i> Print QR
                                Code Poster
                            </button>
                            <button className={styles.btnOutlineActionPrimary}>
                                <i className="fa-solid fa-camera"></i> Scan
                                Member Phone Pass
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="row g-3 mb-4"
                data-aos="fade-up"
                data-aos-delay="200"
            >
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Currently in Gym</span>
                            <div className={styles.iconBoxPrimary}>
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            24{" "}
                            <span className={styles.kpiValueUnit}>Members</span>
                        </h3>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBarBg}>
                                <div
                                    className={styles.progressBarFillPrimary}
                                    style={{ width: "48%" }}
                                ></div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className={styles.kpiSub}>
                                    Max capacity: 50
                                </span>
                                <span className={styles.kpiPositive}>
                                    48% Floor Density
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span>Today's Total Check-ins</span>
                            <div className={styles.iconBoxSecondary}>
                                <i className="fa-solid fa-clipboard-check"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            86{" "}
                            <span className={styles.kpiValueUnit}>Visits</span>
                        </h3>
                        <div className="d-flex align-items-center gap-2 mt-auto">
                            <span className={styles.kpiPositive}>
                                <i className="fa-solid fa-arrow-trend-up"></i>{" "}
                                +14%
                            </span>
                            <span
                                className={styles.kpiSub}
                                style={{ maxWidth: "100px", lineHeight: "1.2" }}
                            >
                                vs yesterday same hour
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span
                                style={{ maxWidth: "150px", lineHeight: "1.3" }}
                            >
                                Morning Shift (6am-12pm)
                            </span>
                            <div className={styles.iconBoxWarning}>
                                <i className="fa-regular fa-sun"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            34{" "}
                            <span className={styles.kpiValueUnit}>Visits</span>
                        </h3>
                        <div className="d-flex justify-content-between align-items-center mt-auto">
                            <span className={styles.kpiSub}>
                                Shift concluded
                            </span>
                            <span className={styles.kpiSub}>
                                39.5% of total
                            </span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span
                                style={{ maxWidth: "160px", lineHeight: "1.3" }}
                            >
                                Afternoon/Evening (12pm-9:30pm)
                            </span>
                            <div className={styles.iconBoxPrimaryOutline}>
                                <i className="fa-solid fa-moon"></i>
                            </div>
                        </div>
                        <h3 className={styles.kpiValue}>
                            52{" "}
                            <span className={styles.kpiValueUnit}>Visits</span>
                        </h3>
                        <div className="d-flex align-items-center mt-auto">
                            <span className={styles.kpiPrimaryLive}>
                                <span className={styles.dotPrimary}></span>{" "}
                                Current Active Shift
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={styles.tablePanel}
                data-aos="fade-up"
                data-aos-delay="300"
            >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 border-bottom border-secondary pb-4">
                    <div className="d-flex flex-wrap gap-2">
                        <button className={styles.filterBtnActive}>
                            <span className={styles.dotGreen}></span> Currently
                            In Gym (24)
                        </button>
                        <button className={styles.filterBtn}>
                            All Today's Check-ins (86)
                        </button>
                    </div>
                    <div className={styles.searchBox}>
                        <i className="fa-solid fa-filter"></i>
                        <input
                            type="text"
                            placeholder="Filter attendance records..."
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className={`table ${styles.customTable}`}>
                        <thead>
                            <tr>
                                <th>MEMBER NAME</th>
                                <th>MEMBERSHIP PLAN</th>
                                <th>TIME IN</th>
                                <th>TIME OUT</th>
                                <th>CHECK-IN METHOD</th>
                                <th className="text-end">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatar}>KB</div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Kenneth Bautista
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-1082
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Monthly Regular
                                    </strong>
                                    <span
                                        className="text-primary"
                                        style={{ fontSize: "0.75rem" }}
                                    >
                                        + Coach Mark
                                    </span>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        10:15 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-secondary">--</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgePrimary}>
                                        <i className="fa-solid fa-qrcode"></i>{" "}
                                        Member QR Code
                                    </span>
                                </td>
                                <td className="text-end">
                                    <button className={styles.btnActionOutline}>
                                        Check Out
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarSecondary}>
                                            MS
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Maricel Santos
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-2041
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Weekly Pass
                                    </strong>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        10:45 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-secondary">--</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgeOutline}>
                                        <i className="fa-solid fa-desktop"></i>{" "}
                                        Clerk Check-in
                                    </span>
                                </td>
                                <td className="text-end">
                                    <button className={styles.btnActionOutline}>
                                        Check Out
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarSecondary}>
                                            DV
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Dominic Valderama
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-1903
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Two Weeks Pass
                                    </strong>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        09:30 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-white">11:15 AM</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgePrimary}>
                                        <i className="fa-solid fa-qrcode"></i>{" "}
                                        Member QR Code
                                    </span>
                                </td>
                                <td className="text-end">
                                    <span className={styles.statusCheckedOut}>
                                        <i className="fa-solid fa-check"></i>{" "}
                                        Checked Out
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatarSecondary}>
                                            JC
                                        </div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Joshua Cordero
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-1130
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Monthly Regular
                                    </strong>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        08:15 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-white">10:00 AM</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgeOutline}>
                                        <i className="fa-solid fa-desktop"></i>{" "}
                                        Clerk Check-in
                                    </span>
                                </td>
                                <td className="text-end">
                                    <span className={styles.statusCheckedOut}>
                                        <i className="fa-solid fa-check"></i>{" "}
                                        Checked Out
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={styles.avatar}>AL</div>
                                        <div>
                                            <strong className="d-block text-white mb-1">
                                                Andrea Lim
                                            </strong>
                                            <span className={styles.subText}>
                                                ID: #FM-2508
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <strong className="d-block text-white mb-1">
                                        Student Monthly
                                    </strong>
                                </td>
                                <td>
                                    <span className="text-white fw-bold">
                                        11:00 AM
                                    </span>
                                </td>
                                <td>
                                    <span className="text-secondary">--</span>
                                </td>
                                <td>
                                    <span className={styles.methodBadgePrimary}>
                                        <i className="fa-solid fa-qrcode"></i>{" "}
                                        Member QR Code
                                    </span>
                                </td>
                                <td className="text-end">
                                    <button className={styles.btnActionOutline}>
                                        Check Out
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 border-top border-secondary pt-4">
                    <span
                        className="text-secondary"
                        style={{ fontSize: "0.85rem" }}
                    >
                        Showing 5 of 24 active sessions in gym
                    </span>
                    <div className="d-flex gap-2 mt-3 mt-sm-0">
                        <button className={styles.pageBtnText} disabled>
                            Previous
                        </button>
                        <button className={styles.pageBtnTextActive}>
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </ClerkLayout>
    );
}
