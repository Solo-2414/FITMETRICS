---
description: "Member Registration: roll the page design back to the original layout and CSS, while keeping every new function (existing-member check, QR Ph, no membership before payment, receipt, cash change)."
agent: 'agent'
---
# Task 8g: Roll back the Member Registration design, keep the functions

Use the `design-freeze` skill for this task and for every later task.

Problem: task 8f replaced the whole look of `ClerkMemberRegistration`. The page now has a different layout
(titles "Member details" / "Membership plan" / "Payment", plain text price lines, a big blue "Generate QR Ph" button, a different
card style, no breadcrumb, no icons). I did NOT ask for a redesign. The original design must come back exactly.
The new functions must stay and keep working.

Files: `frontend/src/pages/clerk/ClerkMemberRegistration.jsx`, `ClerkMemberRegistration.module.css`,
`frontend/src/components/clerk/PaymentWaitPanel.jsx` (and its CSS), plus any CSS you find was changed by 8f.

## Source of truth for the design
The last commit before the 8f work is the original design. Find it with:
`git --no-pager log --oneline -- frontend/src/pages/clerk/ClerkMemberRegistration.jsx` (the original is the version from commit `577aaa9`
"Skeleton added" unless a newer commit exists that was made BEFORE task 8f; if the working tree has uncommitted 8a-8e changes,
those logic changes stay).
Reference copies of the original files are also in `design-reference/` (ask me to paste them if the folder is not in the repo):
`ClerkMemberRegistration.original.jsx` and `ClerkMemberRegistration.original.module.css`.

Original layout to restore (keep class names, icons, order, text and `data-aos` animations):
- Breadcrumb "Desk Console > Register Member", title "Member Registration", description
  "Register a new gym member and set up their member account", and the "Clear form" button on the right above the cards.
- Left column (`col-12 col-xl-8`, stacked cards with `styles.panelCard`):
  1. "Member Personal Information" (`panelHeader` with the user icon): full name, mobile, email, password, gender, emergency contact name and number, in the original order, labels and placeholders.
  2. "Membership Plan Selection" (`panelHeaderNoBorder`): the `planCard` grid with radio circle, name, duration, price, "Popular" badge, the info alert and the student rate toggle.
  3. "Optional Coach Assistance": the original coach card with the switch and coach list (keep the 8c visibility improvements only if they use the same card/toggle classes).
- Right column (`col-12 col-xl-4`): "Payment & Digital Receipt" card with the `totalBox`/`totalPrice`, the `btnPaymentMethod` buttons,
  the Cash Tendered/Change block (`inputGroupPrefix`, `changeDisplay`), the receipt checkbox (`checkboxLabelFull`),
  followed by the action panel (`actionPanel`, `btnSubmit` "Complete Registration & Send Email", `btnCancelFull`).

## Steps
1. Safety first: copy the current files to `frontend/src/pages/clerk/_backup_registration_8f/` (not imported anywhere, delete this folder at the end
   unless I ask to keep it) so no logic is lost. Do not commit.
2. Restore the stylesheet: `git checkout <original-commit> -- frontend/src/pages/clerk/ClerkMemberRegistration.module.css`
   (or copy it from `design-reference/`). Then add only the NEW classes the new functions need at the END of that file under
   `/* added for 8f logic */`, using the page's existing variables, radius, padding and borders (see the skill). No existing rule may change.
3. Rebuild the JSX from the ORIGINAL markup (`git show <original-commit>:frontend/src/pages/clerk/ClerkMemberRegistration.jsx`)
   and re-insert the 8f logic into it, instead of keeping the 8f markup and trying to restyle it:
   - Keep controlled form state, validation, the draft rules (never store the password), the plan loading and student/coach price logic,
     the server-quoted total, and the double-submit guard. Bind them to the ORIGINAL inputs, labels and cards.
   - Existing-member check: show the warning as a small alert directly under the email or phone field using the page's existing
     alert/info style, with two text links "View member" and "Renew / change plan". Disable the submit button while it applies.
   - Payment buttons: use the original `btnPaymentMethod` / `btnPaymentMethodActive` buttons with icons. Two buttons only: Cash and QR Ph
     (GCash and Maya are replaced by QR Ph; the original GCash/Maya button look is reused for QR Ph with a QR icon).
   - Cash: put the live tendered/change logic into the ORIGINAL Cash Tendered and Change blocks (`inputGroupPrefix`, `changeDisplay`), including
     the short-by message and quick amount buttons using the existing button class. No new layout.
   - QR Ph: after "Complete Registration & Send Email" (rename the label to "Generate QR Ph & Register" only when QR Ph is selected, same button style),
     show the QR, amount, countdown, status chip and Cancel / New QR buttons INSIDE the "Payment & Digital Receipt" card, replacing the
     method buttons and cash block while waiting, in the same card style. No modal, no new page layout, no full-width blue banner.
   - Pending/resume registration and the "Paid" result card also appear inside that card (or in the existing success alert position).
   - Replace the static price lines with the ORIGINAL `totalBox` showing plan, student price, coach add-on and total due.
   - Remove the Session plan from the plan list (still required) without changing the plan card design.
   - Keep the receipt checkbox in its original place; update only its text to "Send receipt and welcome email".
4. `PaymentWaitPanel`: it is shared with ClerkPayments and ClerkMembership. Do not restyle those pages. Make the panel look like a native part
   of each page's payment card (use CSS variables, no hard-coded blue), and check with `git diff` that those pages' markup and CSS changed only where
   the digital button was swapped for QR Ph.
5. Check every other clerk page that tasks 8a-8f touched: run `git --no-pager diff --stat -- frontend/src/pages/clerk frontend/src/components/clerk`
   and for each `.module.css` that shows removed or changed lines, report it to me. Revert design changes only on the registration page now;
   list the others and wait for my answer.

## Don't
- Don't invent a new design, new card titles, new colors or new spacing. If something in the original does not fit a new function, ask me.
- Don't drop any 8f function while rolling back. Don't touch backend behavior.

## Done when
- The registration page looks exactly like the original at 1920, 1366 and 390 px: same breadcrumb, titles, cards, icons, plan cards, colors and spacing.
- CSS diff against the original commit shows only appended lines under `/* added for 8f logic */`.
- Still working: existing member blocked with message and links; plan, student and coach prices correct; cash tendered updates the change live and
  blocks short payments; QR Ph generates a QR inside the payment card, waits, and only a paid payment creates the membership and queues the receipt email; cancelling or letting it
  expire leaves no membership or usable account.
- Run `/design-freeze` checks and `/verify-before-done`. Final reply must include "Design unchanged: yes/no", the files changed, the backup folder
  location, and the list of other pages with design changes from 8a-8f.
