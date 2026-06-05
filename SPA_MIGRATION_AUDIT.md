# SPA migration audit

Audit date: 2026-06-05

Canonical URL: `https://sophanasok.github.io/Data-Quality-Control-Tower-DQCT/`

Deprecated URL: `https://sophanasok.github.io/Data-Quality-Control-Tower-DQCT/dqct/dqct.html`

## Applied cleanup in this pass

| File/line | Issue | Fix |
| --- | --- | --- |
| `dqct/dqct.html:6` | Legacy MPA URL could still load old markup and scripts. | Added a zero-second meta refresh and `window.location.replace()` to the canonical SPA root. |
| `index.html:8` | SPA entry had no canonical URL metadata. | Added `<link rel="canonical">` for the GitHub Pages SPA root. |
| `404.html:1` | GitHub Pages had no unknown-route fallback. | Added a static 404 page that redirects to the project SPA root. |
| `README.md:32` | Documentation still advertised the deprecated page as a direct app entry. | Updated quick-start docs to make the SPA root canonical and mark the old page as a redirect. |
| `src/main.js:708` | Theme toggle was bound once by `initSidebar()` and again in `main.js`, causing a double toggle. | Removed the duplicate listener and unused `sidebarControls` assignment. |
| `src/ui/toasts.js:14` and `styles/components.css:236` | Toast JS emitted `dqct-toast` classes that the SPA stylesheet did not style. | Added matching `dqct-toast` styles and hide transition. |
| `src/modules/diff/ui.js:738` and `src/modules/diff/ui.js:746` | Debug `console.log` / `console.debug` calls remained in migrated UI code. | Removed the debug-only logs; these branches now perform navigation without console noise. |

## Dead code and migration findings

| Priority | File/line | Finding | Recommended fix or removal |
| --- | --- | --- | --- |
| P0 | `dqct/dqct.html:6` | The legacy URL now redirects, but the file still contains the full old MPA DOM after the head. | Keep the redirect for GitHub Pages now; delete the body and legacy subtree only after confirming no users depend on old assets. |
| P0 | `dqct/dqct.html:468` | The legacy page still contains classic script tags for ESM files under `src/`, which would throw `export` syntax errors if the redirect failed. | Leave the redirect as the guard; remove the legacy scripts when retiring `dqct/`. |
| P1 | `dqct/scripts/core/dqct-core.js:56` and `dqct/scripts/core/dqct-ui.js:11` | Legacy core/UI scripts depend on shared `const`/`let` state across separate script files; this is not valid module structure. | Do not invest in fixing the old MPA; port any missing behavior into `src/` modules and delete these scripts. |
| P1 | `src/main.js:60` | SPA validation uses six inline default rules while README and legacy code describe a 37-rule Standard Profile. | Move the full default profile into `src/modules/validation/profiles.js` and build SPA validation rules from the active profile. |
| P1 | `src/main.js:483` | `attachCompatibilityNamespaces()` still publishes `globalThis.DQCT*` shims for legacy-style globals. | Remove the shim after direct ESM imports replace global lookups in validation/profile modules. |
| P1 | `src/modules/validation/engine.js:103` and `src/modules/validation/engine.js:479` | Validation engine reads `globalThis.DQCTFingerprint` instead of importing fingerprint helpers. | Import fingerprint functions directly to finish the ESM migration. |
| P1 | `src/modules/validation/profiles.js:57` | Profile storage calls `globalThis.DQCTToasts` for quota warnings. | Import toast helpers directly or return warning state to the caller. |
| P1 | `src/modules/diff/ui.js:2046` | `initialize()` for the rich diff UI is exported but not called by the SPA. | Either mount the rich diff UI in `#view-diff` or delete the module and keep the simpler SPA diff. |
| P2 | `src/main.js:69` | `createDownloadHelper()` is defined but never called; exports use `Exports.downloadJson()`. | Remove the helper. |
| P2 | `src/main.js:416` | `validationState.summaries` is built but not rendered, except for a count in history. | Render record-level summaries or stop computing them until the UI needs them. |
| P2 | `src/main.js:457` | Diff duplicates are computed and stored but not displayed or exported from the SPA. | Add duplicate sections/export buttons or remove the computation. |
| P2 | `src/main.js:720` | `renderValidationOutput()` runs on boot and replaces the intended empty preview with an empty table. | Render the validation results area only after a run has completed. |
| P2 | `src/shared/exports.js:7` | Static export scan found `buildExportBundle()` is exported but unused. | Wire it to export-bundle UI or remove the export. |
| P2 | `src/modules/validation/fingerprint.js:157` and `src/modules/validation/fingerprint.js:225` | Static export scan found async fingerprint and near-duplicate exports unused. | Use these in validation summaries or narrow the public export list. |
| P2 | `src/modules/profiler/engine.js:1` | Profiler exports are not consumed by the SPA. | Add a schema/profile suggestion flow or remove the import surface. |
| P2 | `src/ui/jsonViewer.js:31` | Static export scan found JSON highlight helpers exported without current callers. | Use them for field highlighting or keep them private. |
| P2 | `styles/views.css:47` | `.profile-list`, `.issue-feed`, and `.notice-list` are not used by `index.html`; they are legacy/unfinished feature styles. | Remove after profile/issues UI decisions, or port the corresponding SPA markup. |
| P2 | `styles/views.css:68` | `.dashboard-panel`, `.validate-panel`, `.diff-panel`, and `.settings-panel` do not match root SPA view containers. | Retarget to `.app-view` / `#view-*` or delete unused panel-specific rules. |
| P2 | `styles/views.css:75` | `.code-block` and `.json-preview` are not used by the SPA. | Remove or wire into the JSON viewer. |
| P3 | `index.html:50` | `data-route` attributes on nav links are unused; routing reads `href`. | Remove the attributes or update the router to prefer them. |
| P3 | `src/router.js:36` | Inactive nav links get `aria-current="false"`, which is less correct than omitting the attribute. | Remove `aria-current` for inactive links. |
| P3 | `src/shared/appState.js:119` | Static export scan found `applyTheme()` and `normalizeSettings()` exported without importers. | Keep internal unless a caller needs them. |

## Structural and configuration findings

| File/line | Finding | Recommended fix |
| --- | --- | --- |
| `README.md:33` | Remaining legacy URL mention is intentional documentation of the redirect. | Keep until the redirect shim is no longer needed. |
| `AGENTS.md:35` | Agent instructions still document the legacy local URL as an alternate entry. | Update to SPA-only once this branch lands and future agents should not open the legacy route. |
| `CHANGELOG.md:18` | Changelog references old `dqct/dqct.html` cleanup work. | Keep as historical release text; add a new unreleased entry if this repo maintains changelog updates. |
| `DQCT_UX_REDESIGN_SPEC_v1.1.md:494` | UX spec still references direct `dqct.html` structure changes. | Retarget future UX specs to `index.html` view IDs and `src/` modules. |
| `src/main.js:741` and `src/router.js:68` | `window.location.hash` usage is hash-based SPA routing, not a legacy URL reference. | No change required. |
| `package.json` | No package file exists. | No legacy build entry to update. |
| `.github/workflows/**` | No workflow files exist. | No CI/deploy legacy path to update. |
| `src/**/*.js` imports | Static import scan found no broken relative imports. | No action required. |

## Prioritized UI/UX recommendations

| Priority | Area | Current problem | Recommended change |
| --- | --- | --- | --- |
| P0 | Validation view | The screen still says it is scaffolded and exposes only a file picker plus a basic table. | Restore a production validation flow with profile selection, rule coverage, parse status, run summary, and issue grouping so data quality triage starts from the highest-risk defects. |
| P0 | Dashboard metrics | Pass rate can be skewed by diff runs because it counts runs without `summary.failures` as clean. | Calculate quality KPIs from validation runs only; show separate diff activity metrics. |
| P0 | Feedback/status | Long file parsing and validation runs only update text after actions start; failures depend on toast visibility. | Add inline loading states, disabled buttons, and persistent error panels for parse/validation failures. |
| P1 | Results tables | Tables support sorting and pagination through `Table.create()`, but there are no filter controls for severity, file, field, or rule. | Add column filters and severity chips so analysts can isolate high-severity failures quickly. |
| P1 | Recent runs | Summary is rendered as raw JSON and the Open action only changes routes. | Render readable columns and persist enough run context to restore the selected run. |
| P1 | Diff workflow | Duplicate detection is computed but not surfaced. | Add duplicate summary cards and export controls for baseline, comparison, and cross-dataset duplicates. |
| P1 | Navigation/routing | Hash links are shareable, but route state does not include selected run, filters, or table page. | Store meaningful UI state in hash/query parameters or local route state for deep links. |
| P2 | Mobile layout | Sidebar opens on mobile but lacks a backdrop and Escape/click-outside dismissal. | Add a drawer backdrop and keyboard dismissal to make navigation feel native on small screens. |
| P2 | Accessibility | Record modal supports Escape but lacks a focus trap in the SPA implementation. | Port the legacy focus-trap behavior and verify tab order in modals and tables. |
| P2 | Status color contrast | Pass/fail/warning states rely heavily on color-coded badges. | Pair colors with text/icons and verify contrast for high, medium, low, good, warning, and danger badges. |
| P2 | Performance | JSZip loads on every page load even though export bundle UI is not wired in the SPA. | Lazy-load JSZip only when a ZIP export action is invoked. |
| P3 | Information hierarchy | Dashboard hero copy takes more visual weight than current quality risk. | Put open issues, high-severity failures, failed files, and latest validation status above descriptive copy. |
