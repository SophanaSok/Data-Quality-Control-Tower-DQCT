import * as Parser from "./shared/parser.js";
import * as AppState from "./shared/appState.js";
import * as Exports from "./shared/exports.js";
import * as ValidationProfiles from "./modules/validation/profiles.js";
import * as ValidationEngine from "./modules/validation/engine.js";
import * as Fingerprint from "./modules/validation/fingerprint.js";
import * as DiffEngine from "./modules/diff/engine.js";
import * as DiffUI from "./modules/diff/ui.js";
import * as Profiler from "./modules/profiler/engine.js";
import * as Table from "./ui/table.js";
import * as Toasts from "./ui/toasts.js";
import * as JsonViewer from "./ui/jsonViewer.js";
import { createRouter } from "./router.js";
import { initSidebar } from "./ui/sidebar.js";

const appShell = document.getElementById("appShell");
const appSidebar = document.getElementById("appSidebar");
const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
const sidebarToggle = document.getElementById("sidebarToggle");
const themeToggle = document.getElementById("themeToggle");
const routeTitle = document.getElementById("routeTitle");
const routeDescription = document.getElementById("routeDescription");
const dashboardRecentRunsBody = document.getElementById("recentRunsBody");
const dashboardRunsToday = document.getElementById("dashboardRunsToday");
const dashboardRunsTodayMeta = document.getElementById("dashboardRunsTodayMeta");
const dashboardFilesChecked = document.getElementById("dashboardFilesChecked");
const dashboardFilesCheckedMeta = document.getElementById("dashboardFilesCheckedMeta");
const dashboardPassRate = document.getElementById("dashboardPassRate");
const dashboardPassRateMeta = document.getElementById("dashboardPassRateMeta");
const dashboardOpenIssues = document.getElementById("dashboardOpenIssues");
const dashboardOpenIssuesMeta = document.getElementById("dashboardOpenIssuesMeta");
const settingsUniqueKey = document.getElementById("settingsUniqueKey");
const settingsIgnoreFields = document.getElementById("settingsIgnoreFields");
const settingsTheme = document.getElementById("settingsTheme");
const settingsExportFormat = document.getElementById("settingsExportFormat");
const settingsSaveButton = document.getElementById("settingsSaveButton");
const settingsResetButton = document.getElementById("settingsResetButton");
const validateStatus = document.getElementById("validateStatus");
const diffStatus = document.getElementById("diffStatus");
const validateOutput = document.getElementById("validateOutput");
const diffOutput = document.getElementById("diffOutput");
const validationExportButton = document.getElementById("validationExportButton");
const diffExportButton = document.getElementById("diffExportButton");
const diffCleanExportButton = document.getElementById("diffCleanExportButton");
let validationTableController = null;
let diffTableController = null;
const validationState = {
  files: [],
  results: [],
  summaries: [],
  recordIndex: new Map()
};
const diffState = {
  baseline: null,
  comparison: null,
  result: null,
  duplicates: null,
  cleanExport: null
};
const defaultValidationRules = [
  { id: "V01", layer: "core", field: "ProjectCode", type: "required", severity: "high", enabled: true, notes: "Primary identifier required" },
  { id: "V02", layer: "core", field: "Title", type: "required", severity: "high", enabled: true, notes: "Title required" },
  { id: "V03", layer: "domain", field: "ProjectCode", type: "unique", severity: "high", enabled: true, notes: "ProjectCode must be unique per file" },
  { id: "V04", layer: "domain", field: "PublishedDate", type: "date_format", severity: "medium", enabled: true, notes: "PublishedDate should be parseable" },
  { id: "V05", layer: "domain", field: "DueDate", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Open for Bidding" }, notes: "Open bids should include a due date" },
  { id: "V06", layer: "domain", field: "BidDocuments", type: "documents_have_required_keys", severity: "high", enabled: true, required_keys: ["Title", "URL", "Hash"], run_if_not_empty: true, notes: "Document payload should include required keys" }
];

function createDownloadHelper(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getUniqueKey() {
  return String(AppState.loadSettings().defaultUniqueKey || "ProjectCode").trim() || "ProjectCode";
}

function getIgnoreFields() {
  const settings = AppState.loadSettings();
  return Array.isArray(settings.ignoreFields) ? settings.ignoreFields : [];
}

function inferFieldType(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (value instanceof Date) {
    return "date";
  }
  return typeof value;
}

async function readJsonFile(file) {
  const text = await file.text();
  const payload = Parser.parseJsonText(text);
  const extracted = Parser.extractRecordsFromPayload(payload);
  if (!extracted.records) {
    throw new Error(extracted.error || "Unable to extract records from JSON payload");
  }
  return {
    payload,
    records: Parser.normalizeRecords(extracted.records),
    rootArray: extracted.rootArray
  };
}

async function readJsonFiles(fileList) {
  const files = Array.from(fileList || []).slice(0, 10);
  const parsed = [];

  for (const file of files) {
    if (file.size > 50 * 1024 * 1024) {
      parsed.push({ name: file.name, status: "error", error: "File exceeds 50 MB limit." });
      continue;
    }

    try {
      const payload = await readJsonFile(file);
      parsed.push({
        name: file.name,
        status: "ok",
        payload: payload.payload,
        records: payload.records,
        rootArray: payload.rootArray,
        size: file.size
      });
    } catch (error) {
      parsed.push({ name: file.name, status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  return parsed;
}

function getRecordForValidationResult(result) {
  return validationState.recordIndex.get(`${result.fileName}:${Number(result.recordIndex) || 0}`) || null;
}

function openRecordModal({ title, subtitle, record, highlightPath }) {
  if (!record) {
    Toasts.showWarning("No record available for this row.");
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal dqct-json-modal";
  modal.innerHTML = `
    <div class="modal__dialog dqct-json-modal__dialog" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="panel" style="border: 0; box-shadow: none; border-radius: 0; background: transparent;">
        <div class="section-title">
          <div>
            <div class="eyebrow">${title}</div>
            <h3>${subtitle}</h3>
          </div>
          <button type="button" class="btn-ghost" data-close-modal>Close</button>
        </div>
        <div id="modalContent"></div>
      </div>
    </div>
  `;
  const content = modal.querySelector("#modalContent");
  if (content instanceof HTMLElement) {
    content.appendChild(JsonViewer.renderRecordViewer(record, highlightPath));
  }
  modal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target === modal || target.closest("[data-close-modal]")) {
      modal.remove();
    }
  });
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      modal.remove();
    }
  });
  document.body.appendChild(modal);
}

function openValidationResult(result) {
  const record = getRecordForValidationResult(result);
  if (!record) {
    Toasts.showWarning("This row does not map to a parsed record.");
    return;
  }
  openRecordModal({
    title: "Validation result",
    subtitle: `${result.fileName} #${result.recordIndex}`,
    record,
    highlightPath: result.field
  });
}

function openDiffResult(result) {
  if (result.status === "changed") {
    openRecordModal({
      title: "Diff result",
      subtitle: `${result.key} changed`,
      record: result.after || result.before,
      highlightPath: Array.isArray(result.changedFields) ? result.changedFields[0] : undefined
    });
    return;
  }

  const record = result.after || result.before;
  if (!record) {
    Toasts.showWarning("No record available for this diff row.");
    return;
  }
  openRecordModal({
    title: "Diff result",
    subtitle: `${result.key} ${result.status}`,
    record,
    highlightPath: null
  });
}

function renderSummaryCards(container, cards) {
  if (!(container instanceof HTMLElement)) {
    return;
  }
  container.innerHTML = cards.map((card) => `
    <div class="panel metric-card">
      <span class="meta">${card.label}</span>
      <strong>${card.value}</strong>
      <span class="helper">${card.helper || ""}</span>
    </div>
  `).join("");
}

function renderValidationOutput() {
  if (!(validateOutput instanceof HTMLElement)) {
    return;
  }

  const totalFiles = validationState.files.length;
  const totalRecords = validationState.files.reduce((sum, file) => sum + (Array.isArray(file.records) ? file.records.length : 0), 0);
  const totalFailures = validationState.results.length;
  const severityCounts = validationState.results.reduce((counts, row) => {
    const severity = row.severity === "high" ? "high" : row.severity === "medium" ? "medium" : "low";
    counts[severity] += 1;
    return counts;
  }, { high: 0, medium: 0, low: 0 });

  validateOutput.innerHTML = `
    <div class="dashboard-summary">
      <div class="panel metric-card"><span class="meta">Files</span><strong>${totalFiles}</strong><span class="helper">Parsed JSON uploads</span></div>
      <div class="panel metric-card"><span class="meta">Records</span><strong>${totalRecords}</strong><span class="helper">Total records inspected</span></div>
      <div class="panel metric-card"><span class="meta">Failures</span><strong>${totalFailures}</strong><span class="helper">All validation findings</span></div>
      <div class="panel metric-card"><span class="meta">High severity</span><strong>${severityCounts.high}</strong><span class="helper">Critical issues</span></div>
    </div>
    <div class="panel">
      <div class="section-title"><h3>Validation results</h3><span class="badge good">${severityCounts.high ? "Needs review" : "Clean"}</span></div>
      <div class="table-wrap">
        <table id="validationResultsTable">
          <thead>
            <tr>
              <th>File</th>
              <th>Record</th>
              <th>Primary ID</th>
              <th>Field</th>
              <th>Rule</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody id="validationResultsBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const tableElement = document.getElementById("validationResultsTable");
  const bodyElement = document.getElementById("validationResultsBody");
  validationTableController = Table.create({
    tableElement,
    bodyElement,
    pageSize: 20,
    onRowClick: openValidationResult,
    columns: [
      { key: "fileName", sortable: true },
      { key: "recordIndex", sortable: true, sortValue: (row) => Number(row.recordIndex), render: (row) => String(row.recordIndex || "") },
      { key: "primaryId", sortable: true },
      { key: "field", sortable: true },
      { key: "ruleType", sortable: true },
      { key: "expected", sortable: true },
      { key: "actual", sortable: true },
      { key: "severity", sortable: true, render: (row) => `<span class="pill ${row.severity === "high" ? "high" : row.severity === "medium" ? "medium" : "low"}">${row.severity}</span>` }
    ]
  });
  validationTableController.update(validationState.results);
}

function renderDiffOutput() {
  if (!(diffOutput instanceof HTMLElement) || !diffState.result) {
    return;
  }

  const diff = diffState.result;
  const counts = [
    { label: "Baseline records", value: diff.baselineCount, helper: `Wrapper: ${diff.wrapper.baseline}` },
    { label: "Comparison records", value: diff.comparisonCount, helper: `Wrapper: ${diff.wrapper.comparison}` },
    { label: "Changed", value: diff.changedCount, helper: "Modified records" },
    { label: "New / Removed", value: `${diff.newCount} / ${diff.removedCount}`, helper: "Adds and deletes" }
  ];

  diffOutput.innerHTML = `
    <div class="dashboard-summary" id="diffSummaryCards"></div>
    <div class="panel">
      <div class="section-title"><h3>Diff rows</h3><span class="badge good">${diff.changedCount ? "Differences found" : "No changes"}</span></div>
      <div class="table-wrap">
        <table id="diffResultsTable">
          <thead>
            <tr>
              <th>Key</th>
              <th>Status</th>
              <th>Changed fields</th>
              <th>Before</th>
              <th>After</th>
            </tr>
          </thead>
          <tbody id="diffResultsBody"></tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="section-title"><h3>Record viewer</h3><span class="meta">Click a diff row to inspect it</span></div>
      <div id="diffViewerHost" class="stack">
        <div class="empty-state"><strong>No row selected</strong><span>Select a diff row to inspect the before/after view.</span></div>
      </div>
    </div>
  `;

  renderSummaryCards(document.getElementById("diffSummaryCards"), counts);

  const bodyElement = document.getElementById("diffResultsBody");
  const viewerHost = document.getElementById("diffViewerHost");
  diffTableController = Table.create({
    tableElement: document.getElementById("diffResultsTable"),
    bodyElement,
    pageSize: 20,
    onRowClick: (row) => {
      openDiffResult(row);
      if (viewerHost instanceof HTMLElement) {
        viewerHost.innerHTML = "";
        if (row.status === "changed") {
          viewerHost.appendChild(JsonViewer.renderDiffViewer(row.before, row.after, row.changedFields || []));
        } else {
          viewerHost.appendChild(JsonViewer.renderRecordViewer(row.after || row.before, row.key));
        }
      }
    },
    columns: [
      { key: "key", sortable: true },
      { key: "status", sortable: true },
      { key: "changedFields", sortable: false, render: (row) => Array.isArray(row.changedFields) ? row.changedFields.join(", ") : "" },
      { key: "before", sortable: false, render: (row) => `<span class="meta">${row.before ? "present" : "-"}</span>` },
      { key: "after", sortable: false, render: (row) => `<span class="meta">${row.after ? "present" : "-"}</span>` }
    ]
  });
  diffTableController.update(diff.diffRows);
}

function buildValidationRules() {
  const uniqueKey = getUniqueKey();
  return defaultValidationRules.map((rule) => {
    if (rule.type === "unique" && rule.field === "ProjectCode") {
      return { ...rule, field: uniqueKey };
    }
    return rule;
  });
}

async function runValidation() {
  const input = document.getElementById("validateFileInput");
  const files = input instanceof HTMLInputElement ? Array.from(input.files || []) : [];
  if (!files.length) {
    Toasts.showWarning("Choose at least one JSON file to validate.");
    return;
  }

  if (validateStatus) {
    validateStatus.textContent = "Parsing files...";
  }

  const parsedFiles = await readJsonFiles(files);
  validationState.files = parsedFiles;
  validationState.recordIndex = new Map();

  const uniqueKey = getUniqueKey();
  const getPrimaryId = (record) => String(record?.[uniqueKey] ?? record?.ProjectCode ?? record?.Title ?? record?.AgentID ?? "(missing primary id)");
  const validFiles = parsedFiles.filter((file) => file.status === "ok");
  validFiles.forEach((file) => {
    (file.records || []).forEach((record, recordIndex) => {
      validationState.recordIndex.set(`${file.name}:${recordIndex + 1}`, record);
    });
  });

  const { results, perFileSummary } = ValidationEngine.validateFiles(parsedFiles, buildValidationRules(), {
    runtimeOverrides: new Set(),
    getPrimaryId,
    inferFieldType
  });
  validationState.results = results;
  validationState.summaries = ValidationEngine.buildRecordSummaries(validFiles, results);

  renderValidationOutput();

  const failedFiles = parsedFiles.filter((file) => file.status === "error").length;
  if (validateStatus) {
    validateStatus.textContent = `${validFiles.length} file(s) parsed, ${results.length} issue(s) found${failedFiles ? `, ${failedFiles} file(s) failed to parse` : ""}.`;
  }
  Toasts.showToast(results.length ? `Validation completed with ${results.length} issue(s).` : "Validation completed without issues.", results.length ? "warning" : "success");

  AppState.addHistoryRun({
    timestamp: new Date().toISOString(),
    type: "validate",
    summary: { files: validFiles.length, failures: results.length, records: validationState.summaries.length },
    exportFiles: [],
    reopenTab: "validate",
    label: `Validation: ${validFiles.length} file(s)`
  });

  return perFileSummary;
}

async function runDiffAnalysis() {
  const baselineInput = document.getElementById("baselineFileInput");
  const comparisonInput = document.getElementById("comparisonFileInput");
  const baselineFile = baselineInput instanceof HTMLInputElement ? baselineInput.files?.[0] : null;
  const comparisonFile = comparisonInput instanceof HTMLInputElement ? comparisonInput.files?.[0] : null;

  if (!baselineFile || !comparisonFile) {
    Toasts.showWarning("Choose both baseline and comparison JSON files.");
    return;
  }

  if (diffStatus) {
    diffStatus.textContent = "Parsing files...";
  }

  const [baseline, comparison] = await Promise.all([readJsonFile(baselineFile), readJsonFile(comparisonFile)]);
  const uniqueKey = getUniqueKey();
  const ignoreFields = getIgnoreFields();
  const diff = DiffEngine.diffRecords(baseline.payload, comparison.payload, { uniqueKey, ignoreFields });
  const duplicates = DiffEngine.findDuplicates(baseline.payload, comparison.payload, { uniqueKey });
  const cleanExport = DiffEngine.buildCleanExport(diff, {});

  diffState.baseline = baseline;
  diffState.comparison = comparison;
  diffState.result = diff;
  diffState.duplicates = duplicates;
  diffState.cleanExport = cleanExport;

  renderDiffOutput();

  if (diffStatus) {
    diffStatus.textContent = `${diff.changedCount} changed, ${diff.newCount} new, ${diff.removedCount} removed record(s).`;
  }
  Toasts.showToast(diff.changedCount || diff.newCount || diff.removedCount ? "Diff completed with changes." : "Diff completed without changes.", diff.changedCount || diff.newCount || diff.removedCount ? "warning" : "success");

  AppState.addHistoryRun({
    timestamp: new Date().toISOString(),
    type: "diff",
    summary: { baseline: diff.baselineCount, comparison: diff.comparisonCount, changed: diff.changedCount, new: diff.newCount, removed: diff.removedCount },
    exportFiles: ["diff_records.json", "clean_export.json"],
    reopenTab: "diff",
    label: `Diff: ${baselineFile.name} vs ${comparisonFile.name}`
  });
}

function attachCompatibilityNamespaces() {
  globalThis.DQCTParser = { ...Parser };
  globalThis.DQCTAppState = {
    defaultSettings: AppState.defaultSettings,
    getSettings: AppState.loadSettings,
    saveSettings: AppState.saveSettings,
    updateSettings: AppState.updateSettings,
    resetSettings: AppState.resetSettings,
    getRecentRuns: AppState.loadHistory,
    saveRecentRuns: AppState.saveRecentRuns,
    addRecentRun: AppState.addHistoryRun
  };
  globalThis.DQCTExports = {
    ...Exports,
    downloadJson: Exports.downloadJson,
    diffExportFilenames: Exports.diffExportFilenames
  };
  globalThis.DQCTProfiles = { ...ValidationProfiles };
  globalThis.DQCTValidationEngine = { ...ValidationEngine };
  globalThis.DQCTFingerprint = { ...Fingerprint };
  globalThis.DQCTDiffEngine = { ...DiffEngine };
  globalThis.DQCTDiffUI = { ...DiffUI };
  globalThis.DQCTProfiler = { ...Profiler };
  globalThis.DQCTTable = { ...Table };
  globalThis.DQCTToasts = { ...Toasts };
  globalThis.DQCTJsonViewer = { ...JsonViewer };
}

function getRouteMeta(routeKey) {
  const route = String(routeKey || "#dashboard");
  return {
    "#dashboard": {
      title: "Dashboard",
      description: "Shared settings, recent run history, and quick actions for the control tower."
    },
    "#validate": {
      title: "Validate",
      description: "Load JSON files and run profile-driven checks from the validation modules."
    },
    "#diff": {
      title: "Diff",
      description: "Compare exports and inspect changed records, duplicates, and clean export bundles."
    },
    "#settings": {
      title: "Settings",
      description: "Manage unique key, ignored fields, theme, and export format."
    }
  }[route] || {
    title: "Dashboard",
    description: "Shared settings, recent run history, and quick actions for the control tower."
  };
}

function renderRecentRuns() {
  if (!(dashboardRecentRunsBody instanceof HTMLElement)) {
    return;
  }

  const runs = AppState.loadHistory();
  const totalRuns = runs.length;
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const runsToday = runs.filter((run) => String(run.timestamp || "").startsWith(todayPrefix)).length;
  const issueCount = runs.reduce((sum, run) => sum + Number(run.summary?.failures || 0), 0);
  const passCount = runs.reduce((sum, run) => sum + (Number(run.summary?.failures || 0) === 0 ? 1 : 0), 0);
  const passRate = totalRuns ? Math.round((passCount / totalRuns) * 100) : 0;

  if (dashboardRunsToday) {
    dashboardRunsToday.textContent = String(runsToday);
  }
  if (dashboardRunsTodayMeta) {
    dashboardRunsTodayMeta.textContent = totalRuns ? `${totalRuns} recent runs stored locally` : "No run history yet";
  }
  if (dashboardFilesChecked) {
    dashboardFilesChecked.textContent = String(runs.reduce((sum, run) => sum + Number(run.summary?.files || 0), 0));
  }
  if (dashboardFilesCheckedMeta) {
    dashboardFilesCheckedMeta.textContent = "Historical file count from recent runs";
  }
  if (dashboardPassRate) {
    dashboardPassRate.textContent = `${passRate}%`;
  }
  if (dashboardPassRateMeta) {
    dashboardPassRateMeta.textContent = totalRuns ? `${passCount} clean runs out of ${totalRuns}` : "No validation runs recorded";
  }
  if (dashboardOpenIssues) {
    dashboardOpenIssues.textContent = String(issueCount);
  }
  if (dashboardOpenIssuesMeta) {
    dashboardOpenIssuesMeta.textContent = "Aggregated failure counts from recent runs";
  }

  if (!runs.length) {
    dashboardRecentRunsBody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><strong>No recent runs yet</strong><span>Run validation or diff to populate local history.</span></div></td></tr>`;
    return;
  }

  dashboardRecentRunsBody.innerHTML = runs.map((run) => `
    <tr>
      <td>${new Date(run.timestamp).toLocaleString()}</td>
      <td>${run.type}</td>
      <td>${JSON.stringify(run.summary || {})}</td>
      <td>${Array.isArray(run.exportFiles) ? run.exportFiles.join(", ") : ""}</td>
      <td><button type="button" class="btn-ghost" data-run-open="${run.reopenTab || run.type}">Open</button></td>
    </tr>
  `).join("");
}

function syncSettingsForm() {
  const settings = AppState.loadSettings();
  if (settingsUniqueKey) {
    settingsUniqueKey.value = settings.defaultUniqueKey || "ProjectCode";
  }
  if (settingsIgnoreFields) {
    settingsIgnoreFields.value = Array.isArray(settings.ignoreFields) ? settings.ignoreFields.join(", ") : "";
  }
  if (settingsTheme) {
    settingsTheme.value = settings.theme || "light";
  }
  if (settingsExportFormat) {
    settingsExportFormat.value = settings.exportFormat || "pretty";
  }
}

function persistSettings() {
  const current = AppState.loadSettings();
  const next = {
    ...current,
    defaultUniqueKey: String(settingsUniqueKey?.value || "ProjectCode").trim() || "ProjectCode",
    ignoreFields: String(settingsIgnoreFields?.value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    theme: settingsTheme?.value === "dark" ? "dark" : "light",
    exportFormat: settingsExportFormat?.value === "minified" ? "minified" : "pretty"
  };
  AppState.saveSettings(next);
  syncSettingsForm();
  Toasts.showSuccess("Settings saved.");
}

function resetSettings() {
  AppState.resetSettings();
  syncSettingsForm();
  Toasts.showSuccess("Settings reset to defaults.");
}

function toggleTheme() {
  const current = AppState.loadSettings();
  const nextTheme = current.theme === "dark" ? "light" : "dark";
  AppState.saveSettings({ ...current, theme: nextTheme });
  syncSettingsForm();
}

function wireBasicPanels() {
  const validateRunButton = document.getElementById("validateRunButton");
  const diffAnalyzeButton = document.getElementById("diffAnalyzeButton");
  const validateFileInput = document.getElementById("validateFileInput");
  const baselineFileInput = document.getElementById("baselineFileInput");
  const comparisonFileInput = document.getElementById("comparisonFileInput");
  const validationExport = validationExportButton;
  const diffExport = diffExportButton;
  const diffCleanExport = diffCleanExportButton;

  validateRunButton?.addEventListener("click", () => {
    runValidation().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (validateStatus) {
        validateStatus.textContent = message;
      }
      Toasts.showError(`Validation failed: ${message}`);
    });
  });

  diffAnalyzeButton?.addEventListener("click", () => {
    runDiffAnalysis().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (diffStatus) {
        diffStatus.textContent = message;
      }
      Toasts.showError(`Diff failed: ${message}`);
    });
  });

  validationExport?.addEventListener("click", () => {
    if (!validationState.results.length) {
      Toasts.showWarning("Run validation before exporting results.");
      return;
    }
    Exports.downloadJson(validationState.results, "validation_results.json");
  });

  diffExport?.addEventListener("click", () => {
    if (!diffState.result) {
      Toasts.showWarning("Run diff before exporting results.");
      return;
    }
    Exports.downloadJson(diffState.result, "diff_results.json");
  });

  diffCleanExport?.addEventListener("click", () => {
    if (!diffState.cleanExport) {
      Toasts.showWarning("Run diff before exporting the clean export.");
      return;
    }
    Exports.downloadJson(diffState.cleanExport, "clean_export.json");
  });
}

function openRoute(routeKey) {
  const meta = getRouteMeta(routeKey);
  if (routeTitle) {
    routeTitle.textContent = meta.title;
  }
  if (routeDescription) {
    routeDescription.textContent = meta.description;
  }
}

function bootstrap() {
  attachCompatibilityNamespaces();
  const themeBootstrap = AppState.loadSettings();
  if (document.documentElement.getAttribute("data-theme") !== themeBootstrap.theme) {
    document.documentElement.setAttribute("data-theme", themeBootstrap.theme);
  }

  initSidebar({
    shellElement: appShell,
    sidebarElement: appSidebar,
    collapseButton: sidebarToggle,
    mobileButton: mobileSidebarToggle,
    themeButton: themeToggle,
    onThemeToggle: toggleTheme
  });

  syncSettingsForm();
  renderRecentRuns();
  wireBasicPanels();
  renderValidationOutput();
  renderDiffOutput();

  settingsSaveButton?.addEventListener("click", persistSettings);
  settingsResetButton?.addEventListener("click", resetSettings);

  window.addEventListener("dqct:runs-changed", () => renderRecentRuns());
  window.addEventListener("dqct:settings-changed", () => {
    syncSettingsForm();
    const current = AppState.loadSettings();
    document.documentElement.setAttribute("data-theme", current.theme);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const runButton = target.closest("[data-run-open]");
    if (runButton instanceof HTMLElement) {
      const hash = runButton.getAttribute("data-run-open") || "dashboard";
      window.location.hash = hash.startsWith("#") ? hash : `#${hash}`;
    }
  });

  const router = createRouter({
    "#dashboard": { onEnter: () => openRoute("#dashboard") },
    "#validate": { onEnter: () => openRoute("#validate") },
    "#diff": { onEnter: () => openRoute("#diff") },
    "#settings": { onEnter: () => openRoute("#settings") }
  }, {
    defaultRoute: "#dashboard",
    viewSelector: "[data-spa-view]",
    navSelector: "[data-spa-nav]",
    onRouteChange: (routeKey) => openRoute(routeKey)
  });

  router.start();
}

bootstrap();
