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
let sidebarControls = null;

function createDownloadHelper(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
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
  sidebarControls?.updateThemeButton(settings.theme || "light");
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

  validateRunButton?.addEventListener("click", () => {
    const fileCount = validateFileInput instanceof HTMLInputElement ? validateFileInput.files?.length || 0 : 0;
    Toasts.showToast(fileCount ? `Validation queue contains ${fileCount} file(s).` : "Choose at least one JSON file to validate.", fileCount ? "success" : "warning");
  });

  diffAnalyzeButton?.addEventListener("click", () => {
    const baselineName = baselineFileInput instanceof HTMLInputElement ? baselineFileInput.files?.[0]?.name || "" : "";
    const comparisonName = comparisonFileInput instanceof HTMLInputElement ? comparisonFileInput.files?.[0]?.name || "" : "";
    Toasts.showToast(
      baselineName && comparisonName
        ? `Diff ready for ${baselineName} vs ${comparisonName}.`
        : "Choose baseline and comparison JSON files to compare.",
      baselineName && comparisonName ? "success" : "warning"
    );
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

  sidebarControls = initSidebar({
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

  settingsSaveButton?.addEventListener("click", persistSettings);
  settingsResetButton?.addEventListener("click", resetSettings);
  themeToggle?.addEventListener("click", toggleTheme);

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
