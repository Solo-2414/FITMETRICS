const knownErrors = {
  PGRST116: "We couldn't find exactly one matching record.",
  "23505": "That value already exists.",
  "23503": "This record is linked to other data and can't be changed.",
  "23514": "That change isn't allowed.",
  "23502": "That change isn't allowed.",
};

export function mapDatabaseError(error) {
  const code = error?.code;
  const raw = error?.message || "";
  const isTrigger = /trigger|raise exception/i.test(raw);
  const message = knownErrors[code] || (isTrigger ? "That change could not be completed." : "Something went wrong on our side.");
  return { message, code: code || "INTERNAL_ERROR" };
}
