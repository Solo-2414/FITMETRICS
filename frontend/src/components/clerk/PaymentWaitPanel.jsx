export default function PaymentWaitPanel({ payment, countdown, onCancel, onGenerate }) {
    if (!payment) return null;
    const expired = countdown <= 0;
    return <div className="text-center">
        <span className="badge text-bg-warning mb-3">{expired ? "QR expired" : "Waiting for payment"}</span>
        {payment.qr_image_url && !expired && <img src={payment.qr_image_url} alt="QR Ph payment code" className={payment.qrClassName} />}
        <p className="text-white mt-3 mb-1">Amount due: <strong>{payment.amountLabel}</strong></p>
        <p className="text-secondary">{expired ? "Generate a new QR to continue." : `Expires in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`}</p>
        {expired && <button type="button" className="btn btn-outline-primary me-2" onClick={onGenerate}>Generate new QR</button>}
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancel</button>
    </div>;
}
