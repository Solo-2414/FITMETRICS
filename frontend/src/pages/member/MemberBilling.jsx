import { useEffect, useState, useRef } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import styles from "./MemberBilling.module.css";
import { api } from "../../lib/api";
import { SkeletonMemberBilling } from "../../components/ui/Skeleton";
import InlineError from "../../components/ui/InlineError";

const DEFAULT_RECEIPTS = [
    {
        id: "REC-2026-1949",
        receipt_number: "REC-2026-1949",
        date: "Oct 29, 2026",
        time: "04:15 PM",
        title: "Monthly Regular + Coach Mark",
        subtitle: "Member renewal cycle #10",
        payment_method: "GCash",
        reference_number: "902812",
        handled_by: "Staff",
        shift: "Counter Shift",
        amount: 1490.0,
        status: "Paid",
        items: [
            {
                name: "Monthly Regular Pass",
                description: "Unlimited floor access (30 days)",
                price: 990.0,
            },
            {
                name: "Personal Coach Mark",
                description: "Custom program & gym check-ins",
                price: 500.0,
            },
        ],
    },
    {
        id: "REC-2026-1912",
        receipt_number: "REC-2026-1912",
        date: "Oct 15, 2026",
        time: "02:30 PM",
        title: "Water Cup Refill (₱10)",
        subtitle: "Counter mineral dispenser",
        payment_method: "Cash",
        handled_by: "Staff",
        shift: "Counter Shift",
        amount: 10.0,
        status: "Paid",
        items: [
            {
                name: "Water Cup Refill (₱10)",
                description: "Counter mineral dispenser",
                price: 10.0,
            },
        ],
    },
    {
        id: "REC-2026-8965",
        receipt_number: "REC-2026-8965",
        date: "Sep 29, 2026",
        time: "05:10 PM",
        title: "Monthly Regular Pass",
        subtitle: "Gym floor access pass",
        payment_method: "Maya",
        reference_number: "441920",
        handled_by: "Staff",
        shift: "Counter Shift",
        amount: 990.0,
        status: "Paid",
        items: [
            {
                name: "Monthly Regular Pass",
                description: "Gym floor access pass",
                price: 990.0,
            },
        ],
    },
    {
        id: "REC-2026-8891",
        receipt_number: "REC-2026-8891",
        date: "Aug 29, 2026",
        time: "03:45 PM",
        title: "Monthly Regular + Coach Mark",
        subtitle: "Member renewal cycle #8",
        payment_method: "GCash",
        reference_number: "881204",
        handled_by: "Staff",
        shift: "Counter Shift",
        amount: 1490.0,
        status: "Paid",
        items: [
            {
                name: "Monthly Regular Pass",
                description: "Unlimited floor access (30 days)",
                price: 990.0,
            },
            {
                name: "Personal Coach Mark",
                description: "Custom program & gym check-ins",
                price: 500.0,
            },
        ],
    },
];

// Capitalizes "paid" -> "Paid", "pending" -> "Pending"
const formatStatus = (status) => {
    if (!status) return "Paid";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const formatPaymentMethod = (method) => {
    if (!method) return "Counter Payment";
    const lower = method.toLowerCase().trim();
    if (lower === "gcash") return "GCash";
    return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// Safely maps DB columns so UI and PDF never display "undefined"
const normalizeReceipt = (item) => {
    if (!item) return null;

    let formattedDate = item.date || "";
    let formattedTime = item.time || "";
    const rawTimestamp =
        item.paid_at || item.created_at || item.transaction_date;

    if (rawTimestamp && (!formattedDate || !formattedTime)) {
        const parsed = new Date(rawTimestamp);
        if (!isNaN(parsed.getTime())) {
            if (!formattedDate) {
                formattedDate = parsed.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });
            }
            if (!formattedTime) {
                formattedTime = parsed.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                });
            }
        }
    }

    let parsedItems = item.items || item.purchased_items || [];
    if (typeof parsedItems === "string") {
        try {
            parsedItems = JSON.parse(parsedItems);
        } catch {
            parsedItems = [];
        }
    }

    const lineItems =
        Array.isArray(parsedItems) && parsedItems.length > 0
            ? parsedItems.map((i) => ({
                  name: i.name || i.item_name || i.title || "Gym Item",
                  description: i.description || i.subtitle || "",
                  price: Number(i.price ?? i.amount ?? 0),
              }))
            : [
                  {
                      name:
                          item.item_name ||
                          item.title ||
                          item.description ||
                          "Gym Payment",
                      description: item.subtitle || item.notes || "",
                      price: Number(item.amount ?? 0),
                  },
              ];

    return {
        ...item,
        receipt_number:
            item.receipt_number || item.reference_no || item.id || "N/A",
        date: formattedDate || "N/A",
        time: formattedTime,
        rawDate: rawTimestamp || item.date || null,
        handled_by:
            item.handled_by ||
            item.staff_name ||
            item.cashier_name ||
            item.processed_by ||
            "Counter Staff",
        shift:
            item.shift ||
            item.counter_shift ||
            item.shift_schedule ||
            "Regular Counter Shift",
        payment_method: formatPaymentMethod(
            item.payment_method || item.payment_mode || item.method,
        ),
        reference_number: item.reference_number || item.ref_no || "",
        amount: Number(item.amount ?? 0),
        status: formatStatus(item.status),
        items: lineItems,
    };
};

export default function MemberBilling() {
    const [profile, setProfile] = useState(null);
    const [data, setData] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [billing, setBilling] = useState([]);
    const [membership, setMembership] = useState(null);
    const [selectedReceipt, setSelectedReceipt] = useState(
        normalizeReceipt(DEFAULT_RECEIPTS[0]),
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState("all"); // "all" | "last_week" | "last_month"
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [actionAlert, setActionAlert] = useState({ type: "", message: "" });
    const [error, setError] = useState("");

    const filterDropdownRef = useRef(null);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                filterDropdownRef.current &&
                !filterDropdownRef.current.contains(event.target)
            ) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const expiration = membership?.end_date
        ? new Date(membership.end_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
          })
        : "...";

    const buildReceiptHtml = (rawReceipt) => {
        const receipt = normalizeReceipt(rawReceipt);
        const memberName =
            receipt.member_name || profile?.full_name || "Member Name";
        const receiptNo = receipt.receipt_number || receipt.id || "N/A";

        const itemsHtml = receipt.items
            .map(
                (item) => `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px; border-collapse: collapse;">
                    <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                            <div style="font-size: 13px; font-weight: 600; color: #f8fafc; margin-bottom: 3px;">
                                ${item.name}
                            </div>
                            ${
                                item.description
                                    ? `<div style="font-size: 11px; color: #94a3b8;">${item.description}</div>`
                                    : ""
                            }
                        </td>
                        <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                            <span style="font-size: 13px; font-weight: 700; color: #f8fafc;">
                                ₱${Number(item.price || 0).toLocaleString(
                                    "en-PH",
                                    {
                                        minimumFractionDigits: 2,
                                    },
                                )}
                            </span>
                        </td>
                    </tr>
                </table>
            `,
            )
            .join("");

        return `
            <div style="background-color: #060b14; padding: 28px 16px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <div style="max-width: 460px; margin: 0 auto; background-color: #0b1320; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;">
                    
                    <!-- Header -->
                    <div style="padding: 24px; border-bottom: 1px dashed #1e293b;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                            <tr>
                                <td style="vertical-align: top;">
                                    <div style="font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 3px;">
                                        Analyn's Fitness Gym
                                    </div>
                                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">
                                        Neighborhood Gym & Training Club
                                    </div>
                                </td>
                                <td style="vertical-align: top; text-align: right;">
                                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.8px;">
                                        OFFICIAL RECEIPT
                                    </span>
                                </td>
                            </tr>
                        </table>
                        <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
                            4th floor Less Consumo Building beside 7/11, San Jose, Batangas, Philippines, 4227
                        </div>
                    </div>

                    <!-- Receipt Details Grid -->
                    <div style="padding: 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border-collapse: collapse;">
                            <tr>
                                <td width="50%" style="vertical-align: top; padding-bottom: 16px; padding-right: 8px;">
                                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Member Name</div>
                                    <div style="font-size: 13px; font-weight: 600; color: #f8fafc;">${memberName}</div>
                                </td>
                                <td width="50%" style="vertical-align: top; padding-bottom: 16px; padding-left: 8px;">
                                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Date & Time</div>
                                    <div style="font-size: 13px; font-weight: 600; color: #f8fafc;">
                                        ${receipt.date}${receipt.time ? `<br/>${receipt.time}` : ""}
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td width="50%" style="vertical-align: top; padding-right: 8px;">
                                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Handled By</div>
                                    <div style="font-size: 13px; font-weight: 600; color: #f8fafc;">${receipt.handled_by}</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${receipt.shift}</div>
                                </td>
                                <td width="50%" style="vertical-align: top; padding-left: 8px;">
                                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Payment Mode</div>
                                    <div style="font-size: 13px; font-weight: 600; color: #f8fafc;">${receipt.payment_method}</div>
                                    ${
                                        receipt.reference_number
                                            ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Ref #${receipt.reference_number}</div>`
                                            : ""
                                    }
                                </td>
                            </tr>
                        </table>

                        <!-- Purchased Items -->
                        <div style="border-top: 1px dashed #1e293b; border-bottom: 1px dashed #1e293b; padding: 18px 0; margin-bottom: 20px;">
                            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 0.8px; margin-bottom: 14px;">
                                PURCHASED ITEMS
                            </div>
                            ${itemsHtml}
                        </div>

                        <!-- Total Paid -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                            <tr>
                                <td style="vertical-align: middle;">
                                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Total Paid</div>
                                    <div style="font-size: 11px; color: #94a3b8;">Status</div>
                                </td>
                                <td style="vertical-align: middle; text-align: right;">
                                    <div style="font-size: 24px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">
                                        ₱${Number(
                                            receipt.amount || 0,
                                        ).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </div>
                                    <div style="font-size: 11px; font-weight: 600; color: #10b981;">
                                        ${receipt.status} · Thank you!
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #0f172a; padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #94a3b8;">
                        Receipt No: <strong style="color: #f8fafc;">${receiptNo}</strong><br/>
                        FITMETRICS Automated Billing System
                    </div>
                </div>
            </div>
        `;
    };

    const exportReceiptPdf = async (rawReceipt) => {
        if (!rawReceipt) return;
        const receipt = normalizeReceipt(rawReceipt);
        setIsDownloading(true);
        setActionAlert({ type: "", message: "" });

        const receiptNo = receipt.receipt_number || receipt.id || "Receipt";
        const receiptHtml = buildReceiptHtml(receipt);

        try {
            const html2pdfModule = await import("html2pdf.js").catch(
                () => null,
            );
            const html2pdf = html2pdfModule?.default || html2pdfModule;

            if (html2pdf) {
                const wrapper = document.createElement("div");
                wrapper.innerHTML = receiptHtml;
                wrapper.style.width = "500px";
                wrapper.style.backgroundColor = "#060b14";

                await html2pdf()
                    .set({
                        margin: 0,
                        filename: `Official-Receipt-${receiptNo}.pdf`,
                        image: { type: "jpeg", quality: 0.98 },
                        html2canvas: {
                            scale: 2,
                            useCORS: true,
                            backgroundColor: "#060b14",
                        },
                        jsPDF: {
                            unit: "px",
                            format: [500, 680],
                            orientation: "portrait",
                        },
                    })
                    .from(wrapper)
                    .save();
            } else {
                const printWindow = window.open("", "_blank");
                if (!printWindow) {
                    setActionAlert({
                        type: "warning",
                        message:
                            "Please allow popups to download the receipt PDF.",
                    });
                    return;
                }

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Official Receipt - ${receiptNo}</title>
                        <style>
                            @page { size: auto; margin: 0; }
                            html, body {
                                margin: 0;
                                padding: 0;
                                background-color: #060b14 !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                        </style>
                    </head>
                    <body>
                        ${receiptHtml}
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                }, 250);
                            };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
        } catch {
            setActionAlert({
                type: "danger",
                message: "Unable to generate receipt PDF. Please try again.",
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const sendReceiptEmail = async (rawReceipt) => {
        if (!rawReceipt) return;
        const receipt = normalizeReceipt(rawReceipt);

        if (!profile?.email) {
            setActionAlert({
                type: "danger",
                message: "No email address is linked to your profile.",
            });
            return;
        }

        setIsSendingEmail(true);
        setActionAlert({ type: "", message: "" });

        const receiptNo = receipt.receipt_number || receipt.id;

        try {
            await api(`/member/billing/${receipt.id}/send-receipt`, {
                method: "POST",
            });

            setActionAlert({
                type: "success",
                message: `Official receipt (${receiptNo}) has been queued for ${profile.email}.`,
            });
        } catch (err) {
            setActionAlert({
                type: "danger",
                message:
                    err.message ||
                    "Failed to send receipt email. Please try again.",
            });
        } finally {
            setIsSendingEmail(false);
        }
    };

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
        Promise.all([api("/member/billing"), api("/member/membership")])
            .then(([payments, memberships]) => {
                const normalizedPayments = Array.isArray(payments)
                    ? payments.map(normalizeReceipt)
                    : [];
                setBilling(normalizedPayments);
                setMembership(memberships.current);
                if (normalizedPayments.length > 0) {
                    setSelectedReceipt(normalizedPayments[0]);
                }
            })
            .catch((err) => setError(err.message));
    }, []);

    const receiptsList =
        Array.isArray(billing) && billing.length > 0
            ? billing
            : DEFAULT_RECEIPTS.map(normalizeReceipt);

    // Filter by Search Query AND Date Range ("All Payments", "Last Week", "Last Month")
    const filteredReceipts = receiptsList.filter((item) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            (item.receipt_number || item.id || "").toLowerCase().includes(q) ||
            (item.title || item.item_name || "").toLowerCase().includes(q) ||
            (item.payment_method || "").toLowerCase().includes(q);

        if (!matchesSearch) return false;
        if (dateFilter === "all") return true;

        const itemDate = new Date(item.rawDate || item.date);
        if (isNaN(itemDate.getTime())) return true;

        const now = new Date();
        const cutoff = new Date();

        if (dateFilter === "last_week") {
            cutoff.setDate(now.getDate() - 7);
            return itemDate >= cutoff && itemDate <= now;
        }

        if (dateFilter === "last_month") {
            const firstDayOfLastMonth = new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                1,
                0,
                0,
                0,
                0,
            );
            const lastDayOfLastMonth = new Date(
                now.getFullYear(),
                now.getMonth(),
                0,
                23,
                59,
                59,
                999,
            );
            return (
                itemDate >= firstDayOfLastMonth &&
                itemDate <= lastDayOfLastMonth
            );
        }
        return true;
    });

    const activeReceipt = normalizeReceipt(selectedReceipt);
    const activeLineItems = activeReceipt?.items || [];

    const plan = membership?.membership_plans;

    // Account Balance Calculation (Pending vs Settled)
    const pendingPayments = billing.filter(
        (item) => item.status?.toLowerCase() === "pending",
    );
    const totalPendingBalance = pendingPayments.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
    );
    const hasPendingBalance =
        pendingPayments.length > 0 || Number(membership?.balance || 0) > 0;
    const displayBalance =
        totalPendingBalance > 0
            ? totalPendingBalance
            : Number(membership?.balance || 0);

    const nextDate = membership?.end_date
        ? new Date(membership.end_date).toLocaleDateString()
        : "...";

    const getDaysRemainingText = (expirationDate) => {
        if (!expirationDate) return "";
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expDate = new Date(expirationDate);
        expDate.setHours(0, 0, 0, 0);

        const diffInMs = expDate - today;
        const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays < 0) return "Expired";
        if (diffInDays === 0) return "Expires Today";
        if (diffInDays === 1) return "1 Day Remaining";
        return `${diffInDays} Days Remaining`;
    };

    const filterLabelMap = {
        all: "All Payments",
        last_week: "Last Week",
        last_month: "Last Month",
    };

    return (
        <MemberLayout>
            {error && <InlineError error={error} />}
            {!profile || !dashboard || !membership || !data ? (
                <SkeletonTable rows={6} cols={5} />
            ) : (
                <>
                    {/* toast-allow: persistent payment verification status */}
                    {new URLSearchParams(window.location.search).get(
                        "payment",
                    ) === "success" && (
                        <div className="alert alert-info">
                            Payment received for verification. Your membership
                            will activate after PayMongo confirms the payment.
                        </div>
                    )}
                    {/* toast-allow: persistent pending payment status */}
                    {pendingPayments.length > 0 && (
                        <div className="alert alert-warning">
                            {pendingPayments.length} online payment
                            {pendingPayments.length === 1 ? "" : "s"} pending
                            confirmation.
                        </div>
                    )}
                    <div
                        className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"
                        data-aos="fade-down"
                        data-aos-delay="100"
                    >
                        <div>
                            <h1 className={styles.pageTitle}>
                                Billing & Receipts
                            </h1>
                            <p className={styles.pageDesc}>
                                Review your payments, upcoming monthly renewals,
                                and instant copies of gym receipts.
                            </p>
                        </div>
                        <div className={styles.emailBadge}>
                            <i className="fa-regular fa-envelope"></i> Official
                            digital receipts are auto-sent to
                            michael.tanza@example.com
                        </div>
                    </div>

                    {/* KPI Cards */}
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
                                    {hasPendingBalance ? (
                                        <i className="fa-solid fa-clock text-warning fs-5"></i>
                                    ) : (
                                        <i className="fa-regular fa-circle-check text-success fs-5"></i>
                                    )}
                                </div>
                                <h3 className={styles.kpiValue}>
                                    ₱
                                    {displayBalance.toLocaleString("en-PH", {
                                        minimumFractionDigits: 2,
                                    })}
                                </h3>
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                    {hasPendingBalance ? (
                                        <>
                                            <span
                                                className={styles.statusPending}
                                            >
                                                <span
                                                    className={
                                                        styles.dotPending
                                                    }
                                                ></span>{" "}
                                                Pending Balance
                                            </span>
                                            <span className={styles.kpiSub}>
                                                {pendingPayments.length}{" "}
                                                {pendingPayments.length === 1
                                                    ? "pending payment"
                                                    : "pending payments"}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span
                                                className={styles.statusSettled}
                                            >
                                                <span
                                                    className={
                                                        styles.dotSettled
                                                    }
                                                ></span>{" "}
                                                Fully Settled
                                            </span>
                                            <span className={styles.kpiSub}>
                                                No pending fees
                                            </span>
                                        </>
                                    )}
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
                                <h3 className={styles.kpiValue}>{nextDate}</h3>
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                    <span className={styles.kpiSub}>
                                        <i className="fa-regular fa-clock"></i>{" "}
                                        {getDaysRemainingText(expiration)}
                                    </span>
                                    <span className={styles.kpiSub}>
                                        {plan?.name || "Membership"}
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
                                <h3 className={styles.kpiValueBlue}>
                                    ₱
                                    {plan
                                        ? Number(plan.price).toLocaleString(
                                              "en-PH",
                                              { minimumFractionDigits: 2 },
                                          )
                                        : "..."}
                                </h3>
                                <p className={styles.kpiDescBlue}>
                                    {getDaysRemainingText(expiration)} - Next
                                    monthly renewal for{" "}
                                    {plan?.name || "your plan"}.
                                </p>
                                <div className={styles.settleNotice}>
                                    <i className="fa-solid fa-circle-info"></i>{" "}
                                    Settled directly with staff at the counter
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Row */}
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
                                            All verified counter payments and
                                            automated digital slips
                                        </p>
                                    </div>
                                    <div className="d-flex flex-column flex-sm-row gap-3">
                                        <div className={styles.searchBox}>
                                            <i className="fa-solid fa-magnifying-glass"></i>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) =>
                                                    setSearchQuery(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Search receipt or item..."
                                            />
                                        </div>

                                        {/* Filter Dropdown: All Payments / Last Week / Last Month */}
                                        <div
                                            className={
                                                styles.filterDropdownWrapper
                                            }
                                            ref={filterDropdownRef}
                                        >
                                            <button
                                                type="button"
                                                className={styles.btnFilter}
                                                onClick={() =>
                                                    setIsFilterOpen(
                                                        (prev) => !prev,
                                                    )
                                                }
                                            >
                                                {filterLabelMap[dateFilter]}{" "}
                                                <i
                                                    className={`fa-solid fa-chevron-${
                                                        isFilterOpen
                                                            ? "up"
                                                            : "down"
                                                    }`}
                                                ></i>
                                            </button>

                                            {isFilterOpen && (
                                                <div
                                                    className={
                                                        styles.filterDropdownMenu
                                                    }
                                                >
                                                    <button
                                                        type="button"
                                                        className={`${styles.filterOption} ${
                                                            dateFilter === "all"
                                                                ? styles.filterOptionActive
                                                                : ""
                                                        }`}
                                                        onClick={() => {
                                                            setDateFilter(
                                                                "all",
                                                            );
                                                            setIsFilterOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        All Payments
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.filterOption} ${
                                                            dateFilter ===
                                                            "last_week"
                                                                ? styles.filterOptionActive
                                                                : ""
                                                        }`}
                                                        onClick={() => {
                                                            setDateFilter(
                                                                "last_week",
                                                            );
                                                            setIsFilterOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        Last Week
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.filterOption} ${
                                                            dateFilter ===
                                                            "last_month"
                                                                ? styles.filterOptionActive
                                                                : ""
                                                        }`}
                                                        onClick={() => {
                                                            setDateFilter(
                                                                "last_month",
                                                            );
                                                            setIsFilterOpen(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        Last Month
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Payment History Container */}
                                <div
                                    className={`table-responsive ${styles.scrollableTableWrapper}`}
                                >
                                    <table
                                        className={`table ${styles.customTable}`}
                                    >
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
                                            {filteredReceipts.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan="7"
                                                        className="text-center text-secondary py-4"
                                                    >
                                                        No payments found for{" "}
                                                        {
                                                            filterLabelMap[
                                                                dateFilter
                                                            ]
                                                        }
                                                        .
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredReceipts.map((item) => {
                                                    const recNo =
                                                        item.receipt_number ||
                                                        item.id;
                                                    const isSelected =
                                                        (activeReceipt?.receipt_number ||
                                                            activeReceipt?.id) ===
                                                        recNo;
                                                    const formattedStatus =
                                                        formatStatus(
                                                            item.status,
                                                        );

                                                    return (
                                                        <tr
                                                            key={recNo}
                                                            style={
                                                                isSelected
                                                                    ? {
                                                                          backgroundColor:
                                                                              "rgba(56, 189, 248, 0.06)",
                                                                      }
                                                                    : undefined
                                                            }
                                                        >
                                                            <td
                                                                className={
                                                                    styles.colMuted
                                                                }
                                                            >
                                                                {recNo}
                                                            </td>
                                                            <td
                                                                className={
                                                                    styles.colMuted
                                                                }
                                                            >
                                                                {item.date}
                                                            </td>
                                                            <td>
                                                                <strong className="d-block mb-1 text-white">
                                                                    {item.title ||
                                                                        item.item_name}
                                                                </strong>
                                                                <span
                                                                    className={
                                                                        styles.itemDesc
                                                                    }
                                                                >
                                                                    {
                                                                        item.subtitle
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span
                                                                    className="d-inline-flex align-items-center gap-2"
                                                                    style={{
                                                                        fontSize:
                                                                            "0.8rem",
                                                                    }}
                                                                >
                                                                    <span
                                                                        className={
                                                                            item.payment_method ===
                                                                            "Cash"
                                                                                ? styles.dotGreen
                                                                                : item.payment_method ===
                                                                                    "Maya"
                                                                                  ? styles.dotOrange
                                                                                  : styles.dotBlue
                                                                        }
                                                                    ></span>
                                                                    {
                                                                        item.payment_method
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <strong className="d-block text-white">
                                                                    ₱
                                                                    {Number(
                                                                        item.amount ||
                                                                            0,
                                                                    ).toLocaleString(
                                                                        "en-PH",
                                                                        {
                                                                            minimumFractionDigits: 2,
                                                                        },
                                                                    )}
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                <span
                                                                    className={
                                                                        formattedStatus ===
                                                                        "Pending"
                                                                            ? styles.statusPendingBadge
                                                                            : styles.statusPaid
                                                                    }
                                                                >
                                                                    {
                                                                        formattedStatus
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedReceipt(
                                                                            item,
                                                                        )
                                                                    }
                                                                    className={
                                                                        styles.btnLink
                                                                    }
                                                                    style={
                                                                        isSelected
                                                                            ? {
                                                                                  color: "var(--primary-color)",
                                                                                  fontWeight: 600,
                                                                              }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    View{" "}
                                                                    <i className="fa-solid fa-receipt"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center border-bottom border-secondary pb-4 mt-4 mb-4 gap-3">
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        Showing {filteredReceipts.length} of{" "}
                                        {receiptsList.length}{" "}
                                        {receiptsList.length === 1
                                            ? "record"
                                            : "records"}{" "}
                                        · {filterLabelMap[dateFilter]} (
                                        {new Date().getFullYear()})
                                    </span>
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
                                                You can pay or top up anytime
                                                right at the gym counter using
                                                Cash, or GCash / Maya instant
                                                mobile transfer.
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
                                        All receipts are sent automatically to
                                        your registered email address right
                                        after payment.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Dynamic Official Receipt Preview */}
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
                                            <p
                                                className={
                                                    styles.receiptSubBrand
                                                }
                                            >
                                                Neighborhood Gym & Training Club
                                            </p>
                                        </div>
                                        <span className={styles.officialBadge}>
                                            OFFICIAL RECEIPT
                                        </span>
                                    </div>
                                    <p className={styles.receiptAddress}>
                                        4th floor Less Consumo Building beside
                                        7/11, San Jose, Batangas, Philippines,
                                        4227
                                    </p>
                                </div>

                                <div className="p-4">
                                    <div className="row g-4 mb-4">
                                        <div className="col-6">
                                            <span className={styles.recLabel}>
                                                Member Name
                                            </span>
                                            <span className={styles.recValue}>
                                                {profile?.full_name ||
                                                    "Member Name"}
                                            </span>
                                        </div>
                                        <div className="col-6">
                                            <span className={styles.recLabel}>
                                                Date & Time
                                            </span>
                                            <span className={styles.recValue}>
                                                {activeReceipt?.date}
                                                {activeReceipt?.time && (
                                                    <>
                                                        <br />
                                                        <span
                                                            className={
                                                                styles.recSub
                                                            }
                                                        >
                                                            {activeReceipt.time}
                                                        </span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <div className="col-6">
                                            <span className={styles.recLabel}>
                                                Handled By
                                            </span>
                                            <span className={styles.recValue}>
                                                {activeReceipt?.handled_by}
                                            </span>
                                            <span className={styles.recSub}>
                                                {activeReceipt?.shift}
                                            </span>
                                        </div>
                                        <div className="col-6">
                                            <span className={styles.recLabel}>
                                                Payment Mode
                                            </span>
                                            <span className={styles.recValue}>
                                                {activeReceipt?.payment_method}
                                            </span>
                                            {activeReceipt?.reference_number && (
                                                <span className={styles.recSub}>
                                                    Ref #
                                                    {
                                                        activeReceipt.reference_number
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-bottom border-secondary border-dashed pb-4 mb-4">
                                        <span className={styles.recLabel}>
                                            PURCHASED ITEMS
                                        </span>
                                        {activeLineItems.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="d-flex justify-content-between align-items-start mt-3"
                                            >
                                                <div>
                                                    <h6
                                                        className="text-white mb-1"
                                                        style={{
                                                            fontSize: "0.85rem",
                                                        }}
                                                    >
                                                        {item.name}
                                                    </h6>
                                                    {item.description && (
                                                        <p
                                                            className="mb-0 text-secondary"
                                                            style={{
                                                                fontSize:
                                                                    "0.75rem",
                                                            }}
                                                        >
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span
                                                    className="text-white fw-bold"
                                                    style={{
                                                        fontSize: "0.85rem",
                                                    }}
                                                >
                                                    ₱
                                                    {Number(
                                                        item.price || 0,
                                                    ).toLocaleString("en-PH", {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </span>
                                            </div>
                                        ))}
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
                                                ₱
                                                {Number(
                                                    activeReceipt?.amount || 0,
                                                ).toLocaleString("en-PH", {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </h2>
                                            <span
                                                className={styles.statusSuccess}
                                            >
                                                {activeReceipt?.status} · Thank
                                                you!
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
                                            {profile?.email
                                                ? profile.email
                                                : "No email available"}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.btnDownload}
                                        disabled={isDownloading}
                                        onClick={() =>
                                            exportReceiptPdf(activeReceipt)
                                        }
                                    >
                                        <i className="fa-solid fa-download me-2"></i>
                                        {isDownloading
                                            ? "Downloading PDF..."
                                            : "Download PDF"}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.btnEmail}
                                        disabled={isSendingEmail}
                                        onClick={() =>
                                            sendReceiptEmail(activeReceipt)
                                        }
                                    >
                                        <i className="fa-regular fa-paper-plane me-2"></i>
                                        {isSendingEmail
                                            ? "Sending to Email..."
                                            : "Send to My Email"}
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
                                    Keep fit, stay healthy · See you again,{" "}
                                    {profile?.full_name?.split(" ")[0] ||
                                        "User"}
                                    !
                                </p>
                                <div
                                    className="d-flex align-items-start gap-3 p-3 rounded"
                                    style={{
                                        backgroundColor:
                                            "rgba(30, 41, 59, 0.4)",
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
                                        Speak directly with Coach Mark or the
                                        staff at the counter.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </MemberLayout>
    );
}
