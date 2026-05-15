# DQCT — Data Quality Control Tower

## Project
Single-file HTML/CSS/JS web app. No build tools, no frameworks, no npm.
All logic runs in the browser. CDN libraries only (Day.js, Lucide icons).

## Stack
- Vanilla JS (ES6 modules)
- CSS custom properties (design tokens, light/dark mode)
- Day.js + customParseFormat for date validation
- IndexedDB for run history
- Clipboard API for Trello export

## Data format
- Input: JSON files with a root `Export` array of bid records
- Document fields (BidDocuments, AddendumDocuments, BidTabulations, AwardDocuments)
  are serialized JSON strings — parse silently, do not flag the string format itself
- Built-in default profile is defined in core code; profile edits are persisted in browser localStorage

## Core rules (always required)
The following fields must be non-empty strings on every record: AgentName, AgentID, LegacyAgentID, ResourceURL.

## Build in phases
Phase 1: upload + rule engine + results + Trello export
Phase 2: run history + schema drift + anomaly detection + dashboard
Phase 3: profile management UI + import schema + sparklines

## CSS Standards (apply to every CSS change in this session)

### File organization
- All new mobile/responsive overrides go in a single labeled block at
  the BOTTOM of dqct.css, after all existing rules:

    /* ============================================================
       RESPONSIVE — MOBILE OVERRIDES (max-width: 768px)
       All mobile fixes are grouped here for easy review and rollback.
       Do NOT scatter @media rules inline with component styles.
    ============================================================ */
    @media (max-width: 768px) {
      /* fixes go here */
    }

- If a second breakpoint is needed (e.g. max-width: 480px for very small
  screens), add it as a second labeled block BELOW the 768px block:

    /* ============================================================
       RESPONSIVE — SMALL SCREEN OVERRIDES (max-width: 480px)
    ============================================================ */
    @media (max-width: 480px) {
      /* fixes go here */
    }

- Do NOT add @media rules anywhere else in the file
- Do NOT insert mobile overrides inline next to the component they target
- Do NOT split mobile fixes across multiple locations in the file

### Selectors
- Use the lowest specificity selector that works
- Do NOT use !important unless overriding a third-party style
- Do NOT add inline style="" attributes in JS for layout/spacing — use
  CSS classes only
- Do NOT create new utility classes if an existing class already covers
  the need — check the existing CSS first

### Spacing and sizing
- All spacing values must use existing CSS variables: var(--space-1) through var(--space-32).  Never use raw px or rem values for margin/padding if a token exists
- Touch targets: min-height: 44px and min-width: 44px on all
  interactive elements inside the mobile block
- Font sizes: never below 1rem (16px) on inputs, selects, or textareas
  in any breakpoint — add this to the mobile block if not already set:
    input, select, textarea { font-size: 1rem; }

### Colors and theming
- All color values must use existing CSS variables: var(--color-*)
- Do NOT hardcode hex, rgb, or oklch values in new rules
- All new rules must work in both light and dark mode — test against
  both [data-theme="light"] and [data-theme="dark"] surfaces

### Existing layout preservation
- All new rules are additive at the mobile breakpoint only
- Do NOT change desktop layout (anything above 768px)
- If a fix requires changing a desktop rule, flag it for review first
  and do not apply it without approval

### Naming
- New class names must follow the existing BEM-like pattern in the file
  (e.g. .dqct-diff-field-table__row, .record-modal-actions)
- Do NOT introduce Tailwind, Bootstrap, or other utility-class naming
  conventions — this codebase uses semantic class names only
- New classes for mobile-specific wrappers should use the suffix -mobile
  or -wrapper where appropriate (e.g. .table-scroll-wrapper)

### After applying
- Confirm all new @media rules are in the labeled block at the bottom
- Confirm no @media rules were added inline in the file
- Confirm no hardcoded color or spacing values were introduced
- Run a syntax check on dqct.css