export const normalizeQrPayment = (response) => {
    const payment = response || {};
    const expiresAt = typeof payment.expires_at === "string" ? payment.expires_at : "";
    const amountTotal = Number(payment.amount_total);
    if (!payment.payment_id || !payment.qr_image_url || !expiresAt || !Number.isFinite(Date.parse(expiresAt)) || !Number.isFinite(amountTotal) || amountTotal <= 0) {
        throw new Error("Invalid QR payment response.");
    }
    return {
        payment_id: payment.payment_id,
        qr_image_url: payment.qr_image_url,
        expires_at: expiresAt,
        amount_total: amountTotal,
        simulation_enabled: payment.simulation_enabled === true,
        amountLabel: `₱${amountTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
        qr_expires_at: expiresAt,
    };
};
