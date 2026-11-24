---
name: toast-feedback
description: "Use whenever a FITMETRICS task shows success, error, warning, info or confirmation feedback to the user. Routes every message through the global toast / InlineError / useConfirm and finds old-style feedback the checker script misses."
---

# Toast-only feedback

The global toast system lives in `frontend/src/components/ui/toast/` (`useToast`, `toastError`, `useConfirm`) and `components/ui/InlineError.jsx`.

## Routing table
| Situation | Use |
|---|---|
| Result of an action (saved, deleted, sent, paid, failed) | `toast.success/error/warning/info`; in `catch` use `toastError(err)` |
| Field validation | stays inline under the field (this is NOT old feedback) |
| A page or section failed to LOAD | `InlineError` with `onRetry` |
| Destructive or irreversible choice | `useConfirm()`, never `window.confirm/alert` |
| Persistent status (maintenance, expiry notice) | allowed banner with `toast-allow: <reason>` |
| Error while a modal is open | inside that modal |

## Finding old feedback (the checker alone is not enough)
1. Run `node scripts/check-toast-migration.mjs` from `/frontend` and paste the count.
2. It only flags Bootstrap `alert alert-*`, `alert()`, `window.confirm`, `ClerkToast`. ALSO grep `frontend/src` for:
   `role="alert"`, `text-danger`, `#f87171`, `setError(`, `setMessage(`, `setSuccess(`, `setStatus`, `setNotice`, `saveAlert`, `actionAlert`,
   inline `style={{ color: ... }}` messages, and `catch` blocks that only `console.error` or set local state.
3. Triage each hit into: action result (convert), field validation (keep), load failure (InlineError), persistent (allow). List every hit in a table with the decision.
4. Remove local state that only existed to feed the old message. One error is reported once (child handles or rethrows, never both).
5. Extend `check-toast-migration.mjs` so it also flags `role="alert"` with inline color styles and `setError(` state rendered as a message,
   without false positives for field validation (use a `field-error` allow marker with a reason). Keep the script dependency-free.

## Done means
The checker prints 0, the triage table is complete, every `toast-allow` line is justified, and each portal was tried with one
success and one failure (offline, expired session, two different errors stacking without overlap).
