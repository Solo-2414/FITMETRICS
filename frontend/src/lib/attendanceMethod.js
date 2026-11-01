export function attendanceMethodLabel(method) {
    if (method === "qr") return { label: "QR scan", icon: "fa-qrcode" };
    return { label: "Desk", icon: "fa-desktop" };
}
