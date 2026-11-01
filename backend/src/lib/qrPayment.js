export const qrPaymentResponse = ({ paymentId, qrImageUrl, expiresAt, amountTotal, simulationEnabled }) => ({
  payment_id: paymentId,
  qr_image_url: qrImageUrl,
  expires_at: expiresAt,
  amount_total: Number(amountTotal),
  simulation_enabled: simulationEnabled === true,
});
