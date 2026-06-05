# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

**Data Quality Control Tower (DQCT)** is a static, browser-only app (HTML/CSS/vanilla JS). There is no `package.json`, Docker, or backend. All logic runs in the browser; persistence uses `localStorage` / IndexedDB.

### Required runtime

| Component | Required | Notes |
|-----------|----------|--------|
| Static HTTP server on port 8000 | Yes | ES modules must be served over `http://` (not `file://`) |
| Browser | Yes | For manual/E2E UI checks |
| Node.js | Optional | Useful for importing `src/**/*.js` smoke tests from the repo root |
| Internet | Optional | JSZip loads from CDN on export-bundle flows only |

### Start the dev server

From repo root:

```bash
python3 -m http.server 8000
```

Alternative: `npx --yes http-server -p 8000`

### Entry points

| URL | Use when |
|-----|----------|
| `http://localhost:8000/` | **Preferred** — SPA (`index.html` + `type="module"` on `src/main.js`) |
| `http://localhost:8000/#validate` | Validation workflow in the SPA |
| `http://localhost:8000/#diff` | Diff workflow in the SPA |
| `http://localhost:8000/dqct/dqct.html` | Legacy full UI — **do not use for module smoke tests**; shared `src/` files are loaded with classic `<script defer>` tags (no `type="module"`), which breaks `export` syntax in modern browsers |

### Lint / test / build

- **Lint:** not configured in this repo.
- **Unit tests:** not configured in this repo.
- **Build:** none — serve files as-is.
- **Engine smoke test (headless):** from repo root, import `src/modules/validation/engine.js` and `src/modules/diff/engine.js` with Node ESM after parsing JSON via `src/shared/parser.js` (`parseJsonText` + `extractRecordsFromPayload`).

### SPA boot gotcha

`src/main.js` must not call missing methods on the object returned from `initSidebar()` (it only exposes `setCollapsed`, `toggleCollapsed`, `toggleMobileOpen`). A call to a non-existent `updateThemeButton` prevents the router from initializing and leaves the UI stuck on the dashboard.

### Typical validation flow (SPA)

1. Start the static server.
2. Open `http://localhost:8000/#validate`.
3. Upload one or more `.json` files (root array or `{ "Export": [...] }`).
4. Click **Run validation** — results render in `#validateOutput` and status in `#validateStatus`.

### Deploy

GitHub Pages from branch `main`, folder `/ (root)` — see `README.md`.
