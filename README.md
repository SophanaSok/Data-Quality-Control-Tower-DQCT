# Data Quality Control Tower (DQCT)

A browser-based validation tool for scraped government IT and software bid data. Upload JSON files, run automated quality checks against configurable rule profiles, and generate Trello-ready defect reports—all in seconds.

**Current Version:** 2.1 (Phase 1 & 2 Complete)  
**Status:** Production Ready  
**Last Updated:** April 28, 2026

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture (Phase 1 Refactor Foundation)](#architecture-phase-1-refactor-foundation)
3. [Core Concepts](#core-concepts)
4. [Workflow: From Upload to Export](#workflow-from-upload-to-export)
5. [Managing Profiles & Rules](#managing-profiles--rules)
6. [Understanding Results](#understanding-results)
7. [Dashboard & History](#dashboard--history)
8. [Interpreting Anomalies](#interpreting-anomalies)
9. [Tips & Best Practices](#tips--best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### 1. Open the App (GitHub Pages)
- The app is published via GitHub Pages for this repository. Open the site in your browser:
   - Root: https://SophanaSok.github.io/Data-Quality-Control-Tower-DQCT
   - Direct app page: https://SophanaSok.github.io/Data-Quality-Control-Tower-DQCT/dqct/dqct.html
- To publish via GitHub Pages: go to your repository Settings → Pages → Build and deployment, select branch `main` and folder `/ (root)`, then save. The site will publish within a few minutes.
- If you prefer a local preview, serve the repo root (optional):
   - Python 3: `python3 -m http.server 8000`
   - or Node: `npx http-server -p 8000`
   Then open `http://localhost:8000/` or `http://localhost:8000/dqct/dqct.html` in your browser.

### 2. Load Sample Data (Optional)
- Click **"Load sample data"** to load 2 sample Ohio Buys bid records
- Perfect for learning the workflow without uploading your own files

### 3. Run Validation
- Click **"Run validation"** to validate the loaded data against the default Ohio Buys profile
- The button changes to a running state, the top status banner explains what is happening, and a toast confirms when the run finishes
- Results appear on the **Validation results** panel

### 4. Generate a Trello Ticket
- In the **Issue report builder** section, click **"Copy ticket"** on a grouped issue
- Ticket text is copied to your clipboard—paste directly into Trello

### 5. Download Results
- Click **"Download all issues JSON"** to export all defects as a `.json` file for archival or further analysis

---

## 🧩 Architecture (Phase 1 Refactor Foundation)

DQCT now keeps the same user flows and UI, while loading modular JS files from the repository root `src/` folder:

```text
src/
  modules/
    diff/
      engine.js
      ui.js
    validation/
      engine.js
      profiles.js
  shared/
    parser.js
    exports.js
  ui/
    toasts.js
    table.js
```

### Module responsibilities
- `src/shared/parser.js`: JSON parsing + root-array extraction/normalization.
- `src/shared/exports.js`: Report text + issue export payload/download helpers, including standard Diff export filenames.
- `src/modules/diff/engine.js`: Diff + duplicate detection helpers (`diffRecords`, `findDuplicates`, `buildCleanExport`).
- `src/modules/diff/ui.js`: Minimal Diff tab UI (baseline/comparison upload, key/ignore options, analyze + exports).
- `src/modules/validation/engine.js`: Rule evaluation and per-file validation execution.
- `src/modules/validation/profiles.js`: Profile/UI/run/schema local storage helpers.
- `src/ui/toasts.js`: Minimal toast helper wrapper.
- `src/ui/table.js`: Minimal table rendering helper wrapper.

`dqct/dqct.html` loads these modules before `dqct/scripts/core/dqct-core.js` and `dqct/scripts/core/dqct-ui.js` so behavior remains unchanged while code is now separated by concern.

### Unified top-level tabs
- **Validate** keeps the existing DQCT workflow exactly as before.
- **Diff** adds a minimal baseline-vs-comparison workflow:
  1. Upload baseline + comparison JSON files
  2. Configure unique key + optional ignore fields
  3. Analyze summary counts
  4. Export:
     - `diff_records.json`
     - `duplicates_file1.json`
     - `duplicates_file2.json`
     - `duplicates_cross.json`
     - `changed_and_new.json`

---

## 🧠 Core Concepts

### 1. **Profiles**

A **profile** is a collection of validation rules tailored to a specific data source (e.g., Ohio Buys, a county RFP system, etc.).

- **Default Ohio Buys profile** comes pre-loaded with 33 rules
- Each profile specifies:
  - The root array field (e.g., `Export`)
  - Which rules are active
  - Severity levels and expected field patterns
- Profiles are saved locally in your browser—changes persist across sessions

### 2. **Rules**

A **rule** is a single validation check applied to a field. Examples:

- `ProjectCode` must be required (non-empty)
- `BidStatus` must be one of: `Open for Bidding`, `Closed`, `Cancelled`, `Awarded`
- `BidURL` must match the regex pattern `^https://`
- Each `BidDocuments` object must contain `Title`, `URL`, and `Hash` keys

**Rule Types:**
| Rule Type | What It Checks | Example |
|---|---|---|
| `required` | Field is not empty | `Title` must exist |
| `required_if` | Field is required only if another field matches a condition | `DueDate` required if `BidStatus` = "Open for Bidding" |
| `unique` | Value is unique across all records in the file | No duplicate `ProjectCode` values |
| `regex` | Value matches a pattern | `ProjectCode` matches `^SRC\d{10}$` |
| `enum` | Value is one of a fixed set | `BidStatus` in ["Open", "Closed", "Awarded"] |
| `date_format` | Value is a valid date (any recognized format) | `PublishedDate` is parseable as a date |
| `not_future` | Date is not in the future | `DueDate` is not tomorrow or later |
| `ambiguous_date` | Date parsing is ambiguous (low-severity warning) | `04/05/2026` could be April 5 or May 4 |
| `documents_have_required_keys` | Each document object contains required fields | `BidDocuments[i].Title`, `.URL`, `.Hash` all present |
| `hash_count_matches_documents` | Number of hashes matches number of documents | `BidDocuments.length` = `BidDocumentHashes.length` |
| `no_duplicate_documents` | No document appears twice | No duplicate `(Title, URL)` pairs |

### 3. **Three-Layer Rule Organization**

Rules are grouped into three layers for flexibility:

- **Core** (R01–R04): Always-required fundamental checks (e.g., JSON structure, primary ID exists)
- **Domain** (R05–R24): Specific to a source (e.g., Ohio Buys project code format, document validation)
- **Diagnostic** (R25–R33): Optional deeper checks, disabled by default (e.g., "Description not empty")

---

## 📤 Workflow: From Upload to Export

### Step 1: Upload Files

**Method A: Drag-and-Drop**
1. Into the gray **dropzone** at the top, drag one or more `.json` files
2. Files are parsed instantly

**Method B: File Picker**
1. Click in the dropzone or use the hidden file input
2. Select up to 10 files (50 MB total max per file)

**What Happens:**
- If the JSON is valid and contains a root array (or `{ "Export": [...] }`), the file appears in the **Loaded Files** section
- If JSON parsing fails, the file shows an error badge—fix the JSON and re-upload

---

### Step 2: Review Loaded Data

In the **Loaded Files** panel, you see:
- File name, record count, and file size
- **Ready** badge = valid JSON, ready to validate
- **Error** badge = parse failure with error message

---

### Step 3: Select or Create a Profile

On the right sidebar under **Active Profile**:
1. **Ohio Buys** is pre-selected by default
2. To use a different profile, click the dropdown to select one
3. To create a new profile:
   - Enter a name in **New Profile Name** (e.g., "County RFP Board")
   - Enter the root array field in **New Root Array** (default: `Export`)
   - Click **Clone profile** to create a copy of the active profile, then customize its rules

### Importing a Schema Draft

1. Click **Import schema** in the Profile management panel
2. Select a sample JSON file with either a bare array or an `{ "Export": [...] }` wrapper
3. The app generates a draft profile with inferred `required` and `type` rules
4. Review and edit the draft inline, then click **Save active profile** to keep it

---

### Step 4: Configure Rules (Optional)

**To toggle a rule on/off:**
1. Scroll to the **Rules** panel
2. Find the rule card by rule ID (R01, R05, etc.) or search by field/type
3. Click the **Enabled** checkbox

**To customize a rule:**
1. Click into the rule card fields:
   - **Notes**: Add context (e.g., "Enforced per vendor feedback")
   - **Type**: Change the rule type (if needed)
   - **Severity**: Change to High/Medium/Low
   - **Field**: Specify which field to check
   - **Layer**: Core/Domain/Diagnostic

**To disable rules at runtime (without saving):**
1. In the **Runtime Overrides** field, type rule IDs separated by commas or spaces
   - Example: `R25 R26 R27` disables diagnostic description, bid type, and contract value checks
   - Useful for one-off validation runs

### Action Feedback

The main action buttons now give immediate feedback when clicked:
- The button shows a spinner and a temporary running label while the action is in progress
- A status banner near the top explains what the button is doing
- A toast message confirms the outcome when the action completes
- Buttons reset automatically after the action finishes or if it fails

---

### Step 5: Run validation

1. Click **"Run validation"** button
2. The app validates all loaded files in seconds
3. Results appear on the **Run Results** panel

---

### Step 6: Interpret Results

The **Run Results** section shows:

#### Summary Cards
- **Records loaded**: Total records across all files
- **Files with errors**: Parse failures
- **Active rules**: How many rules are enabled

#### Results Table
A table showing each validation failure:
| Column | What It Shows |
|---|---|
| File | Which file the failure came from |
| Record | Record number (1-indexed) |
| Primary ID | The unique identifier (ProjectCode, Title, etc.) |
| Field | The field that failed validation |
| Rule Type | `required`, `regex`, `enum`, etc. |
| Expected | What the rule expected |
| Actual | What the data contained |
| Severity | High / Medium / Low badge |
| Action | **Ticket** button to generate a defect ticket for that row |

#### Issue Summary (Grouped Issues)
Issues are automatically grouped by (Rule ID, Field, Rule Type). Each group shows:
- **Rule name** (e.g., "ProjectCode failed regex")
- **Severity** and **count** (how many records are affected)
- **Samples**: Up to 5 example records with bad values
- **Preview ticket** button: Toggle a formatted ticket preview
- **Copy ticket** button: Copy the ticket to clipboard

---

### Step 7: Export Results

#### Option A: Copy Individual Tickets
1. In **Issue report builder**, click **"Copy ticket"** on any grouped issue
2. The formatted ticket text is copied to your clipboard:
   ```
   [DEFECT] Ohio Buys — ProjectCode failed regex
   
   Date: 2026-04-28T12:34:56Z
   File: data-20260428.json
   Affected records: 3 / 1,250 (0.24%)
   Rule: regex
   Expected: pattern ^SRC\d{10}$
   Actual examples:
     - Record SRC123: "INVALID-CODE"
     - Record SRC124: "XYZ9999999"
     - Record SRC125: "12345"
   Layer: Domain
   Severity: high
   Rule ID: R07
   ```
3. Paste directly into a Trello card

#### Option B: Download All Issues as JSON
1. Click **"Download all issues JSON"** button
2. A `.json` file downloads with the complete run data:
   - All defects with full details
   - Schema drift information
   - Anomaly warnings
   - Run metadata (date, profile, file count, etc.)
3. File is named: `dqct-issues-ohio-buys-2026-04-28T12-34-56Z.json`

#### Option C: Copy Report
1. Click **"Copy report"** to copy a text summary of all results to clipboard
2. Useful for quick summaries in emails or Slack

---

## 🎯 Managing Profiles & Rules

### Creating a New Profile

1. Load sample data or upload a file
2. In the **Profile Management** panel, enter:
   - **New Profile Name**: e.g., "County RFP System"
   - **New Root Array**: The field containing the record array (default: `Export`)
3. Click **"Clone profile"**
4. The new profile appears in the profile list with all rules from the active profile
5. Customize rules as needed

### Editing Rules

Each rule can be customized inline:
- **Enabled checkbox**: Toggle the rule on/off
- **Notes field**: Add team context or change history
- **Type field**: Change the rule type
- **Severity field**: Adjust severity (High/Medium/Low)
- **Field field**: Change which field is validated
- **Layer field**: Change the layer (Core/Domain/Diagnostic)
- **Condition/extras field**: For conditional rules, enter `condition=BidStatus:Open for Bidding`

Changes are saved automatically to your browser's local storage.

### Renaming & Deleting Profiles

- **Rename (Edit)**: In the **Profile management** list click **Edit** next to a profile. You'll be prompted for a new profile name and a description/source string. Renaming updates the profile name in the UI, moves any saved schema baseline to the new name, and updates stored run entries so history remains associated with the renamed profile. Renames will fail if the target name already exists.

- **Delete**: Click **Delete** next to a profile and confirm. Deleting removes the profile from the local profile list, clears its saved schema baseline, and prunes any run entries stored in localStorage that reference the deleted profile. Deleting the built-in default profile is allowed. Note: IndexedDB run history is not deleted by this action to avoid accidental large DB changes.

Testing these actions locally:
1. Serve the app locally: `python3 -m http.server 8000` and open `http://localhost:8000/dqct/dqct.html`.
2. Create or clone a profile so you have a non-default profile to experiment with.
3. Use **Edit** to rename and change the profile description, then verify the profile list and run history reflect the new name.
4. Use **Delete** to remove a profile and confirm that the profile disappears and its schema baseline and localStorage run entries are removed.


### Filtering Rules by Layer

At the top of the **Rules** panel, click layer buttons to filter:
- **Core**: Show only fundamental rules (R01–R04)
- **Domain**: Show only domain-specific rules (R05–R24)
- **Diagnostic**: Show only optional diagnostic rules (R25–R33)
- **All**: Show all rules

### Searching Rules

In the **Search Rules** field, type a keyword to filter:
- By rule ID: `R07`
- By field name: `ProjectCode`
- By rule type: `unique`
- By notes: `format`

Results update instantly.

### Resetting to Default

1. Click **"Reset Profile"** to restore the Ohio Buys profile to its original 33-rule configuration
2. All edits are discarded—use this if you've customized and want to start fresh

---

## 📊 Understanding Results

### Failure Severity

| Severity | What It Means | Action |
|---|---|---|
| **High** | Critical data defect—record should not be published | Fix immediately or exclude record |
| **Medium** | Data inconsistency or missing optional info | Address in next batch or tag for review |
| **Low** | Informational or diagnostic flag | Monitor trends; may require team discussion |

### Example Failures

#### Example 1: Missing Required Field
```
Rule: required
Field: Title
Expected: non-empty value
Actual: ""
Severity: High
```
→ The `Title` field is empty. Bid cannot be published without a title.

#### Example 2: Format Mismatch
```
Rule: regex
Field: ProjectCode
Expected: pattern ^SRC\d{10}$
Actual: "INVALID-2026"
Severity: Medium
```
→ The `ProjectCode` doesn't match the Ohio Buys format. Likely a scraper issue or data entry error.

#### Example 3: Conditional Requirement
```
Rule: required_if
Field: DueDate
Expected: required when BidStatus equals Open for Bidding
Actual: ""
Severity: High
```
→ The `DueDate` is empty, but the bid is "Open for Bidding" and thus needs a due date.

#### Example 4: Document Validation
```
Rule: documents_have_required_keys
Field: BidDocuments[0]
Expected: document key URL
Actual: { "Title": "spec.pdf", "Hash": "abc123" }
Severity: High
```
→ The first document in `BidDocuments` is missing the `URL` key.

---

## 📈 Dashboard & History

### Dashboard Overview

The **Dashboard** panel (visible by default) shows:

#### Summary Cards
- **Runs today**: How many validation runs you've executed today for this profile
- **Files checked**: Total files uploaded in current session
- **Pass rate**: Percentage of records passing all rules (averaging recent runs)
- **Open issues**: Total failures + anomalies in the latest run

#### Run History Table
A table of your last 12 validation runs showing:
| Column | What It Shows |
|---|---|
| Date | When the run completed |
| Profile | Which profile was active |
| Files | How many files in that run |
| Records | Total rows validated |
| Pass % | Percentage passing all rules |
| Drift | Number of schema drift events |
| Anomalies | Count of statistical anomalies detected |
| Status | "issues" or "clean" badge |

#### Trend Sparkline
A small line chart showing your pass rate over the last 30 runs. Useful for spotting quality trends:
- Rising line = improving data quality (good!)
- Falling line = degrading quality (investigate!)

#### Recent Issues Feed
The last 10 defects across validation runs, showing:
- Issue description (field + rule type)
- File and record reference
- Severity level

### Inspecting Historical Runs

The table is sorted by most recent first. Click on any row to drill into that specific run's details (planned for future version; currently visible in summary).

---

## ⚠️ Interpreting Anomalies

After validation, the **Schema Drift & Anomalies** panel shows:

### Schema Drift

#### Added Fields
Fields present in the incoming data but not in your saved baseline.
```
Example:
  Field: NewContractorName
  Type: string · null rate 5%
```
→ A new field appeared. Investigate why. Was it added upstream, or is it a scraper change?

#### Removed Fields
Fields in your baseline that are missing from the incoming data.
```
Example:
  Field: LastModified
  Type: date · null rate 10%
```
→ A field disappeared. This could be a scraper bug if it was previously populated.

#### Type Changes
A field's data type changed (e.g., string → number).
```
Example:
  Field: ContractValue
  Baseline: string → Incoming: number
```
→ The field type changed. Downstream systems expecting strings may break if you don't adjust.

### Anomalies

Anomalies are statistical warnings independent of rule failures. A record can pass all rules but still trigger an anomaly.

#### Anomaly Types

| Anomaly | Threshold | Meaning |
|---|---|---|
| **Row count drop** | > 30% fewer records than prior run | Data volume decreased significantly—investigate scraper health |
| **Row count spike** | > 200% more records than prior run | Data volume tripled—possible duplicate scraping or upstream change |
| **Null rate shifted** | > 20% relative change per field | A field's null/empty percentage jumped—possible scraper partial failure |
| **New enum value** | Any new value in an enum field | A `BidStatus` value appeared that wasn't in prior runs—new portal feature? |
| **Duplicate docs increase** | Any increase vs. prior run | More duplicate documents detected—scraper deduplication may be failing |

**Example Anomaly:**
```
Type: null_rate_change
Field: ContractValue
Severity: warn
Detail: Previous 85% null vs current 95% null
```
→ The `ContractValue` field is now empty in 95% of records (was 85%). The scraper may have stopped capturing this field.

### What To Do

- **Drift only**: Usually informational. Update your baseline once you've confirmed the change is intentional.
- **Anomalies**: Investigate the underlying cause. Reach out to the scraper vendor if a field disappeared or changed format.
- **Drift + Anomalies**: Red flag. Multiple changes suggest an upstream issue. Escalate.

---

## 💡 Tips & Best Practices

### 1. **Start with Sample Data**
Click "Load sample data" to learn the UI without uploading real files. Run validation on the sample to see how failures are reported.

### 2. **Create Profiles Per Source**
Don't try to use one profile for all data sources. Create separate profiles for Ohio Buys, county RFPs, etc. Rules will be clearer and easier to maintain.

### 3. **Use Layer Filters**
When managing rules, filter by layer:
- **Core**: Rarely change these—they're fundamental.
- **Domain**: Customize per source.
- **Diagnostic**: Enable only when auditing specific fields.

### 4. **Save Profiles Before Uploading**
If you've customized a profile, give it a memorable name and click **"Save active profile"** to lock in your changes.

### 5. **Use Runtime Overrides for One-Offs**
If you want to skip one or two rules for a single run without permanently disabling them, use **Runtime Overrides**:
```
R25 R26 R27
```
This disables those rules for that run only. Next run, they're back to their saved state.

### 6. **Archive Downloaded JSON Files**
Keep exported `.json` files in a timestamped folder (e.g., `validations/2026-04-28/`) for:
- Audit trails
- Trend analysis
- Aggregating defects across multiple runs

### 7. **Monitor the Trend Sparkline**
Check the trend line on the Dashboard regularly:
- If pass rate is falling, investigate the scraper
- If it's stable, data quality is consistent
- Spike in failures often correlates with upstream changes

### 8. **Use Tickets as Vendor Feedback**
Copy generated tickets and send to your scraper vendor with details. Formatted output makes it easy for them to prioritize fixes.

### 9. **Establish a Review Cadence**
- Run validation nightly or on each upload batch
- Review high-severity issues daily
- Discuss anomalies in weekly QA sync

### 10. **Build a Baseline Early**
On the first run with a new profile, results become your baseline for schema drift detection. Ensure the first upload is representative of expected data.

---

## 🆘 Troubleshooting

### Upload Not Working

**Symptom:** File doesn't appear in the Loaded Files list.

**Diagnosis:**
1. Is the file valid JSON? Try validating it with `jq` or a JSON linter.
2. Is the file size under 50 MB?
3. Does it contain a root array (either bare `[...]` or `{"Export": [...]}`)?

**Fix:**
- Validate JSON: `jq '.' myfile.json`
- Check for encoding issues (must be UTF-8)
- Re-upload after fixing

---

### Validation Not Running

**Symptom:** Clicking "Run validation" does nothing.

**Diagnosis:**
1. Are there any files loaded? Check the Loaded Files panel.
2. Is a profile selected? Check the Active Profile dropdown.
3. Browser console — any errors? (Press F12, check Console tab)

**Fix:**
- Load files first, then click Run
- Select a profile from the dropdown
- Open browser DevTools to spot JavaScript errors

---

### Results Not Showing

**Symptom:** Clicked Run validation but no table appears.

**Diagnosis:**
1. All records might be passing (no failures). Check the Failure Count card—if it's 0, validation passed!
2. Browser scrolling — results panel might be off-screen

**Fix:**
- Scroll down to see the Run Results panel
- If no failures, that's good! Try the sample data to see what a failure looks like

---

### Profile Changes Lost After Refresh

**Symptom:** Customized profile doesn't appear after closing the browser.

**Diagnosis:**
- Profile changes are saved to **local browser storage**. If you've cleared browser data, they're gone.

**Fix:**
- Enable browser local storage if it's disabled
- Consider exporting profiles (future version feature) as a backup

---

### Ticket Text Not Copying to Clipboard

**Symptom:** Clicked "Copy ticket" but nothing happens.

**Diagnosis:**
1. Browser permissions — does the app have clipboard access?
2. HTTPS vs. HTTP — clipboard API works on HTTPS or `localhost`

**Fix:**
- Check browser console for permission errors (F12 → Console)
- If on HTTP, switch to `localhost` or deploy on HTTPS
- Try again

---

### JSON Download Not Working

**Symptom:** Clicked "Download all issues JSON" but no file appears.

**Diagnosis:**
1. Browser might be blocking downloads
2. Downloads folder might be full or read-only

**Fix:**
- Check browser download settings
- Allow pop-ups/downloads for this site
- Try a different browser

---

### Performance Slow

**Symptom:** Validation is taking > 5 seconds on a small file.

**Diagnosis:**
1. Browser is processing a large file
2. Device CPU is under load

**Fix:**
- Try on a less busy device
- Break large files into smaller batches
- Close other browser tabs

---

### Questions?

- **For app issues**: Check the console (F12 → Console) for error messages
- **For data quality questions**: Refer to the Spec Sheet (`dqct_spec_v2.md`)
- **For vendor issues**: Use the exported tickets and anomaly reports as evidence

---

## 🎓 Next Steps

### To Learn More
- Review the **Spec Sheet** (`dqct_spec_v2.md`) for technical rule definitions and date format details
- Experiment with the **Sample Data** to understand failure patterns
- Create a new profile for your own data source

### To Use in Production
1. Copy the app to a shared server or document repository
2. Create profiles for all your data sources
3. Establish a validation schedule (nightly, per-batch, etc.)
4. Archive run exports in a central location for audit trails

### Future Enhancements (Planned)
- Trello API integration (push tickets directly)
- Scheduled validation via Python backend
- Multi-user support with audit logs
- CSV and XML support beyond JSON
- Email/Slack alerts on anomalies

---

## 📜 License & Attribution

DQCT was built as a portfolio project by Sophana Sok to demonstrate data engineering skills: validation pipelines, rule engines, schema management, anomaly detection, and observability.

**Stack:** HTML, CSS, Vanilla JavaScript (no build toolchain)  
**Storage:** Browser IndexedDB + localStorage  
**Availability:** Works fully offline  

---

**Last Updated:** April 28, 2026  
**Version:** 2.1 (Production — Phase 1 & 2 Complete)
