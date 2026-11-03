export function attendanceMethodLabel(method) {
    if (method === "qr") return { label: "QR scan", icon: "fa-qrcode" };
    if (method === "qr_phone") return { label: "QR (mobile number)", icon: "fa-mobile-screen-button" };
    if (method === "walk_in") return { label: "Day pass", icon: "fa-ticket" };
    return { label: "Desk", icon: "fa-desktop" };
}
