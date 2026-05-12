(function attachDQCTDiffUI(globalScope) {
  const defaultUniqueKey = globalScope.DQCTDiffEngine?.defaultUniqueKey || "ProjectCode";
  const TAB_STORAGE_KEY = "dqct.app.activeTab.v1";
  const state = {
    baselinePayload: null,
    comparisonPayload: null,
    baselineName: "",
    comparisonName: "",
    analysis: null
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || "");
          const parser = globalScope.DQCTParser?.parseJsonText || JSON.parse;
          resolve(parser(text));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
      reader.readAsText(file);
    });
  }

  function getDiffExportFilenames() {
    return globalScope.DQCTExports?.diffExportFilenames || {
      diffRecords: "diff_records.json",
      duplicatesFile1: "duplicates_file1.json",
      duplicatesFile2: "duplicates_file2.json",
      duplicatesCross: "duplicates_cross.json",
      changedAndNew: "changed_and_new.json"
    };
  }

  function getAppSettings() {
    return globalScope.DQCTAppState?.getSettings?.() || {
      defaultUniqueKey,
      ignoreFields: [],
      theme: "light",
      exportFormat: "pretty"
    };
  }

  function render(container) {
    if (!container) {
      return;
    }

    container.className = "panel diff-panel";
    container.innerHTML = `
      <div class="diff-head">
        <div>
          <div class="eyebrow">Diff</div>
          <h2>Compare baseline vs comparison JSON</h2>
          <p class="helper">Upload two JSON exports, set a unique key, optionally ignore fields, then analyze changes and duplicates.</p>
        </div>
      </div>
      <div class="split">
        <div class="fieldset">
          <label for="diffBaselineInput">Baseline file</label>
          <input id="diffBaselineInput" type="file" accept=".json,application/json" />
          <div id="diffBaselineMeta" class="meta">No baseline file selected.</div>
        </div>
        <div class="fieldset">
          <label for="diffComparisonInput">Comparison file</label>
          <input id="diffComparisonInput" type="file" accept=".json,application/json" />
          <div id="diffComparisonMeta" class="meta">No comparison file selected.</div>
        </div>
      </div>
      <div class="split" style="margin-top: 0.8rem;">
        <div class="fieldset">
          <label for="diffUniqueKey">Unique key</label>
          <input id="diffUniqueKey" type="text" value="${escapeHtml(defaultUniqueKey)}" />
        </div>
        <div class="fieldset">
          <label for="diffIgnoreFields">Ignore fields (comma-separated)</label>
          <input id="diffIgnoreFields" type="text" placeholder="e.g. LastUpdated,CreatedAt" />
        </div>
      </div>
      <div class="actions-row" style="margin-top: 1rem;">
        <button id="diffAnalyzeButton" type="button">Analyze</button>
      </div>
      <div id="diffSummary" class="summary-layout hidden" style="margin-top: 1rem;"></div>
      <div class="actions-row" style="margin-top: 1rem;">
        <button id="diffExportRecords" type="button" class="secondary" disabled>Export diff records</button>
        <button id="diffExportDupFile1" type="button" class="secondary" disabled>Export duplicates file1</button>
        <button id="diffExportDupFile2" type="button" class="secondary" disabled>Export duplicates file2</button>
        <button id="diffExportDupCross" type="button" class="secondary" disabled>Export duplicates cross</button>
        <button id="diffExportChangedNew" type="button" class="secondary" disabled>Export changed + new</button>
      </div>
    `;
  }

  function renderSummary(summaryNode) {
    if (!summaryNode || !state.analysis) {
      return;
    }

    const diff = state.analysis.diff;
    const duplicates = state.analysis.duplicates;
    const items = [
      { label: "Baseline records", value: diff.baselineCount, note: state.baselineName || "baseline" },
      { label: "Comparison records", value: diff.comparisonCount, note: state.comparisonName || "comparison" },
      { label: "Changed", value: diff.changedCount, note: "Matched key, field differences" },
      { label: "New", value: diff.newCount, note: "Found only in comparison" },
      { label: "Removed", value: diff.removedCount, note: "Found only in baseline" },
      { label: "Unchanged", value: diff.unchangedCount, note: "Matched and same values" },
      { label: "Duplicates in file1", value: duplicates.duplicatesFile1.duplicateCount, note: "Repeated unique keys" },
      { label: "Duplicates in file2", value: duplicates.duplicatesFile2.duplicateCount, note: "Repeated unique keys" },
      { label: "Cross duplicates", value: duplicates.duplicatesCross.length, note: "Keys present in both files" }
    ];

    summaryNode.innerHTML = items
      .map((item) => `
        <div class="summary-box">
          <div class="meta">${escapeHtml(item.label)}</div>
          <strong>${escapeHtml(item.value)}</strong>
          <div class="meta">${escapeHtml(item.note)}</div>
        </div>
      `)
      .join("");
    summaryNode.classList.remove("hidden");
  }

  function enableExports(enabled) {
    [
      "diffExportRecords",
      "diffExportDupFile1",
      "diffExportDupFile2",
      "diffExportDupCross",
      "diffExportChangedNew"
    ].forEach((id) => {
      const button = document.getElementById(id);
      if (button instanceof HTMLButtonElement) {
        button.disabled = !enabled;
      }
    });
  }

  function setupTabs() {
    const tabButtons = Array.from(document.querySelectorAll("[data-app-tab]"));
    const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
    if (!tabButtons.length || !panels.length) {
      return;
    }

    const setActiveTab = (tabName) => {
      if (!tabName) {
        return;
      }
      tabButtons.forEach((button) => {
        const isActive = button.getAttribute("data-app-tab") === tabName;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });
      panels.forEach((panel) => {
        const isActive = panel.getAttribute("data-tab-panel") === tabName;
        panel.classList.toggle("hidden", !isActive);
      });
      localStorage.setItem(TAB_STORAGE_KEY, tabName);
    };

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.getAttribute("data-app-tab")));
    });

    const lastTab = localStorage.getItem(TAB_STORAGE_KEY);
    const tabExists = tabButtons.some((button) => button.getAttribute("data-app-tab") === lastTab);
    const defaultTab = tabButtons.some((button) => button.getAttribute("data-app-tab") === "dashboard")
      ? "dashboard"
      : (tabButtons[0]?.getAttribute("data-app-tab") || "");
    setActiveTab(tabExists ? lastTab : defaultTab);
    return setActiveTab;
  }

  function formatRunSummary(run) {
    const summary = run?.summary || {};
    if (run?.type === "diff") {
      return `changed ${summary.changed ?? 0}, new ${summary.newCount ?? 0}, removed ${summary.removed ?? 0}`;
    }
    return `records ${summary.records ?? 0}, failures ${summary.failures ?? 0}, anomalies ${summary.anomalies ?? 0}`;
  }

  function renderDashboardLastRun() {
    const node = document.getElementById("dashboardLastRunSummary");
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const recentRuns = globalScope.DQCTAppState?.getRecentRuns?.() || [];
    const latest = recentRuns[0];
    if (!latest) {
      node.textContent = "No run history yet. Run validation or diff to populate summary data.";
      return;
    }
    node.textContent = `${latest.type.toUpperCase()} | ${new Date(latest.timestamp).toLocaleString()} | ${formatRunSummary(latest)}`;
  }

  function renderRecentRunsTable(setActiveTab) {
    const body = document.getElementById("recentRunsBody");
    if (!(body instanceof HTMLElement)) {
      return;
    }
    const recentRuns = globalScope.DQCTAppState?.getRecentRuns?.() || [];
    if (!recentRuns.length) {
      body.innerHTML = '<tr><td colspan="5" class="muted">Run validation or diff to populate local history.</td></tr>';
      return;
    }
    body.innerHTML = recentRuns.map((run, index) => `
      <tr>
        <td>${escapeHtml(new Date(run.timestamp).toLocaleString())}</td>
        <td><span class="badge ${run.type === "diff" ? "good" : "warn"}">${escapeHtml(run.type)}</span></td>
        <td>${escapeHtml(formatRunSummary(run))}</td>
        <td>${escapeHtml((run.exportFiles || []).join(", ") || "(none)")}</td>
        <td><button type="button" class="ghost" data-reopen-run="${index}">Re-open</button></td>
      </tr>
    `).join("");

    body.querySelectorAll("[data-reopen-run]").forEach((button) => {
      button.addEventListener("click", () => {
        const run = recentRuns[Number(button.getAttribute("data-reopen-run"))];
        if (!run) {
          return;
        }
        setActiveTab(run.reopenTab || (run.type === "diff" ? "diff" : "validate"));
        if ((run.reopenTab || run.type) === "reports") {
          globalScope.dispatchEvent(new CustomEvent("dqct:open-reports"));
        }
      });
    });
  }

  function setupDashboardUi(setActiveTab) {
    const runDiffTile = document.getElementById("dashboardRunDiffTile");
    const runValidationTile = document.getElementById("dashboardRunValidationTile");
    const viewReportsTile = document.getElementById("dashboardViewReportsTile");
    const uniqueKeyInput = document.getElementById("settingsUniqueKey");
    const ignoreFieldsInput = document.getElementById("settingsIgnoreFields");
    const themeInput = document.getElementById("settingsTheme");
    const exportFormatInput = document.getElementById("settingsExportFormat");
    const saveButton = document.getElementById("settingsSaveButton");
    const resetButton = document.getElementById("settingsResetButton");

    runDiffTile?.addEventListener("click", () => setActiveTab("diff"));
    runValidationTile?.addEventListener("click", () => setActiveTab("validate"));
    viewReportsTile?.addEventListener("click", () => {
      setActiveTab("validate");
      globalScope.dispatchEvent(new CustomEvent("dqct:open-reports"));
    });

    const applySettingsToInputs = () => {
      const settings = getAppSettings();
      if (uniqueKeyInput instanceof HTMLInputElement) {
        uniqueKeyInput.value = settings.defaultUniqueKey || defaultUniqueKey;
      }
      if (ignoreFieldsInput instanceof HTMLInputElement) {
        ignoreFieldsInput.value = (settings.ignoreFields || []).join(", ");
      }
      if (themeInput instanceof HTMLSelectElement) {
        themeInput.value = settings.theme === "dark" ? "dark" : "light";
      }
      if (exportFormatInput instanceof HTMLSelectElement) {
        exportFormatInput.value = settings.exportFormat === "minified" ? "minified" : "pretty";
      }
    };

    saveButton?.addEventListener("click", () => {
      globalScope.DQCTAppState?.saveSettings?.({
        defaultUniqueKey: uniqueKeyInput instanceof HTMLInputElement ? uniqueKeyInput.value.trim() : defaultUniqueKey,
        ignoreFields: ignoreFieldsInput instanceof HTMLInputElement ? ignoreFieldsInput.value : "",
        theme: themeInput instanceof HTMLSelectElement ? themeInput.value : "light",
        exportFormat: exportFormatInput instanceof HTMLSelectElement ? exportFormatInput.value : "pretty"
      });
      globalScope.DQCTToasts?.showSuccess?.("Settings saved.");
    });

    resetButton?.addEventListener("click", () => {
      globalScope.DQCTAppState?.resetSettings?.();
      applySettingsToInputs();
      globalScope.DQCTToasts?.showSuccess?.("Settings reset to defaults.");
    });

    globalScope.addEventListener("dqct:settings-changed", applySettingsToInputs);
    globalScope.addEventListener("dqct:runs-changed", () => {
      renderDashboardLastRun();
      renderRecentRunsTable(setActiveTab);
    });

    applySettingsToInputs();
    renderDashboardLastRun();
    renderRecentRunsTable(setActiveTab);
  }

  function setupDiffUi() {
    const mountNode = document.getElementById("diffApp");
    if (!mountNode) {
      return;
    }
    render(mountNode);

    const baselineInput = document.getElementById("diffBaselineInput");
    const comparisonInput = document.getElementById("diffComparisonInput");
    const baselineMeta = document.getElementById("diffBaselineMeta");
    const comparisonMeta = document.getElementById("diffComparisonMeta");
    const uniqueKeyInput = document.getElementById("diffUniqueKey");
    const ignoreFieldsInput = document.getElementById("diffIgnoreFields");
    const analyzeButton = document.getElementById("diffAnalyzeButton");
    const summaryNode = document.getElementById("diffSummary");

    if (!(baselineInput instanceof HTMLInputElement) ||
      !(comparisonInput instanceof HTMLInputElement) ||
      !(analyzeButton instanceof HTMLButtonElement) ||
      !(uniqueKeyInput instanceof HTMLInputElement) ||
      !(ignoreFieldsInput instanceof HTMLInputElement) ||
      !(summaryNode instanceof HTMLElement)) {
      return;
    }

    const applySharedDefaults = () => {
      const settings = getAppSettings();
      uniqueKeyInput.value = settings.defaultUniqueKey || defaultUniqueKey;
      ignoreFieldsInput.value = (settings.ignoreFields || []).join(", ");
    };

    const resetAnalysisState = () => {
      state.analysis = null;
      summaryNode.classList.add("hidden");
      summaryNode.innerHTML = "";
      enableExports(false);
    };

    baselineInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      try {
        state.baselinePayload = await readJsonFile(file);
        state.baselineName = file.name;
        if (baselineMeta) {
          baselineMeta.textContent = `Loaded ${file.name}`;
        }
      } catch (error) {
        state.baselinePayload = null;
        if (baselineMeta) {
          baselineMeta.textContent = `Failed to parse ${file.name}: ${error.message || error}`;
        }
      }
      resetAnalysisState();
    });

    comparisonInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      try {
        state.comparisonPayload = await readJsonFile(file);
        state.comparisonName = file.name;
        if (comparisonMeta) {
          comparisonMeta.textContent = `Loaded ${file.name}`;
        }
      } catch (error) {
        state.comparisonPayload = null;
        if (comparisonMeta) {
          comparisonMeta.textContent = `Failed to parse ${file.name}: ${error.message || error}`;
        }
      }
      resetAnalysisState();
    });

    analyzeButton.addEventListener("click", () => {
      if (!state.baselinePayload || !state.comparisonPayload) {
        summaryNode.classList.remove("hidden");
        summaryNode.innerHTML = '<div class="summary-box"><div class="meta">Missing files</div><strong>Upload both files</strong><div class="meta">Baseline and comparison are required.</div></div>';
        enableExports(false);
        return;
      }

      const uniqueKey = uniqueKeyInput.value.trim() || defaultUniqueKey;
      const ignoreFields = ignoreFieldsInput.value
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);

      const diff = globalScope.DQCTDiffEngine.diffRecords(state.baselinePayload, state.comparisonPayload, {
        uniqueKey,
        ignoreFields
      });
      const duplicates = globalScope.DQCTDiffEngine.findDuplicates(state.baselinePayload, state.comparisonPayload, {
        uniqueKey
      });
      const cleanExport = globalScope.DQCTDiffEngine.buildCleanExport(diff);

      state.analysis = { diff, duplicates, cleanExport };
      renderSummary(summaryNode);
      enableExports(true);
      const exportFiles = getDiffExportFilenames();
      globalScope.DQCTAppState?.addRecentRun?.({
        timestamp: new Date().toISOString(),
        type: "diff",
        summary: {
          baseline: diff.baselineCount,
          comparison: diff.comparisonCount,
          changed: diff.changedCount,
          newCount: diff.newCount,
          removed: diff.removedCount
        },
        exportFiles: [
          exportFiles.diffRecords,
          exportFiles.duplicatesFile1,
          exportFiles.duplicatesFile2,
          exportFiles.duplicatesCross,
          exportFiles.changedAndNew
        ],
        reopenTab: "diff",
        label: `${state.baselineName || "baseline"} vs ${state.comparisonName || "comparison"}`
      });
    });

    const exportFiles = getDiffExportFilenames();
    document.getElementById("diffExportRecords")?.addEventListener("click", () => {
      if (!state.analysis) return;
      globalScope.DQCTExports.downloadJson(state.analysis.diff.diffRows, exportFiles.diffRecords);
    });
    document.getElementById("diffExportDupFile1")?.addEventListener("click", () => {
      if (!state.analysis) return;
      globalScope.DQCTExports.downloadJson(state.analysis.duplicates.duplicatesFile1, exportFiles.duplicatesFile1);
    });
    document.getElementById("diffExportDupFile2")?.addEventListener("click", () => {
      if (!state.analysis) return;
      globalScope.DQCTExports.downloadJson(state.analysis.duplicates.duplicatesFile2, exportFiles.duplicatesFile2);
    });
    document.getElementById("diffExportDupCross")?.addEventListener("click", () => {
      if (!state.analysis) return;
      globalScope.DQCTExports.downloadJson(state.analysis.duplicates.duplicatesCross, exportFiles.duplicatesCross);
    });
    document.getElementById("diffExportChangedNew")?.addEventListener("click", () => {
      if (!state.analysis) return;
      globalScope.DQCTExports.downloadJson(state.analysis.cleanExport, exportFiles.changedAndNew);
    });

    globalScope.addEventListener("dqct:settings-changed", applySharedDefaults);
    applySharedDefaults();
  }

  function initialize() {
    const setActiveTab = setupTabs();
    setupDashboardUi(setActiveTab);
    setupDiffUi();
  }

  globalScope.DQCTDiffUI = { initialize };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);
