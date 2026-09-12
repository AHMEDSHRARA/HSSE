# HSSE Dashboard — Rua Al-Haram Al-Makki Co.

Single-page HSSE/HSSE reporting dashboard. Fully self-contained and works
completely offline (no CDN, no build step, no server) -- just open
`index.html` in a browser, or upload this whole folder to GitHub / GitHub
Pages.

## File structure

- `index.html` -- page markup, loads everything below in order.
- `styles.css` -- all styling (dark theme default + light theme).
- `assets.js` -- seed data: baseline site photos + brand logo (base64), used
  only on first run before any Excel import / photo upload.
- `app/` -- the application source, split by concern:
  - `icons.js` -- inline SVG icon set
  - `data.js` -- project list, field catalogue, formatters, baseline seed records
  - `store.js` -- app state + localStorage persistence
  - `charts.js` -- Chart.js chart helpers + the always-on value-labels plugin
  - `render_exec.js` -- Executive Summary tab
  - `render_projects.js` -- Projects Overview tab
  - `render_photos.js` -- Site Photos tab (upload, gallery, caption editing)
  - `io.js` -- Excel/JSON export+import and the Executive Analysis PDF report
  - `ui.js` -- toasts, modal, theme toggle, tab switching
  - `main.js` -- app bootstrap / event wiring
- `vendor/` -- third-party libraries, kept as local files (Chart.js, SheetJS,
  html2canvas, jsPDF) so the dashboard needs no internet connection to run.
  These are unmodified, minified library builds -- not meant to be edited.

## Editing

All the files under `app/`, plus `styles.css` and `index.html`, are plain
readable source -- edit them directly and refresh the page (no build step).
Only `vendor/*.js` are minified third-party code and `assets.js` is
generated data; leave those as-is unless you're intentionally
upgrading a library or replacing the seed photos/logo.

## Data persistence

All data (imported Excel rows, uploaded photos, theme choice) is stored in
the browser's localStorage, per browser/profile. Use the sidebar's
"Export Excel" / "Full Backup (.json)" buttons regularly to keep a copy
outside the browser.
