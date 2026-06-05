You are helping refactor the Data Quality Control Tower (DQCT) into a clean Single Page Application (SPA) with a well-organized file and directory structure. No build step, no frameworks, no bundlers — vanilla JS (ES modules) and vanilla CSS only.

## Target project structure

dqct-spa/
├── index.html                        ← Single HTML entry point (no redirect shim)
├── styles/
│   ├── tokens.css                    ← CSS custom properties: colors, spacing, type scale, radius, shadows
│   ├── base.css                      ← Reset, base element styles, focus rings, selection, reduced-motion
│   ├── layout.css                    ← Sidebar, main content area, topbar, responsive breakpoints
│   ├── components.css                ← Buttons, cards, inputs, badges, toasts, modals, tables, empty states
│   ├── views.css                     ← View-specific styles (#view-dashboard, #view-validate, #view-diff, #view-settings)
│   └── mobile.css                    ← All @media overrides in one place (mobile-first, grouped by component)
└── src/
    ├── main.js                       ← App entry: router init, theme init, sidebar toggle, event delegation
    ├── router.js                     ← Hash-based SPA router: maps #hash → view show/hide + active nav state
    ├── shared/
    │   ├── appState.js               ← Settings load/save (localStorage), theme, run history
    │   ├── parser.js                 ← JSON parse + root array extraction
    │   └── exports.js                ← ZIP bundle export (JSZip) with JSON fallback
    ├── modules/
    │   ├── validation/
    │   │   ├── engine.js             ← Rule evaluation: required, unique, regex, enum, date_format, required_if, documents
    │   │   ├── profiles.js           ← Profile load/save/clone (localStorage), UI state persistence, run compaction
    │   │   └── fingerprint.js        ← SHA-256 deduplication fingerprint from 12 core fields
    │   ├── diff/
    │   │   ├── engine.js             ← Sync + async batched diff: changed/new/removed/unchanged record detection
    │   │   └── ui.js                 ← Diff view rendering, changed-field expansion, character-level diff display
    │   └── profiler/
    │       └── engine.js             ← Field stats, rule suggestions, profile name inference + deduplication
    └── ui/
        ├── table.js                  ← Sortable, paginated table controller (used by validation results)
        ├── toasts.js                 ← Toast notifications: success, warning, error with auto-dismiss
        ├── jsonViewer.js             ← Record inspector: JSON highlight, character-level LCS diff HTML
        └── sidebar.js                ← Sidebar collapse/expand, mobile hamburger, active nav state

## HTML entry point rules (index.html)
- Valid HTML5 with lang="en" and charset="utf-8"
- Load all CSS in <head> in this order: tokens.css → base.css → layout.css → components.css → views.css → mobile.css
- Load JSZip from CDN before app scripts: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
- Load all src/ scripts as ES modules: <script type="module" src="./src/main.js"></script>
  (main.js imports everything else — no script tags for individual modules in HTML)
- Include an inline SVG logo for DQCT in the sidebar (tower/antenna motif, monochrome, currentColor, works at 24px and 48px)
- Include a theme toggle button (sun/moon icon) in the sidebar footer
- Set data-theme on <html> via JS before first paint to avoid flash of wrong theme

## CSS architecture rules
- tokens.css defines ALL design values as CSS custom properties. No hardcoded colors, px sizes, or spacing values anywhere else.
  - Type scale: clamp() fluid sizes, --text-xs through --text-xl (web app caps at --text-xl, never larger)
  - Spacing: 4px base grid, --space-1 (4px) through --space-24 (96px)
  - Colors: warm neutral surfaces + teal primary accent. Full light + dark mode via :root and [data-theme="dark"]
  - Shadows: tone-matched to warm surfaces using oklch()
  - Transitions: --transition-interactive: 180ms cubic-bezier(0.16, 1, 0.3, 1)
- base.css: box-sizing reset, body defaults, img/button/input base, text-wrap, ::selection, :focus-visible, prefers-reduced-motion
- layout.css: sidebar (240px expanded, 56px collapsed), main area flex/grid, topbar, content max-widths
- components.css: reusable UI — .btn, .btn-primary, .btn-ghost, .card, .input, .badge, .toast, .modal, .table-wrap, .empty-state, .skeleton
- views.css: layout overrides and unique elements per view. No hardcoded colors — reference tokens only.
- mobile.css: ALL responsive overrides in one clearly labeled file. Never scatter @media inside other CSS files.

## JS architecture rules (ES modules)
- All files use ES module syntax (import/export). No IIFE wrappers, no window.* globals, no script defer.
- main.js is the single entry point imported in index.html. It imports and initializes everything.
- router.js exports a createRouter(routes) function. Routes map hash strings to { onEnter, onLeave } callbacks.
- Each module exports only its public API. No side effects on import.
- appState.js exports: loadSettings(), saveSettings(), loadHistory(), addHistoryRun()
- parser.js exports: parseJsonText(), extractRecordsFromPayload(), normalizeRecords()
- exports.js exports: buildExportBundle(exportsMap, summary)
- validation/engine.js exports: runValidation(records, profile, options)
- validation/profiles.js exports: loadProfiles(), saveProfiles(), cloneProfile(), defaultProfile
- validation/fingerprint.js exports: generateFingerprint(record), findDuplicates(records)
- diff/engine.js exports: diffRecords(baseline, comparison, options), diffRecordsAsync(...)
- diff/ui.js exports: renderDiffView(container, diffResult, options)
- profiler/engine.js exports: computeFieldStats(records), suggestRules(fieldStats, total), inferProfileName(records)
- table.js exports: createTable(config) → { update(rows), clear() }
- toasts.js exports: showToast(text, tone), showSuccess(msg), showWarning(msg), showError(msg)
- jsonViewer.js exports: renderRecordViewer(record, highlightPath), renderDiffViewer(base, compare, changedPaths)
- sidebar.js exports: initSidebar() → handles collapse, mobile toggle, active link state

## Navigation / routing
- Sidebar links: Dashboard (#dashboard), Validate (#validate), Diff (#diff), Settings (#settings)
- Each view is a <section id="view-dashboard"> etc., shown via .hidden class toggled by router.js
- Settings is a full sidebar view (not a dropdown). Merge the old top-nav settings dropdown here.
- Sidebar collapses to icon-only at < 768px via layout.css + sidebar.js

## Behavior to preserve exactly
- All validation logic: required, unique, regex, enum, date_format, required_if, documents_have_required_keys, hash_count_matches_documents, no_duplicate_documents
- All diff logic: async batched diff, character-level diff viewer, changed field expansion
- File upload: drag-drop + click, multi-file (max 10), 50MB limit, JSON parse feedback
- Schema drift detection and anomaly warnings
- Export bundle: ZIP via JSZip, JSON fallback
- Issue report builder and Trello-ready ticket text generation
- Settings persistence via localStorage (defaultUniqueKey, ignoreFields, theme, exportFormat)
- Recent run history (last 25 runs, 90-day pruning)
- Record inspector modal: Summary / Issues / Record JSON tabs, focus trap, Escape to close
- Profile management: clone, import schema, suggest from batch, save, reset
- Toast notifications with auto-dismiss
- All ARIA roles, keyboard navigation

## Performance rules
- Filter inputs debounced at 250ms before re-rendering tables
- Character-level diff (jsonViewer charLevelDiffHtml) runs only on row expand, not initial render
- Use content-visibility: auto on long table bodies
- Lazy-render diff rows: render first 50 visible, load more on scroll

## What to remove / simplify
- Remove index.html redirect shim (index.html IS the app now)
- Remove all IIFE wrappers — (function attachXxx(globalScope){...})(window) — convert to ES module exports
- Remove window.DQCTxxx global assignments — use named imports instead
- Remove the dqct/ subdirectory structure (consolidate into dqct-spa/)
- Remove the settings gear dropdown from the topbar — settings live in the sidebar

## IIFE-to-ES-module conversion rules
For each existing source file that uses the IIFE pattern, apply this conversion:

BEFORE (existing pattern):
  (function attachDQCTFoo(globalScope) {
    function bar() { ... }
    function baz() { ... }
    globalScope.DQCTFoo = { bar, baz };
  })(window);

AFTER (ES module pattern):
  function bar() { ... }
  function baz() { ... }
  export { bar, baz };

Apply this transformation to every file in this order, one file at a time:
  1.  src/shared/parser.js           — was: globalScope.DQCTParser
  2.  src/shared/appState.js         — was: globalScope.DQCTAppState
  3.  src/shared/exports.js          — was: window buildExportBundle (anonymous IIFE)
  4.  src/modules/validation/profiles.js   — was: globalScope.DQCTProfiles
  5.  src/modules/validation/engine.js     — was: globalScope.DQCTValidationEngine
  6.  src/modules/validation/fingerprint.js — was: window.DQCTFingerprint
  7.  src/modules/diff/engine.js     — was: globalScope.DQCTDiffEngine
  8.  src/modules/diff/ui.js         — was: globalScope.DQCTDiffUI
  9.  src/modules/profiler/engine.js — was: globalScope.DQCTProfiler
  10. src/ui/table.js                — was: globalScope.DQCTTable
  11. src/ui/toasts.js               — was: globalScope.DQCTToasts
  12. src/ui/jsonViewer.js           — was: globalScope.DQCTJsonViewer

For each conversion:
- Strip the IIFE wrapper entirely
- Replace all globalScope.DQCTXxx = { ... } assignments with named exports
- Replace all internal window.DQCTXxx references with direct function calls or local imports
- Do not change any internal logic, algorithm, or function signatures
- After converting each file, update any callers in dqct-core.js and dqct-ui.js that reference
  window.DQCTXxx to use the imported name instead

## Output order
Produce files in this sequence so dependencies are always written before their consumers:
  1.  styles/tokens.css
  2.  styles/base.css
  3.  styles/layout.css
  4.  styles/components.css
  5.  styles/views.css
  6.  styles/mobile.css
  7.  src/router.js
  8.  src/shared/parser.js           ← convert IIFE → ES module
  9.  src/shared/appState.js         ← convert IIFE → ES module
  10. src/shared/exports.js          ← convert IIFE → ES module
  11. src/modules/validation/profiles.js   ← convert IIFE → ES module
  12. src/modules/validation/engine.js     ← convert IIFE → ES module
  13. src/modules/validation/fingerprint.js ← convert IIFE → ES module
  14. src/modules/diff/engine.js     ← convert IIFE → ES module
  15. src/modules/diff/ui.js         ← convert IIFE → ES module
  16. src/modules/profiler/engine.js ← convert IIFE → ES module
  17. src/ui/table.js                ← convert IIFE → ES module
  18. src/ui/toasts.js               ← convert IIFE → ES module
  19. src/ui/jsonViewer.js           ← convert IIFE → ES module
  20. src/ui/sidebar.js              ← new file
  21. src/main.js                    ← new file, imports all of the above
  22. index.html                     ← last, after all dependencies exist

No frameworks. No bundlers. No TypeScript. Vanilla ES modules and vanilla CSS only.