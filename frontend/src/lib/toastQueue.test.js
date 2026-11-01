import assert from "node:assert/strict";
import test from "node:test";
import { enqueueToast, removeToast } from "./toastQueue.js";

test("toast queue deduplicates messages and keeps newest three in order", () => {
    const first = enqueueToast([], { type: "error", message: "Failed" }, 1000);
    const duplicate = enqueueToast(first, { type: "error", message: "Failed" }, 2500);
    assert.equal(duplicate.length, 1);
    const withMore = [0, 1, 2, 3].reduce(
        (current, index) => enqueueToast(current, { type: "success", message: `Message ${index}` }, 4000 + index),
        duplicate,
    );
    assert.deepEqual(withMore.map((toast) => toast.message), ["Message 1", "Message 2", "Message 3"]);
    assert.equal(removeToast(withMore, withMore[1].id).length, 2);
});
