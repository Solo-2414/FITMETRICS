let nextToastId = 0;

export const MAX_VISIBLE_TOASTS = 3;

export const defaultDuration = (type) => ({
    success: 4000,
    info: 5000,
    warning: 6000,
    error: 8000,
}[type] ?? 5000);

const allToasts = (state) => [...state.visible, ...state.queue];

const addToast = (state, toast, now) => {
    if (!toast?.message) return state;
    const duplicate = allToasts(state).find((item) =>
        (toast.dedupeKey ? item.dedupeKey === toast.dedupeKey : item.type === toast.type && item.message === toast.message)
        && now - item.createdAt < 2000
    );
    if (duplicate) return state;

    const item = {
        ...toast,
        id: toast.id || `${now}-${nextToastId += 1}`,
        createdAt: now,
        duration: toast.duration ?? defaultDuration(toast.type),
    };
    if (state.visible.length < MAX_VISIBLE_TOASTS) {
        return { ...state, visible: [...state.visible, item] };
    }
    return { ...state, queue: [...state.queue, item] };
};

export const initialToastState = { visible: [], queue: [] };

export default function toastReducer(state = initialToastState, action) {
    switch (action.type) {
        case "add":
            return addToast(state, action.toast, action.now ?? Date.now());
        case "dismiss": {
            const visible = state.visible.filter((toast) => toast.id !== action.id);
            if (visible.length === state.visible.length) {
                return { ...state, queue: state.queue.filter((toast) => toast.id !== action.id) };
            }
            const [next, ...queue] = state.queue;
            return next ? { visible: [...visible, next], queue } : { ...state, visible };
        }
        case "expire":
            return toastReducer(state, { type: "dismiss", id: action.id });
        case "clear":
            return initialToastState;
        default:
            return state;
    }
}
