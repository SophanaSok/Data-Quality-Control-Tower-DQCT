# DQCT — UX Redesign Specification
## Data Quality Control Tower | Dashboard & Validate Flow
**Version 1.1 — May 2026 (Updated with phase clarifications and UX improvements)**

---

## Executive Summary

The DQCT app has all the right features. The usability problem is not missing functionality — it is simultaneous exposure. Dashboard, Validate, Diff, profile management, rules, drift, history, and exports all appear at peer-level priority. This spec restructures the information architecture into a clear launch-to-result path without removing any existing capability. Every feature stays; the timing of its appearance changes.

---

## Screen-by-Screen Information Architecture

### Current IA
```
Top Nav
├── Dashboard         (tiles + recent runs + last run summary — all visible at once)
├── Validate          (upload + profile + rules + drift + history + issue builder — all visible at once)
├── Diff              (peer-level to Dashboard)
├── Reports           (peer-level to Dashboard)
└── Settings          (peer-level to Dashboard)
```

### Recommended IA
```
Top Nav
├── Dashboard         (launch/resume surface only)
├── Validate          (primary workbench — phased reveal)
├── Diff              (separate workflow — not a Dashboard peer)
└── [⚙ icon]          (settings — icon button, top-right corner; badge if custom settings active)

Dashboard
├── Resume card       (primary action — "Continue last run", visible only if history exists)
├── Start new card    (primary action — always visible when no active run)
├── Quick-entry tiles (secondary — "New Validation", "Run Diff")
└── Recent Runs       (tertiary — collapsed by default, expanded if history exists)

Validate (phased)
├── Phase 1: Idle     (Upload + Profile selection only)
├── Phase 2: Loaded   (Run button unlocks; Advanced Options accordion available)
├── Phase 2.5: Batch Suggestion (Profile suggester modal, if batch upload triggered auto-suggest)
└── Phase 3: Complete (Results + Export prominently surfaced, history auto-appended)

Profiles            (accessible from Phase 2 > Advanced Options or Phase 3)
Issue Builder       (accessible from Phase 3 only; flag issues from results)
Diff                (dedicated workflow — entry from Dashboard tile or top nav)
Reports             (dedicated output — entry from post-run prompt or nav)
```

---

## Dashboard Redesign

### Before Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard] [Validate] [Diff] [Reports] [Settings]  ← nav  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Run Diff    │  │ Run Valid.  │  │ View Reports│        │
│  │   tile      │  │   tile      │  │   tile      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  Last Run Summary ──────────────────────────────────────── │
│  (summary card)                                             │
│                                                             │
│  Recent Runs ───────────────────────────────────────────── │
│  | Run ID | Date | Issues | Status |                        │
│  | ...    | ...  | ...    | ...    |                        │
│  | ...    | ...  | ...    | ...    |                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Problems:
- Three tiles of equal weight with no primary action
- Last run summary and recent runs compete for attention
- No clear "you are here" signal or recommended next step
- Settings at top-nav level adds clutter
```

### After Layout (When history exists)
```
┌─────────────────────────────────────────────────────────────┐
│  [Dashboard] [Validate] [Diff]                       [⚙]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ▶  Continue: run_2025-05-17  ·  3 issues unresolved  │  │
│  │     Customers_Q2.json — Profile: default               │  │
│  │                              [ Resume Validation →]   │  │
│  └───────────────────────────────────────────────────────┘  │
│  (^ primary card — full-width, surface-2 bg, shadow-md)     │
│                                                             │
│  ┌────────────────────────┐  ┌────────────────────────┐    │
│  │  + New Validation      │  │  ⇄ Run Diff            │    │
│  └────────────────────────┘  └────────────────────────┘    │
│  (^ secondary tiles — 50/50, subdued compared to primary)   │
│                                                             │
│  ▼ Recent Runs ────────────────────────────────────────     │
│  (expanded by default; collapses if user clicks)           │
│  | Run ID | Date | Issues | Status |  [Resume]             │
│  | ...    | ...  | ...    | ...    |  [Resume]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Changes:
+ Resume card is dominant and contextual (file name + issue count)
+ New Validation and Diff are equal secondary tiles
+ Recent Runs defaults to expanded (since history exists); uses <details> for collapse
+ Settings becomes a top-right icon with badge if custom defaults are active
```

### After Layout (When no history exists)
```
┌───────────────────────────────────────────────────────────┐
│  No validations yet.                                      │
│  Upload a file to run your first check.                  │
│                              [ Start Validation →]        │
└───────────────────────────────────────────────────────────┘

+ Recent Runs section is hidden entirely (no table, no label)
+ Resume card is replaced by empty state card
+ New Validation tile remains visible as secondary action
```

---

## Validate Tab Redesign — Phased Reveal

### Before Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Upload Zone  ──────────────────────────────────────────── │
│  Profile Selector  ──────────────────────────────────────  │
│  Run Validation  [button]                                   │
│  ─────────────────────────────────────────────────────────  │
│  Rules Editor  ─────────────────────────────────────────── │
│  (full panel visible)                                       │
│  ─────────────────────────────────────────────────────────  │
│  Drift Settings  ───────────────────────────────────────── │
│  (full panel visible)                                       │
│  ─────────────────────────────────────────────────────────  │
│  Run History  ──────────────────────────────────────────── │
│  (table visible)                                            │
│  ─────────────────────────────────────────────────────────  │
│  Issue Builder  ────────────────────────────────────────── │
│  (full panel visible)                                       │
└─────────────────────────────────────────────────────────────┘

Problems:
- Upload and Run button are visually equivalent to Rules and Drift
- User must scan entire page before understanding what to do first
- Rules, Drift, Issue Builder, and Profile Management are "always on"
- No visual sequence — every section looks like an independent app
```

### After: Phase 1 — Idle (no file loaded)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  STEP 1 ─── Upload & Profile Selection ────────────────── │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │         ↑  Drop JSON files here or click to browse   │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│  Profile:  [Default ▾]                                      │
│                                                             │
│  [ Advanced Options ▾ ]  ← collapsed (empty in Phase 1)     │
│                                                             │
│  [ Upload a file to continue ]  ← disabled, greyed out      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  (Rules, Drift, History, Issue Builder, Profile Management  │
│   are NOT rendered in Phase 1)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

State trigger: state.files.length === 0
Visibility:
  - Upload zone: visible
  - Profile selector: visible
  - Advanced Options accordion: hidden (collapsed, no content)
  - Run button: disabled, shows placeholder text
  - Rules panel: not rendered
  - Drift panel: not rendered
  - Issue Builder: not rendered
  - Profile Management: not rendered
```

### After: Phase 2 — File Loaded (pre-run)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  STEP 1 ─── Upload & Profile Selection ────────────────── │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ✓ Customers_Q2.json  ·  2.4 MB  ·  [× Remove]       │  │
│  └───────────────────────────────────────────────────────┘  │
│  Profile:  [Strict ▾]                                       │
│                                                             │
│  [ ▼ Advanced Options ]  ← can expand; shows Rules + Drift  │
│                                                             │
│  [ ▶ Run Validation ]  ← enabled, primary accent color     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Expandable details: Advanced Options accordion contains:
  - Validation Rules (Advanced)
  - Drift Detection (Advanced)
  - Profile Management (Clone, Import Schema, Suggest from Batch)

State trigger: state.files.length > 0 && state.results.length === 0
Visibility:
  - Upload zone: visible (with file list)
  - Profile selector: visible
  - Advanced Options accordion: visible, collapsed by default
    - Rules panel: inside accordion
    - Drift panel: inside accordion
    - Profile Management: inside accordion
  - Run button: enabled
  - Issue Builder: not rendered
  - Run History: not rendered
```

#### Phase 2.5 — Profile Suggestion (if batch upload triggered auto-suggest)
```
Phase 2 → Profile Suggester Modal Appears:
  1. User batch-uploads files (e.g., 5 JSON samples)
  2. App infers suggested profile (field stats, rule suggestions)
  3. Modal shows: "Suggested Profile: [name]" with rules preview
  4. User actions:
     a) Accept → Load suggested profile, auto-expand Advanced Options
     b) Reject → Dismiss modal, stay in Phase 2 with current profile

State flow:
  - Phase 2 (file loaded) → triggered by batch upload action
  - Show profile suggester modal (overlay)
  - On accept: load suggested profile into state, expand Advanced Options
  - On reject: dismiss modal, stay in Phase 2
  - Profile suggester modal closes either way; proceed to Phase 2 ready to run

Implementation note: Reuse existing buildImportedProfile() and profile suggestion logic.
```

### After: Phase 3 — Run Complete (post-validation)
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✓ STEP 1 ─── Upload & Profile Selection ─────────────── │
│  (collapsed, showing checkmark)                             │
│                                                             │
│  STEP 2 ─── Results ────────────────────────────────────── │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  3 issues found  ·  1 error  ·  2 warnings            │  │
│  │  ─────────────────────────────────────────────────    │  │
│  │  [field]  missing_required_field  →  row 14           │  │
│  │           [Edit rule]  [Details ↓]                    │  │
│  │  [field]  type_mismatch           →  row 22, 31       │  │
│  │           [Edit rule]  [Details ↓]                    │  │
│  │  [field]  enum_violation          →  row 8            │  │
│  │           [Edit rule]  [Details ↓]                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [ ↓ Export Report ]    [ ⚑ Flag Issues ]                  │
│                                                             │
│  [ Compare with previous run → ]                            │
│  (suggests Diff workflow)                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Run saved to history.  [ ▼ View History ▾ ]               │
│  (history uses <details> for expansion)                     │
│                                                             │
│  [ ↺ Start Fresh ]  ← returns to Phase 1, clears results   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

State trigger: state.results.length > 0
Visibility:
  - Step 1 (upload): collapsed, shows checkmark + filename
  - Step 2 (results): visible and scrolled into view
  - Issue Builder panel: visible (as "Flag Issues" section)
  - Run History: visible in <details> accordion (expanded by default)
  - Advanced Options: hidden during Phase 3 (can be re-opened if user wants to
                      adjust rules and re-run)
  - Export options: prominently shown
  - Next-action prompts: "Compare with previous run?", "Start Fresh?"

Inline edit links:
  - Each result row has "[Edit rule]" link
  - Clicking expands Advanced Options → scrolls to matching rule → focuses it
  - Shows prompt: "Update this rule and re-run validation?"
```

---

## Copy Changes — Before/After

Labeling is part of information architecture. These changes make the sequence unmistakable.

| Location | Current copy | Recommended copy | Why |
|----------|--------------|---|---|
| Dashboard tile (no history) | N/A | "Start New Validation" | Action-oriented; signals intent |
| Dashboard resume tile | "Last Run Summary" | "Continue: [filename] · [issues] unresolved" | Shows context, not just metadata |
| Dashboard secondary tile | "Run Validation" | "New Validation" | Distinguishes from resume action |
| Validate tab label | "Validate" | "Validate" (keep) | Already clear |
| Run button (file loaded) | "Run Validation" | "▶ Run Validation" | Arrow reinforces it's a trigger |
| Run button (no file, Phase 1) | "Run Validation" (enabled) | "Upload a file to continue" (disabled) | Tells user what's missing |
| Rules panel header (Phase 2+) | "Rules" | "Validation Rules (Advanced)" | Signals optional; reduces intimidation |
| Drift panel header (Phase 2+) | "Drift Detection" | "Drift Detection (Advanced)" | Same — recategorizes as optional |
| Advanced Options | "Advanced Options" | "Advanced Options" (keep) | Generic but acceptable |
| Profile Management section | "Profile management" | Part of "Advanced Options" | Moved into accordion |
| Post-run status | (none / generic) | "Run complete — 3 issues found" | Explicit completion signal |
| Result row action | (none) | "[Edit rule]" link | Enables inline editing |
| Export button | "Export" | "↓ Export Report" | Names the artifact; icon reinforces download |
| Issue builder header | "Issue Builder" | "⚑ Flag Issues" | More action-oriented; clearer purpose |
| Settings nav item | "Settings" (top nav tab) | ⚙ icon, top-right corner (with badge if custom) | Demotes from peer-level nav |
| Empty recent runs | (blank table) | Hidden section | Cleaner dashboard when no history |
| Recent runs header | "Recent Runs" | "▼ Recent Runs" (inside `<details>`) | Uses standard collapse affordance |
| Dashboard empty state | N/A | "No validations yet. Upload a file to run your first check." | Explains empty state |
| Start Fresh button | N/A | "↺ Start Fresh" | Explicit reset action; arrow = return to start |
| Diff prompt | N/A | "Compare this run against a previous validation? [Run Diff →]" | Surfaces feature post-run |

---

## Implementation Architecture

### State-Based Phase Toggling

The phased Validate reveal requires three CSS state classes applied to the validate container. The existing dqct-ui.js architecture handles tab switching — the same pattern applies here.

```css
.validate-phase-idle     → shows only upload zone + profile + disabled run button
.validate-phase-loaded   → enables run button; shows Advanced Options accordion
.validate-phase-complete → collapses Step 1; shows results, export, and history
```

**Trigger class switches on:**
- `fileInputChange` or `drop` event → switch to `.validate-phase-loaded`
- File removal / "Clear files" button → switch back to `.validate-phase-idle`
- Successful `validation complete` event → switch to `.validate-phase-complete`
- "Start Fresh" button → switch back to `.validate-phase-idle` and clear results

**Implementation in dqct-ui.js:**
```javascript
function updatePhase() {
  const validateContainer = document.querySelector('[data-tab-panel="validate"]');
  if (!validateContainer) return;
  
  // Remove all phase classes
  validateContainer.classList.remove('validate-phase-idle', 'validate-phase-loaded', 'validate-phase-complete');
  
  // Add appropriate phase class
  if (state.results.length > 0) {
    validateContainer.classList.add('validate-phase-complete');
  } else if (state.files.length > 0) {
    validateContainer.classList.add('validate-phase-loaded');
  } else {
    validateContainer.classList.add('validate-phase-idle');
  }
}

// Call updatePhase() in render() function and on file operations
```

### Dashboard Primary Card Visibility Logic

```javascript
if (DQCTAppState.getRecentRuns().length === 0) {
  → show EmptyState welcome card
} else {
  → show ResumeCard (last run filename + issue count + resume button)
  → show Recent Runs in expanded <details> accordion
}
```

The ResumeCard uses existing `reopenTab` logic — no new data-fetching required.

### Recent Runs Section Visibility

```html
<details class="recent-runs-details" open>
  <summary>▼ Recent Runs</summary>
  <div id="recentRunsTable" class="table-wrap">
    <!-- recent runs table -->
  </div>
</details>
```

**Logic:**
- If no history: entire `<details>` section is hidden (CSS `display: none`)
- If history exists: section is visible; `<details>` is open by default
- User can collapse Recent Runs by clicking summary
- State persists via JS (no localStorage needed for this UX)

### Advanced Options Accordion

Rules and Drift Detection move inside a `<details>` element. Profile Management also moves here.

```html
<details class="advanced-options" id="advancedOptionsAccordion">
  <summary>▼ Advanced Options</summary>
  
  <div class="accordion-content">
    <div class="section">
      <!-- Validation Rules (Advanced) -->
    </div>
    
    <div class="section">
      <!-- Drift Detection (Advanced) -->
    </div>
    
    <div class="section">
      <!-- Profile Management -->
    </div>
  </div>
</details>
```

**Visibility logic (Phase 2+):**
- Accordion is rendered and visible
- Starts collapsed (JS: `details.open = false`)
- User can toggle open/closed by clicking `<summary>`

**Visibility logic (Phase 1):**
- Accordion is not rendered (JS guard: `if (state.files.length === 0) return;`)

**On inline rule edit (Phase 3):**
- "[Edit rule]" link in result row triggers:
  - Expand Advanced Options accordion: `document.querySelector('#advancedOptionsAccordion').open = true;`
  - Scroll to rule: `document.querySelector(`[data-rule-id="${ruleId}"]`).scrollIntoView({ behavior: 'smooth' });`
  - Focus rule input: `ruleElement.querySelector('input').focus();`

### Scroll-to-Results on Completion

After validation completes, automatically scroll results into view:

```javascript
// In validateRun() callback or completion toast handler:
setTimeout(() => {
  document.querySelector('.validate-results').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}, 300);  // Slight delay for DOM to settle
```

### Settings Icon Button

Replace top-nav Settings tab with icon button in top-right corner:

```html
<div class="top-nav-settings-icon">
  <button id="settingsIconButton" class="icon-button" aria-label="Settings">
    <span class="icon">⚙</span>
    <span class="badge" id="settingsBadge"></span>
  </button>
  <div id="settingsDropdown" class="dropdown-menu hidden">
    <!-- settings options -->
  </div>
</div>
```

**Badge logic:**
- Show badge if `DQCTAppState.getSettings()` has custom (non-default) values
- Badge color: warning/accent
- Tooltip: "Custom settings applied"

**Dropdown logic:**
- Click icon → toggle dropdown visibility
- Dropdown closes on blur or click outside
- Reuse existing Settings UI form (just moved into dropdown)

---

## Recommended Build Order

1. **Add phase detection CSS classes and visibility rules** (30 min)
   - `.validate-phase-idle/loaded/complete` classes
   - CSS rules for conditional display
   - No logic changes yet

2. **Wire phase transitions to existing file input + validation events** (15 min)
   - Hook into `fileInputChange` → call `updatePhase()`
   - Hook into validation complete → call `updatePhase()`
   - Hook into clear files → call `updatePhase()`

3. **Hide Rules/Drift/Issue Builder in Phase 1** (20 min)
   - Add guards to `renderRules()`, `renderDriftPanel()`, `renderIssueBuilder()`
   - Check `state.files.length > 0` before rendering

4. **Wrap Rules + Drift + Profile Management into Advanced Options accordion** (45 min)
   - Update dqct.html structure (add `<details>` wrapper)
   - Style `.advanced-options` summary as secondary button
   - No JS changes to rules/drift rendering logic

5. **Restructure Dashboard to show Resume card** (45 min)
   - Update Dashboard tile hierarchy (CSS: primary/secondary)
   - Add Resume card template using last run data
   - Add empty state card
   - Hide Recent Runs section when no history

6. **Make Recent Runs collapsible** (20 min)
   - Convert Recent Runs table into `<details>` element
   - Style summary as section header
   - Auto-open when history exists

7. **Move Settings to icon button** (30 min)
   - Add settings icon button to top-right corner
   - Create dropdown menu wrapper
   - Move Settings form into dropdown
   - Hide Settings nav tab

8. **Add settings badge logic** (15 min)
   - Check for custom settings on app load
   - Show/hide badge in icon button
   - Update badge on settings change

9. **Add post-run scroll + next-action prompts** (20 min)
   - Scroll to results on validation complete
   - Add "Compare with previous run?" prompt in Phase 3
   - Add "Start Fresh" button

10. **Add inline "Edit rule" links in result rows** (30 min)
    - Add link template to result items
    - Wire to open Advanced Options → scroll to rule → focus

11. **Integrate profile suggester into Phase 2.5** (25 min)
    - Detect batch upload trigger
    - Show suggester modal in Phase 2
    - On accept: load suggested profile, expand Advanced Options
    - On reject: dismiss, stay in Phase 2

12. **Copy changes throughout UI** (60 min)
    - Update button labels
    - Update section headers
    - Update disabled state messages
    - Update empty state copy

13. **Diff discoverability** (15 min)
    - Add post-run prompt linking to Diff workflow
    - Update Diff tab tooltip

14. **Test responsive behavior** (30 min)
    - Mobile: Keep Phase 1 visible, sticky results card
    - Tablet: Standard layout
    - Desktop: Standard layout

---

## What Stays the Same

Every feature in the current app remains accessible:

- **Rules editor** — inside Advanced Options accordion (one click away in Phase 2+)
- **Drift detection** — inside Advanced Options accordion (one click away in Phase 2+)
- **Profile management** — inside Advanced Options accordion (one click away in Phase 2+)
- **Issue builder** — available in Phase 3 / Results view
- **Run History** — visible in Phase 3; also accessible from Dashboard Recent Runs
- **Reports tab** — accessible from top nav and from post-run prompt
- **Diff** — accessible from Dashboard tile, top nav, and post-run "Compare" prompt
- **Settings** — accessible from icon button, top-right corner

No functionality is removed. The only change is when and how prominently each piece appears relative to the user's current task.

---

## Key Improvements Over Previous Spec

1. **Profile Suggester Integration** — Now explicitly Phase 2.5, clarifying the flow after batch upload
2. **Issue Builder Clarity** — Now explicitly Phase 3 only, removing ambiguity
3. **Profile Management Placement** — Moved to Advanced Options, decluttering Phase 1
4. **Inline Rule Editing** — Addresses friction: users can now edit rules post-run without deep navigation
5. **Recent Runs Visibility** — Clearer logic: hidden when empty, collapsed/expanded `<details>` when populated
6. **Settings Discoverability** — Badge indicator helps users notice custom settings
7. **Diff Discovery** — Post-run prompt surfaces the feature after validation
8. **Advanced Options Label** — Could be enhanced to "Validation Rules & Drift Detection" for clarity (optional refinement)
9. **Responsive Considerations** — Mobile strategy included for Phase 3 layout
10. **Start Fresh Button** — Explicit reset action at Phase 3 helps users restart without confusion

---

## Success Metrics

Post-implementation, measure:

1. **Time to first validation run** — Should decrease (clearer phase 1 path)
2. **Profile suggestion acceptance rate** — Should increase (better integration)
3. **Rules editing frequency post-run** — Should increase (inline edit links make it easier)
4. **Settings customization rate** — Should increase (badge + icon makes it discoverable)
5. **Diff workflow usage** — Should increase (post-run prompt surfaces feature)
6. **User satisfaction on first run** — Survey: "Was it clear what to do next?"

---

**End of Spec v1.1**
