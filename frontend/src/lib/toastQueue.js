let nextToastId = 0;

export const enqueueToast = (current, toast, now = Date.now()) => {
    if (!toast?.message) return current;
    const duplicate = current.some((item) => item.message === toast.message && now - item.createdAt < 2000);
    if (duplicate) return current;
    const item = { ...toast, id: `${now}-${nextToastId += 1}`, createdAt: now };
    return [...current, item].slice(-3);
};

export const removeToast = (current, id) => current.filter((toast) => toast.id !== id);
