const MANILA_TIME_ZONE = "Asia/Manila";

export const dateValue = (value = new Date()) => new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
}).format(typeof value === "string" ? new Date(value) : value);

export const today = () => dateValue();

export const addDays = (value, days) => {
    const date = new Date(`${value}T00:00:00+08:00`);
    date.setUTCDate(date.getUTCDate() + days);
    return dateValue(date);
};

export const paymentDateRange = (preset) => {
    const current = today();
    if (preset === "yesterday") {
        const yesterday = addDays(current, -1);
        return { from: yesterday, to: yesterday };
    }
    if (preset === "last-7") return { from: addDays(current, -6), to: current };
    if (preset === "this-month") return { from: `${current.slice(0, 8)}01`, to: current };
    return { from: current, to: current };
};
