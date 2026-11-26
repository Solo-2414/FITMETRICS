const knownErrors = {
  AI_BUSY: "The AI assistant is temporarily busy. Please try again shortly.",
  AI_DISABLED: "The AI assistant is disabled by configuration.",
  AI_NOT_CONFIGURED: "The AI assistant is not configured. Contact an administrator.",
  AI_RATE_LIMITED: "AI assistant quota reached. Please try again later.",
  AI_UNAVAILABLE: "The AI assistant is unavailable. Please try again later.",
  PGRST116: "We couldn't find exactly one matching record.",
  "23505": "That value already exists.",
  "23503": "This record is linked to other data and can't be changed.",
  "23514": "That change isn't allowed.",
  "23502": "That change isn't allowed.",
};

export function mapDatabaseError(error) {
  const code = error?.code;
  if (knownErrors[code]) {
    return {
      message: knownErrors[code],
      code,
      retryAfter: Number.isSafeInteger(error?.retryAfter) ? error.retryAfter : undefined,
      remainingQuota: Number.isSafeInteger(error?.remainingQuota) ? error.remainingQuota : undefined,
    };
  }
  const raw = error?.message || "";
  const isTrigger = /trigger|raise exception/i.test(raw);
  const message = knownErrors[code] || (isTrigger ? "That change could not be completed." : "Something went wrong on our side.");
  return { message, code: code || "INTERNAL_ERROR" };
}
