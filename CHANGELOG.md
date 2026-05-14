# Changelog

All notable changes to this project will be documented in this file.

The format is based on https://keepachangelog.com/en/1.0.0/

## [2.3] - Unreleased

### Added
- Added utility spacing and layout helper classes in `dqct/styles/dqct.css` to replace inline styling and improve consistency.
- Added DOM development guard to warn about missing elements when mounting the UI.
- Added validation for importing full profile JSON files (checks `profile_name`, non-empty `rules`, and rule fields `id`, `field`, `type`, `severity`).

### Changed
- Moved inline styles out of `dqct/dqct.html` into semantic CSS classes to preserve layout and visual appearance while cleaning up HTML.
- Updated parser behavior (`src/shared/parser.js`) to return structured error information from `extractRecordsFromPayload()` instead of `null` for better diagnostics.
- Surface parser and import errors via toast notifications (`DQCTToasts.showError`).

### Fixed
- Ensure importer rejects malformed profiles with clear error messages instead of silently failing or producing invalid state.

