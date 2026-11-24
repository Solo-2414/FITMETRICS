---
description: "Walk-in customer form: strict, user-friendly validation that mirrors the server rules, field-level server errors, review-and-confirm step, student ID check."
agent: 'agent'
---
# Task 13d: Strict walk-in customer form (frontend)

The backend already enforces strict rules in `backend/src/lib/walkInValidation.js` (tested by `backend/scripts/test-walkin-validation.mjs`) and returns
`422 { error, errors: [{ field, message, suggestion? }] }`. The Payments page walk-in form must match it exactly. Same branch; use `design-freeze` outside `ClerkPayments.*` and the shared payment components; shared toast and `ClerkModal`.

## Do
1. **Mirror the rules**: create `frontend/src/lib/walkInRules.js` as a line-by-line port of `walkInValidation.js` (same regexes, blocked words, messages, normalization) and a Node script
   `frontend/scripts/test-walkin-rules.mjs` that runs the SAME cases as the backend test (paste output). The two files must never drift: add a comment at the top of both pointing to each other.
2. **Field behavior (Customer card)**:
   - Full name: collapse spaces while typing, auto Title Case on blur only when the text is all lowercase/all uppercase (keep mixed case), block digits and symbols as typed (ignore the keystroke or strip on paste), max 80.
   - Mobile: digits only, shown as `0917 123 4567` while typing (accept pasted `+63...`, `63...`, `9...`), `inputMode="tel"`, max 11 digits, normalized value is what is sent.
   - Email (optional): lowercase, trims, typo detection with a clickable suggestion ("Did you mean mae@gmail.com?" -> one click fixes it).
   - Notes: counter "0/200".
   - Student rate: when ticked, a required checkbox "I checked a valid student ID" appears (inline error until ticked); the price in the summary changes to the student price.
   - Inline errors in the site style (red border, icon, message, `aria-invalid`, `aria-describedby`), shown on blur and on submit, cleared as soon as valid. No browser validation bubbles (`noValidate`).
3. **Server errors**: map `error.errors[]` from a 422 to the matching fields (and focus the first one); show the generic toast only for non-field errors. Never show "Something went wrong on our side." for a validation problem.
4. **Gate and review**: the action button keeps the gray-but-clickable gate with the required-information modal. When the form is valid, show a **Review & confirm** modal (`ClerkModal`) BEFORE recording/generating the QR:
   customer name, mobile, email (or "No email - no receipt will be sent"), student rate yes/no, day pass, total, payment method, cash tendered and change. Buttons "Edit details" and "Confirm". Cash: recording happens on Confirm. QR: the QR is generated on Confirm.
5. **Duplicate and returning checks** keep working (member-with-plan modal, returning-customer chip); they run on blur after the field is valid.
6. **Toast position**: toasts must not cover the Payments header controls (date chip, Walk-in/Member switch). Offset the toast container below the top bar and header row on this page (or give all pages the same offset in the shared container) and verify at 1366 and 390 px.

## Done when
- Every rule in the backend test has an equivalent frontend behavior; entering `0932131321312`, `09090909090`, `Mae`, `Test Customer`, `mae@gmial.com`, or a student rate without the ID box ticked is blocked with a friendly inline message.
- A valid customer reaches the Review modal; confirming records the walk-in (cash) or generates the QR, and the customer/visit/payment appear in the transactions table.
- Frontend rules test passes (paste output), `node scripts/check-toast-migration.mjs` still 0, build passes, changed-file lint passes.
