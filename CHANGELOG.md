# Changelog

All notable changes to this project will be documented in this file.

The format is based on https://keepachangelog.com/en/1.0.0/

## [Unreleased]

## [2.3] - 2026-05-14

### Added
- Added utility spacing and layout helper classes in `dqct/styles/dqct.css` to replace inline styling and improve consistency.
- Added DOM development guard to warn about missing elements when mounting the UI.
- Added validation for importing full profile JSON files (checks `profile_name`, non-empty `rules`, and rule fields `id`, `field`, `type`, `severity`).
- Added focus trap and keyboard support (Escape key) to Record Inspector modal for improved accessibility.

### Changed
- Moved inline styles out of `dqct/dqct.html` into semantic CSS classes to preserve layout and visual appearance while cleaning up HTML.
- Updated parser behavior (`src/shared/parser.js`) to return structured error information from `extractRecordsFromPayload()` instead of `null` for better diagnostics.
- Surface parser and import errors via toast notifications (`DQCTToasts.showError`).
- Replaced tab panel visibility style manipulation with CSS class toggles (`.hidden` class).

### Fixed
- Ensure importer rejects malformed profiles with clear error messages instead of silently failing or producing invalid state.

### Performance
- Eliminated all event-driven blanket render() calls — narrowed to targeted sub-renders per action
- Reduced renderDiffResults() invocations from 13 to 2 (initial load only) by replacing field badge, scope chip, and changedFieldsOnly paths with CSS class toggles and applyRecordFilter()
- Pre-compile regex patterns once per validation run via compiledPatterns Map — eliminates O(n) RegExp construction per record
- Added dirty flags (_lastHistoryKey, _lastIssuesFeedKey, _lastRulesKey, _lastProfileListKey, _lastIssueGroupsKey) to guard all major innerHTML assignments against redundant DOM writes
- Paginated record summaries table at 25 rows via DQCTTable
- Added content-visibility: auto to off-screen tab panels
- JSZip now loads async in parallel with internal scripts
- Fixed stale dashboard state on profile switch between profiles with zero validation runs
- Hardened issuesFeedKey with run timestamp to eliminate collision between consecutive runs with identical result signatures

