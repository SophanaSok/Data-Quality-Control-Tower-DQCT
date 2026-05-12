(function attachDQCTDiffUI(globalScope) {
  const defaultUniqueKey = globalScope.DQCTDiffEngine?.defaultUniqueKey || "ProjectCode";
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
      tabButtons.forEach((button) => {
        const isActive = button.getAttribute("data-app-tab") === tabName;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });
      panels.forEach((panel) => {
        const isActive = panel.getAttribute("data-tab-panel") === tabName;
        panel.classList.toggle("hidden", !isActive);
      });
    };

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.getAttribute("data-app-tab")));
    });

    setActiveTab("validate");
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
  }

  function initialize() {
    setupTabs();
    setupDiffUi();
  }

  globalScope.DQCTDiffUI = { initialize };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);
