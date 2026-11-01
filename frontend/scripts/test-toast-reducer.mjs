import assert from "node:assert/strict";
import reducer, { defaultDuration, initialToastState } from "../src/components/ui/toast/toastReducer.js";

const add = (state, type, message, now, options = {}) =>
  reducer(state, { type: "add", now, toast: { type, message, ...options } });

let state = add(initialToastState, "error", "Failed", 1000);
state = add(state, "error", "Failed", 1500);
assert.equal(state.visible.length, 1);
assert.equal(defaultDuration("success"), 4000);
assert.equal(defaultDuration("error"), 8000);

state = add(state, "success", "One", 2000);
state = add(state, "info", "Two", 3000);
state = add(state, "warning", "Queued", 4000);
assert.deepEqual(state.visible.map((toast) => toast.message), ["Failed", "One", "Two"]);
assert.deepEqual(state.queue.map((toast) => toast.message), ["Queued"]);

state = reducer(state, { type: "dismiss", id: state.visible[1].id });
assert.deepEqual(state.visible.map((toast) => toast.message), ["Failed", "Two", "Queued"]);
state = reducer(state, { type: "expire", id: state.visible[0].id });
assert.deepEqual(state.visible.map((toast) => toast.message), ["Two", "Queued"]);
state = reducer(state, { type: "clear" });
assert.deepEqual(state, initialToastState);
console.log("toast reducer: dedupe, cap, queue promotion, durations and dismissal passed");
