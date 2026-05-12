# DQCT Export Bundle — Contents and Metadata

This folder contains an example `metadata.json` and documents the export bundle format produced by the DQCT UI's **Export Bundle** action.

Included files (when exported from the UI):

- `results.json` — All validation results (array of issue objects).
- `currentSchema.json` — Summary of the current run's inferred schema.
- `schemaBaselines.json` — Saved baselines for profiles.
- `runStats.json` — Aggregated statistics for the run (row counts, pass rates, etc.).
- `profiles.json` — Profile definitions present in the UI when the bundle was created.
- `metadata.json` — Run-level metadata (timestamp, run type, counts, profile, and version). See `metadata.example.json`.
- `README.txt` — Short human-readable list of files included (auto-included when bundling with JSZip).

Metadata fields (example in `metadata.example.json`):

- `generatedAt` — ISO timestamp when the bundle was generated.
- `runType` — Type of run (e.g., `validation`, `drift-scan`).
- `profile` — Active profile name used for the run.
- `fileCount` — Number of files included in the run.
- `recordCount` — Total records processed across files.
- `issueCount` — Total validation issues found.
- `anomalyCount` — Number of anomaly warnings detected.
- `schemaBaselineSaved` — Boolean indicating whether a baseline snapshot was saved.
- `dqctVersion` — DQCT application version string.
- `notes` — Optional human notes.

How to inspect a produced bundle:

1. If exported as a ZIP (recommended):

```bash
unzip dqct-export-<timestamp>.zip -d dqct-export
ls -la dqct-export
cat dqct-export/metadata.json
```

2. If the browser fallback produced a single JSON file (no ZIP), open it with an editor or run:

```bash
jq '.' dqct-export-<timestamp>.json
```

Regenerating a bundle from the UI:

- Open the app and run validation.
- Use the **Export Bundle** button in the toolbar or the drift panel to download a bundle.

If you want the export to include additional application state, modify the bundler in `src/shared/exports.js` to add extra files to `exportsMap` before packaging.
