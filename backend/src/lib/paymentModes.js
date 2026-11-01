export const paymentMethodError = (paymentModes, method) => (
  Array.isArray(paymentModes) && paymentModes.includes(method)
    ? null
    : `Payment method "${method}" is disabled.`
);
