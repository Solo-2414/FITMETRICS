import assert from "node:assert/strict";
import { mapDatabaseError } from "../src/lib/errorMapper.js";

const cases = [
  ["PGRST116", "We couldn't find exactly one matching record."],
  ["23505", "That value already exists."],
  ["23503", "This record is linked to other data and can't be changed."],
  ["23514", "That change isn't allowed."],
  ["23502", "That change isn't allowed."],
];

for (const [code, message] of cases) {
  assert.equal(mapDatabaseError({ code, message: "raw database detail" }).message, message);
}
assert.equal(mapDatabaseError({ message: "new row violates trigger exception" }).message, "That change could not be completed.");
assert.equal(mapDatabaseError({ message: "unknown database detail" }).message, "Something went wrong on our side.");
console.log(`error mapper: ${cases.length + 2} cases passed`);
