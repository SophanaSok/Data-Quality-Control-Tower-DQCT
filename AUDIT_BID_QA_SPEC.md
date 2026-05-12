# Bid Data QA Spec Audit Report

**Date:** May 12, 2026  
**Codebase:** Data Quality Control Tower (DQCT)

---

## Requirement-by-Requirement Assessment

### 1. Deduplication Fingerprint

**Status:** ❌ **MISSING**

- **Current implementation:** None. The diff engine uses `ProjectCode` (or any configurable unique key) for duplicate detection, but does not generate fingerprints.
- **What's missing:**
  - SHA256 fingerprint generation from 12 specific fields
  - String field normalization (null→"", trim, collapse spaces, preserve casing)
  - Hash array field normalization (parse JSON, null→[], trim each, deduplicate, sort alphabetically)
  - Fingerprint computed from JSON.dumps(payload, sort_keys=True)
- **File:** None; would need new function in `src/modules/validation/engine.js` or new module

---

### 2. Required Fields

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

- **ERROR on missing:** Title, AgentID, BidStatus
  - ✅ **Title** — rule R08 in default profile (required, high severity)
  - ✅ **AgentID** — rule R02 in default profile (required, high severity)
  - ✅ **BidStatus** — rule R11 in default profile (enum, high severity)
  - ✅ Validation logic exists in `src/modules/validation/engine.js:applyRule()` for `rule.type === "required"`

- **WARNING if missing:** ProjectCode, DueDate, Description
  - ✅ **ProjectCode** — rule R05 (required, high severity) — but currently ERROR not WARNING
  - ✅ **DueDate** — rule R14 (required_if when BidStatus="Open for Bidding", high severity) — but only conditional
  - ✅ **Description** — rule R25 (required, low severity, disabled by default)
  - **Gap:** No true WARNING-only severity category; profile uses "high"/"medium"/"low" but no ERROR vs WARNING execution logic

- **All 12 fingerprint fields must exist on every record**
  - ❌ Not enforced; no implicit requirement to have all 12 fields present

- **File:** `src/modules/validation/engine.js:applyRule()` for required check; `dqct/scripts/core/dqct-core.js` for default profile rules

---

### 3. Document Array Parsing

**Status:** ✅ **IMPLEMENTED**

- ✅ **BidDocuments, AddendumDocuments, BidTabulations, AwardDocuments**
  - `parseDocumentCollection()` in `src/modules/validation/engine.js:12–33` handles:
    - Empty/null/undefined → return []
    - Arrays return as-is
    - JSON strings parse via `JSON.parse()`
    - Invalid JSON → return null
  - ✅ Rule `documents_have_required_keys` validates Title/URL/Hash non-empty
  - ✅ Applied in rules R16–R19 in default profile

- **File:** `src/modules/validation/engine.js:parseDocumentCollection()` and `:applyRule()` for type `documents_have_required_keys`

---

### 4. Hash Array Parsing

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

- ✅ **Parsing to arrays** — `hash_count_matches_documents` rule detects count mismatches using:
  - `parseDocumentCollection()` for hash field
  - Array.length check
  - Fallback to string split on `,` or newline if not array

- ❌ **Recommended format validation** (`^[A-Fa-f0-9]{32}$` for MD5)
  - No regex validation for hash format
  - Not enforced in rules

- ❌ **Hash array normalization** (trim each, deduplicate, sort)
  - Not applied before or during hashing
  - No normalization of hash field values

- **File:** `src/modules/validation/engine.js:hash_count_matches_documents` rule handler

---

### 5. Document/Hash Alignment

**Status:** ✅ **IMPLEMENTED**

- ✅ **Hash count matching:** Rule `hash_count_matches_documents` checks document count ↔ hash count
  - Applied in rules R20–R23 (all four document/hash pairs)
  - Compares `documents.length` to hash array count
  - ERROR on mismatch

- ✅ **Document key validation:** Rule `documents_have_required_keys` checks Title/URL/Hash present
  - Applied in rules R16–R19
  - ERROR if any document missing required keys on non-empty arrays

- ❌ **Hash value matching** (sorted set equality: `set(doc["Hash"]) == set(hash_array)`)
  - Not implemented; only count is checked
  - Does not validate that specific hashes match document hashes

- **File:** `src/modules/validation/engine.js:hash_count_matches_documents` and `:documents_have_required_keys`

---

### 6. BidStatus Rules

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

- ✅ **Enum validation:** Rule R11 enforces ["Open for Bidding", "Closed", "Cancelled", "Awarded"]
  - Applied via `rule.type === "enum"` in validation engine
  - WARNING on unknown value (medium severity in profile)

- **Open/Closed Rules:** "WARNING if DueDate or BidDocuments is empty"
  - ✅ R14: `required_if` — DueDate required when BidStatus="Open for Bidding" (ERROR, high severity)
  - ❌ BidDocuments required when Open/Closed — **NOT IMPLEMENTED**
  - ❌ Warning (not error) semantic — **NOT IMPLEMENTED** (current is ERROR)

- **Awarded Rules:** "WARNING if AwardDate or AwardedVendorName is empty; do NOT fail for empty AwardDocuments"
  - ✅ R15: `required_if` — AwardedVendorName required when BidStatus="Awarded"
  - ❌ AwardDate required when Awarded — **NOT IMPLEMENTED**
  - ❌ Do-not-fail for AwardDocuments — profile doesn't distinguish this case

- **Terminated Rules:** "flag for review if AwardDate, AwardedVendorName, or AwardDocuments are populated"
  - ❌ **NOT IMPLEMENTED**; no Terminated handling

- **File:** `src/modules/validation/engine.js:enum` handler; `dqct/scripts/core/dqct-core.js` default profile rules R11, R14, R15

---

### 7. QA Severity Classification

**Status:** ❌ **MISSING**

- ❌ **ERROR level → qa_status = "FAIL"**
  - Not implemented; current severity is "high"/"medium"/"low"
  - No ERROR enum or mapping to qa_status

- ❌ **WARNING level → qa_status = "PASS_WITH_WARNINGS"**
  - Severity levels don't map to qa_status values
  - No condition for "passing with warnings"

- ❌ **INFO level**
  - Current system has "low" severity, not "info"

- ❌ **qa_status calculation**
  - No per-record qa_status field in output
  - No logic: "no errors + no warnings = PASS"

- **Gap:** Output schema includes severity per failure, but not aggregate qa_status per record

---

### 8. Duplicate Detection

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

- ✅ **Exact duplicate:** By unique key (ProjectCode)
  - `findDuplicates()` in `src/modules/diff/engine.js:202–229` detects records with same unique key
  - Tracks count, indices, and records

- ❌ **Exact duplicate by fingerprint**
  - No SHA256 fingerprint comparison (see Requirement 1)

- ❌ **Near-duplicate detection** (same AgentID + ProjectCode but different fingerprint)
  - Not implemented
  - No AgentID + ProjectCode grouping logic

- **File:** `src/modules/diff/engine.js:findDuplicates()`

---

### 9. Output Schema

**Status:** ⚠️ **PARTIALLY IMPLEMENTED**

Current output per validated record (from `src/modules/validation/engine.js:validateFiles()`):

```javascript
{
  fileName: string,
  recordIndex: number (1-indexed),
  primaryId: string,
  field: string,
  ruleType: string,
  expected: string,
  actual: string,
  severity: "high" | "medium" | "low",
  ruleId: string
}
```

**Spec requires:**
```javascript
{
  row_number: ?,
  AgentID: ?,
  ProjectCode: ?,
  Title: ?,
  BidStatus: ?,
  fingerprint: ?,
  qa_status: ?,
  error_count: ?,
  warning_count: ?,
  errors: [],
  warnings: []
}
```

**Gaps:**
- ❌ No row_number field (recordIndex is given instead)
- ❌ No AgentID, ProjectCode, Title, BidStatus fields in output
- ❌ No fingerprint field
- ❌ No qa_status field (aggregate status per record)
- ❌ No error_count or warning_count fields
- ❌ Output is **failure-oriented** (one row per error), not **record-oriented** (one row per input record)
- ❌ No errors/warnings arrays grouped per record

---

## Summary Scorecard

| Requirement | Status | Notes |
|---|---|---|
| 1. Deduplication Fingerprint | ❌ Missing | No SHA256 fingerprint generation or field normalization |
| 2. Required Fields | ⚠️ Partial | ERROR fields implemented; WARNING fields missing |
| 3. Document Array Parsing | ✅ Implemented | JSON string parsing + key validation works |
| 4. Hash Array Parsing | ⚠️ Partial | Parsing works; format validation & normalization missing |
| 5. Document/Hash Alignment | ⚠️ Partial | Count matching works; hash value matching missing |
| 6. BidStatus Rules | ⚠️ Partial | Enum validation works; Open/Closed/Awarded/Terminated rules incomplete |
| 7. QA Severity Classification | ❌ Missing | No ERROR/WARNING levels or qa_status output |
| 8. Duplicate Detection | ⚠️ Partial | By unique key works; fingerprint-based duplicate missing; near-duplicate missing |
| 9. Output Schema | ❌ Missing | Fundamental mismatch: failure-oriented output vs record-oriented spec |

---

## Prioritized Gap List (by severity & effort)

### 🔴 **Critical (blocks compliance)**

1. **Output Schema Redesign** (🔴 HIGH EFFORT)
   - Current system outputs failures; spec requires per-record summary with qa_status, error_count, warning_count
   - **Impact:** Core deliverable mismatch
   - **Files to modify:** `src/modules/validation/engine.js`, `dqct/scripts/core/dqct-core.js` (validation run logic)
   - **Effort:** ~3–4 hours; requires restructuring entire output pipeline

2. **Deduplication Fingerprint** (🔴 HIGH EFFORT)
   - Implement SHA256 fingerprint from 12 fields with normalized string & hash arrays
   - **Impact:** Cannot detect exact duplicates or build near-duplicate logic
   - **Files to create:** New fingerprint module in `src/modules/validation/` or extend engine.js
   - **Effort:** ~2–3 hours; requires field normalization logic + crypto library

3. **QA Severity Classification** (🔴 MEDIUM EFFORT)
   - Map ERROR/WARNING/INFO severity levels to qa_status outcomes
   - **Impact:** Cannot classify records as PASS, PASS_WITH_WARNINGS, or FAIL
   - **Files to modify:** `src/modules/validation/engine.js`, validation run logic
   - **Effort:** ~1–2 hours; add severity aggregation per record

### 🟠 **High (missing domain logic)**

4. **BidStatus Conditional Rules** (🟠 MEDIUM EFFORT)
   - Add Open/Closed: BidDocuments required; Awarded: AwardDate required; Terminated: flag for review
   - **Impact:** Incomplete bid state validation
   - **Files to modify:** Default profile in `dqct/scripts/core/dqct-core.js` or new conditional rules in engine
   - **Effort:** ~1.5–2 hours; add new rule types or conditions

5. **Near-Duplicate Detection** (🟠 MEDIUM EFFORT)
   - Detect same AgentID + ProjectCode with different fingerprint
   - **Impact:** Cannot flag suspicious duplicates for manual review
   - **Files to modify:** `src/modules/diff/engine.js` or new module
   - **Effort:** ~1–2 hours; add grouping + comparison logic after fingerprints exist

6. **Hash Array Normalization** (🟠 LOW-MEDIUM EFFORT)
   - Trim, deduplicate, sort hash arrays before comparison
   - **Impact:** Fragile hash matching; sensitive to formatting quirks
   - **Files to modify:** `src/modules/validation/engine.js:parseDocumentCollection()` and hash validation
   - **Effort:** ~1 hour; add utility function

### 🟡 **Medium (nice-to-have validation)**

7. **Hash Format Validation** (🟡 LOW EFFORT)
   - Add regex check for `^[A-Fa-f0-9]{32}$` (MD5)
   - **Impact:** Detects malformed hashes early
   - **Files to modify:** Default profile (new rule) or engine
   - **Effort:** ~30 min; add rule or validation check

8. **All 12 Fingerprint Fields Required** (🟡 LOW EFFORT)
   - Enforce presence of all fingerprint field names on every record
   - **Impact:** Prevents silent missing-field issues
   - **Files to modify:** Engine or new rule
   - **Effort:** ~30 min; add validation or documentation

---

## Recommended Next Steps

### Phase 1 (Immediate)
1. **Create fingerprint module** with SHA256 + field normalization
2. **Refactor output schema** to be record-oriented with qa_status fields
3. **Implement severity mapping** (ERROR → FAIL, WARNING → PASS_WITH_WARNINGS, INFO → logged only)

### Phase 2 (Within 1 sprint)
4. Add BidStatus conditional rules (Open/Closed/Awarded/Terminated logic)
5. Implement near-duplicate detection
6. Add hash array normalization

### Phase 3 (Polish)
7. Hash format validation (regex on MD5)
8. Enforce all 12 fingerprint fields present
