# Install (3 steps)
1. Copy `backend/` and `.github/` from this folder into your repo root (merge with the existing folders).
   You should now have `backend/src/lib/reports/` (with a `fonts/` folder) and `backend/scripts/preview-reports.mjs`.
2. In a terminal: `cd backend`, then `npm install pdfkit exceljs`, then add this line to the "scripts" block of backend/package.json:
   "preview:reports": "node scripts/preview-reports.mjs"
   and add `backend/tmp/` to your .gitignore.
3. Run `npm run preview:reports` and open the files in `backend/tmp/report-previews/` to see the new design (PDF + Excel + CSV).
   Then in a NEW Copilot chat (Agent mode) run `/04b-reports-design` so the bot connects your export route to the new builders.
