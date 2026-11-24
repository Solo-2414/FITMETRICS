---
name: design-freeze
description: "Use whenever a FITMETRICS task changes the behavior of an existing page. Keeps the current layout, markup structure, class names and CSS untouched, and shows how to add new UI without restyling the page."
---

# Design freeze

Behavior tasks (payments, validation, QR, emails, filters) must NOT change how an existing page looks.
If the user wants a redesign they will say "redesign" or "change the design" in that message.

## When to use this skill
- You are about to edit a `.jsx` page or a `.module.css` file that already exists in `frontend/src`.
- A prompt asks for new functions on a page, new buttons, new states or new fields.

## Before editing
1. Run `git --no-pager show HEAD:<path>` (or `git log -- <path>`) for every page you will touch and read the current layout:
   section order, card titles, grid columns, icons, headings, placeholders, class names.
2. Write down, in two lines, what the page looks like now. You must be able to say "after my change it still looks the same, plus X".

## Rules while editing
- Do not rename, reorder, remove or restyle existing sections, cards, headings, labels, icons, grid columns, spacing, colors or fonts.
- Do not edit existing CSS rules in a `.module.css`. Add NEW classes at the END of the file (or in a new `<Page>Extra.module.css`)
  under a comment `/* added for <task> */`, built from the same CSS variables (`--primary-color`, `--secondary-background-color`,
  `--card-stroke-color`, `--heading-font`) and the same shapes (radius, padding, border) as the neighboring components.
- Reuse the page's own classes for new UI: buttons use the page's existing button classes, alerts use the existing alert/info classes,
  inputs use the existing input class. A new element must look like it was always part of the page.
- Do not replace a page's JSX with a rewritten component. Change logic through state, handlers and small inserted blocks.
  Converting inputs to controlled state is fine as long as the markup around them stays the same.
- New states (loading, error, waiting for payment, pending, success) appear INSIDE the existing card they belong to,
  not as a new page layout. A modal is allowed only if the page already uses modals.
- Do not change shared components (`ClerkLayout`, `Skeleton`, shared panels) in a way that alters other pages.
  If a shared component needs a new feature, add an optional prop with the old behavior as the default.

## After editing
1. `git --no-pager diff --stat -- <the page .jsx> <the page .module.css>`. The CSS diff must show added lines only (no removed or changed lines).
2. Compare the JSX diff: removed or changed lines should be logic, not layout. Explain any markup you changed.
3. Check the page at 1920, 1366 and 390 px widths and list anything that moved.
4. In the final reply write one line: "Design unchanged: yes/no" and list any markup you had to change and why.

## Rules
- If a requirement cannot be met without changing the design, STOP and ask the user instead of redesigning.
- Never claim "design unchanged" unless you ran the git diff described above.
