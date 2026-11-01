const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L} .'-]+$/u;
const phonePattern = /^(09\d{9}|\+639\d{9})$/;

export const registrationFields = {
    full_name: (value) => {
        const name = String(value || "").trim();
        if (!name) return "Enter the member's full name.";
        if (name.length < 2 || name.length > 80 || !namePattern.test(name)) return "Enter a name using letters, spaces, periods, hyphens, or apostrophes.";
        return "";
    },
    email: (value) => {
        const email = String(value || "").trim().toLowerCase();
        if (!email) return "Enter an email address.";
        if (email.length > 254 || !emailPattern.test(email)) return "Enter a valid email, for example name@example.com.";
        return "";
    },
    phone: (value) => {
        if (!phonePattern.test(String(value || "").replace(/[\s-]/g, ""))) return "Enter an 11-digit Philippine mobile number, such as 0917 123 4567.";
        return "";
    },
    password: (value) => {
        if (!value) return "Create a password with at least 8 characters.";
        if (String(value).length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use at least 8 characters with at least one letter and one number.";
        return "";
    },
    gender: (value) => value ? "" : "Choose the member's gender.",
    emergency_contact_name: (value) => String(value || "").trim() ? "" : "Enter an emergency contact name.",
    emergency_contact_phone: (value) => {
        if (!phonePattern.test(String(value || "").replace(/[\s-]/g, ""))) return "Enter an 11-digit Philippine mobile number, such as 0918 765 4321.";
        return "";
    },
};

export const validateRegistration = (form) => Object.fromEntries(
    Object.entries(registrationFields)
        .map(([field, validate]) => [field, validate(form[field])])
        .filter(([, message]) => message),
);

export const registrationIssueList = (form, { paymentMethod = "cash", cashTendered = "", totalDue = 0, addCoach = false, coachId = "" } = {}) => {
    const errors = validateRegistration(form);
    if (addCoach && !coachId) errors.coach_id = "Choose a coach or remove coach assistance.";
    if (paymentMethod === "cash" && (cashTendered === "" || Number(cashTendered) < Number(totalDue))) {
        errors.cash_tendered = cashTendered === "" ? "Enter the cash tendered." : "Cash tendered must cover the total amount due.";
    }
    const labels = {
        full_name: "Full name",
        email: "Email address",
        phone: "Mobile contact number",
        password: "Password",
        gender: "Gender",
        emergency_contact_name: "Emergency contact name",
        emergency_contact_phone: "Emergency phone number",
        plan_code: "Membership plan",
        coach_id: "Coach assistance",
        cash_tendered: "Cash tendered",
    };

    return Object.entries(errors).map(([field, message]) => ({ field, label: labels[field] || field, message }));
};

export const isCurrentDuplicateValue = (currentValue, requestedValue) => currentValue === requestedValue;

export const normalizePhone = (value) => {
    const compact = String(value || "").replace(/[\s-]/g, "");
    return compact.startsWith("+63") ? `0${compact.slice(3)}` : compact;
};

export const normalizeRegistration = (form) => ({
    ...form,
    full_name: String(form.full_name || "").trim(),
    email: String(form.email || "").trim().toLowerCase(),
    phone: normalizePhone(form.phone),
    emergency_contact_phone: normalizePhone(form.emergency_contact_phone),
});
