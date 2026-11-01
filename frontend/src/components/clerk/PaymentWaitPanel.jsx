export default function PaymentWaitPanel({ payment, countdown, onCancel, onGenerate, onSimulate, simulationEnabled, qrClassName }) {
    if (!payment) return null;
    const needsReview = payment.status === "needs_review";
    const failed = payment.status === "failed";
    const safeCountdown = Number.isFinite(countdown) ? Math.max(0, countdown) : 0;
    const expired = safeCountdown <= 0;
    return <div className="text-center">
        <span className={`badge ${needsReview || failed ? "text-bg-danger" : "text-bg-warning"} mb-3`}>{needsReview ? "Payment needs review. Contact an admin." : failed ? "Payment failed" : expired ? "QR expired" : "Waiting for payment"}</span>
        {payment.qr_image_url && !expired && !needsReview && !failed && <img src={payment.qr_image_url} alt="QR Ph payment code" className={qrClassName || payment.qrClassName} />}
        <p className="text-white mt-3 mb-1">Amount due: <strong>{payment.amountLabel}</strong></p>
        <p className="text-secondary">{needsReview || failed ? "This registration cannot continue. Review the payment before trying again." : expired ? "Generate a new QR to continue." : `Expires in ${Math.floor(safeCountdown / 60)}:${String(safeCountdown % 60).padStart(2, "0")}`}</p>
        {!needsReview && !failed && expired && <button type="button" className="btn btn-outline-primary me-2" onClick={onGenerate}>Generate new QR</button>}
        {!needsReview && !failed && simulationEnabled && !expired && <button type="button" className="btn btn-outline-secondary me-2" onClick={onSimulate}>Simulate payment (test only)</button>}
        {!needsReview && !failed && <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>}
    </div>;
}
