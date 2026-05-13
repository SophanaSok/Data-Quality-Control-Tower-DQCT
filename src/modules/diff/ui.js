(function attachDQCTDiffUI(globalScope) {
  const defaultUniqueKey = globalScope.DQCTDiffEngine?.defaultUniqueKey || "ProjectCode";
  const TAB_STORAGE_KEY = "dqct.app.activeTab.v1";
  const DIFF_CHANGED_FIELDS_ONLY_KEY = "dqct.diff.changedFieldsOnly.v1";
  const DIFF_SCOPE_EXPANDED_KEY = "dqct.diff.scopeExpanded.v1";
  const DIFF_GLOBAL_EXPANDED_KEY = "dqct.diff.globalExpanded.v1";
  const DIFF_FILTER_QUERY_KEY = "dqct.diff.filterQuery.v1";
  const DIFF_VISIBLE_SCOPES_KEY = "dqct.diff.visibleScopes.v1";

  function readChangedFieldsOnlyPreference() {
    try {
      return localStorage.getItem(DIFF_CHANGED_FIELDS_ONLY_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function saveChangedFieldsOnlyPreference(value) {
    try {
      localStorage.setItem(DIFF_CHANGED_FIELDS_ONLY_KEY, value ? "true" : "false");
    } catch (error) {
      // Ignore storage failures and keep in-memory state only.
    }
  }

  function readScopeExpandedPreference() {
    try {
      const raw = localStorage.getItem(DIFF_SCOPE_EXPANDED_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return {};
      }
      return {
        added: typeof parsed.added === "boolean" ? parsed.added : undefined,
        removed: typeof parsed.removed === "boolean" ? parsed.removed : undefined,
        changed: typeof parsed.changed === "boolean" ? parsed.changed : undefined
      };
    } catch (error) {
      return {};
    }
  }

  function saveScopeExpandedPreference(value) {
    try {
      localStorage.setItem(DIFF_SCOPE_EXPANDED_KEY, JSON.stringify({
        added: typeof value?.added === "boolean" ? value.added : undefined,
        removed: typeof value?.removed === "boolean" ? value.removed : undefined,
        changed: typeof value?.changed === "boolean" ? value.changed : undefined
      }));
    } catch (error) {
      // Ignore storage failures and keep in-memory state only.
    }
  }

  function readGlobalExpandedPreference() {
    try {
      const raw = localStorage.getItem(DIFF_GLOBAL_EXPANDED_KEY);
      if (raw === "true") {
        return true;
      }
      if (raw === "false") {
        return false;
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  function saveGlobalExpandedPreference(value) {
    try {
      if (typeof value === "boolean") {
        localStorage.setItem(DIFF_GLOBAL_EXPANDED_KEY, value ? "true" : "false");
      } else {
        localStorage.removeItem(DIFF_GLOBAL_EXPANDED_KEY);
      }
    } catch (error) {
      // Ignore storage failures and keep in-memory state only.
    }
  }

  function readDiffFilterQueryPreference() {
    try {
      return String(localStorage.getItem(DIFF_FILTER_QUERY_KEY) || "");
    } catch (error) {
      return "";
    }
  }

  function saveDiffFilterQueryPreference(value) {
    try {
      const normalized = String(value || "");
      if (!normalized) {
        localStorage.removeItem(DIFF_FILTER_QUERY_KEY);
        return;
      }
      localStorage.setItem(DIFF_FILTER_QUERY_KEY, normalized);
    } catch (error) {
      // Ignore storage failures and keep in-memory state only.
    }
  }

  function readVisibleScopesPreference() {
    try {
      const raw = localStorage.getItem(DIFF_VISIBLE_SCOPES_KEY);
      if (!raw) {
        return { added: true, removed: true, changed: true };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return { added: true, removed: true, changed: true };
      }
      return {
        added: parsed.added !== false,
        removed: parsed.removed !== false,
        changed: parsed.changed !== false
      };
    } catch (error) {
      return { added: true, removed: true, changed: true };
    }
  }

  function saveVisibleScopesPreference(value) {
    try {
      localStorage.setItem(DIFF_VISIBLE_SCOPES_KEY, JSON.stringify({
        added: value?.added !== false,
        removed: value?.removed !== false,
        changed: value?.changed !== false
      }));
    } catch (error) {
      // Ignore storage failures and keep in-memory state only.
    }
  }

  const state = {
    baselinePayload: null,
    comparisonPayload: null,
    baselineName: "",
    comparisonName: "",
    analysis: null,
    showChangedFieldsOnly: readChangedFieldsOnlyPreference(),
    scopeExpandedPreference: readScopeExpandedPreference(),
    globalExpandedPreference: readGlobalExpandedPreference(),
    diffFilterQuery: readDiffFilterQueryPreference(),
    visibleScopes: readVisibleScopesPreference(),
    diffShortcutsBound: false
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
      <div id="diffResults" style="margin-top:1rem;"></div>
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

    const isTypingContext = (target) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      if (target.isContentEditable) {
        return true;
      }
      const tagName = target.tagName.toLowerCase();
      return tagName === "input" || tagName === "textarea" || tagName === "select";
    };

    const clearDiffFilter = () => {
      const resultsNode = document.getElementById("diffResults");
      if (!(resultsNode instanceof HTMLElement)) {
        return;
      }
      const filterInput = resultsNode.querySelector("#diffRecordFilterInput");
      const clearButton = resultsNode.querySelector("#diffRecordFilterClear");
      if (filterInput instanceof HTMLInputElement) {
        if (filterInput.value) {
          if (clearButton instanceof HTMLButtonElement) {
            clearButton.click();
          } else {
            filterInput.value = "";
            filterInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
        filterInput.focus();
      }
    };

    const bindDiffShortcuts = () => {
      if (state.diffShortcutsBound) {
        return;
      }
      state.diffShortcutsBound = true;
      document.addEventListener("keydown", (event) => {
        const diffPanel = document.getElementById("diffApp");
        const resultsNode = document.getElementById("diffResults");
        if (!(diffPanel instanceof HTMLElement) || !(resultsNode instanceof HTMLElement)) {
          return;
        }
        if (diffPanel.classList.contains("hidden")) {
          return;
        }

        const target = event.target;
        const typingContext = isTypingContext(target);

        if (event.key === "/" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && !typingContext) {
          const filterInput = resultsNode.querySelector("#diffRecordFilterInput");
          if (filterInput instanceof HTMLInputElement) {
            event.preventDefault();
            filterInput.focus();
            filterInput.select();
          }
          return;
        }

        if (event.key === "Escape" && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const filterInput = resultsNode.querySelector("#diffRecordFilterInput");
          const shouldClear = (filterInput instanceof HTMLInputElement) && (filterInput.value.length > 0 || document.activeElement === filterInput);
          if (shouldClear) {
            event.preventDefault();
            clearDiffFilter();
          }
          return;
        }

        if (typingContext) {
          return;
        }

        if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && String(event.key).toLowerCase() === "e") {
          const expandAllButton = resultsNode.querySelector("[data-diff-expand-all]");
          if (expandAllButton instanceof HTMLButtonElement) {
            event.preventDefault();
            expandAllButton.click();
          }
          return;
        }

        if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && String(event.key).toLowerCase() === "c") {
          const collapseAllButton = resultsNode.querySelector("[data-diff-collapse-all]");
          if (collapseAllButton instanceof HTMLButtonElement) {
            event.preventDefault();
            collapseAllButton.click();
          }
        }
      });
    };

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
      renderDiffResults(state.analysis);
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

    function renderDiffResults(analysis) {
      const node = document.getElementById('diffResults');
      if (!node) return;
      if (!analysis || !analysis.diff) {
        node.innerHTML = '';
        return;
      }
      const diff = analysis.diff;
      // Build sections: Added (new), Removed, Changed
      const added = diff.newRecords || [];
      const removed = diff.removedRecords || [];
      const changed = diff.changedRecords || [];
      const showChangedFieldsOnly = Boolean(state.showChangedFieldsOnly);
      const activeFilterQuery = String(state.diffFilterQuery || '').trim();

      const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const highlightMatch = (value, query) => {
        const rawText = String(value ?? '');
        const escapedText = escapeHtml(rawText);
        const normalizedQuery = String(query || '').trim();
        if (!normalizedQuery) {
          return escapedText;
        }
        const pattern = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'gi');
        return escapedText.replace(pattern, '<mark class="dqct-diff-match">$1</mark>');
      };

      const renderRecordPreview = (rec) => `<pre class="dqct-json-viewer__code dqct-diff-record-json">${escapeHtml(JSON.stringify(rec, null, 2))}</pre>`;
      const renderChangedFields = (fields) => {
        const normalizedFields = Array.isArray(fields) ? fields.filter(Boolean) : [];
        if (!normalizedFields.length) {
          return '<div class="meta">Changed fields: none detected</div>';
        }
        return `<div class="meta">Changed fields: ${highlightMatch(normalizedFields.join(', '), activeFilterQuery)}</div>`;
      };
      const renderFieldValue = (value) => {
        if (value === undefined) {
          return '<span class="dqct-diff-pill dqct-diff-pill--missing">(missing)</span>';
        }
        if (value === null) {
          return '<span class="dqct-diff-pill dqct-diff-pill--null">null</span>';
        }
        return `<code class="dqct-diff-field-value">${escapeHtml(JSON.stringify(value))}</code>`;
      };
      const renderChangedFieldsCompact = (changedRecord) => {
        const fields = Array.isArray(changedRecord?.changedFields) ? changedRecord.changedFields.filter(Boolean) : [];
        if (!fields.length) {
          return '<div class="meta">No changed fields available.</div>';
        }
        return `
          <div class="dqct-diff-field-table" role="table" aria-label="Changed fields">
            <div class="dqct-diff-field-table__head">
              <span>Field</span>
              <span>Before</span>
              <span>After</span>
            </div>
            ${fields.map((field) => `
              <div class="dqct-diff-field-table__row">
                <span class="dqct-diff-field-name">${escapeHtml(String(field))}</span>
                <span>${renderFieldValue(changedRecord?.before?.[field])}</span>
                <span>${renderFieldValue(changedRecord?.after?.[field])}</span>
              </div>
            `).join('')}
          </div>
        `;
      };
      const startsExpanded = (scope, totalItems) => {
        if (typeof state.scopeExpandedPreference?.[scope] === 'boolean') {
          return state.scopeExpandedPreference[scope];
        }
        if (typeof state.globalExpandedPreference === 'boolean') {
          return state.globalExpandedPreference;
        }
        return totalItems <= 3;
      };

      const renderSectionControls = (scope, count) => {
        if (!count) {
          return '';
        }
        return `
          <div class="dqct-diff-controls" data-diff-controls="${scope}">
            <button type="button" class="ghost" data-diff-expand="${scope}">Expand all</button>
            <button type="button" class="ghost" data-diff-collapse="${scope}">Collapse all</button>
          </div>
        `;
      };

      const renderCardStart = (scope, itemIndex, titleText, metaText, openByDefault, filterText = '') => `
        <details class="dqct-diff-record-card" data-diff-scope="${scope}" data-diff-index="${itemIndex}" data-filter-text="${escapeHtml(String(filterText).toLowerCase())}" ${openByDefault ? 'open' : ''}>
          <summary class="dqct-diff-record-head">
            <div>
              <strong>${highlightMatch(titleText, activeFilterQuery)}</strong>
              <div class="meta">${highlightMatch(metaText, activeFilterQuery)}</div>
            </div>
            <span class="meta dqct-diff-summary-hint">Click to ${openByDefault ? 'collapse' : 'expand'} record</span>
          </summary>
          <div class="dqct-diff-record-content">
      `;

      const renderCardEnd = () => '</div></details>';
      const anyScopeVisible = Boolean(state.visibleScopes.added || state.visibleScopes.removed || state.visibleScopes.changed);

      node.innerHTML = `
        <div class="dqct-diff-results-toolbar">
          <div class="dqct-diff-filter-wrap">
            <label class="meta" for="diffRecordFilterInput">Filter records</label>
            <div class="dqct-diff-filter-row">
              <input id="diffRecordFilterInput" class="dqct-diff-filter-input" type="search" placeholder="Search by key or changed field" value="${escapeHtml(state.diffFilterQuery)}" />
              <button id="diffRecordFilterClear" type="button" class="ghost">Clear</button>
            </div>
          </div>
          <div class="dqct-diff-scope-chips">
            <button type="button" class="dqct-chip ${state.visibleScopes.added ? 'is-active' : ''}" data-diff-scope-toggle="added" aria-pressed="${state.visibleScopes.added ? 'true' : 'false'}">Added ${added.length}</button>
            <button type="button" class="dqct-chip ${state.visibleScopes.removed ? 'is-active' : ''}" data-diff-scope-toggle="removed" aria-pressed="${state.visibleScopes.removed ? 'true' : 'false'}">Removed ${removed.length}</button>
            <button type="button" class="dqct-chip ${state.visibleScopes.changed ? 'is-active' : ''}" data-diff-scope-toggle="changed" aria-pressed="${state.visibleScopes.changed ? 'true' : 'false'}">Changed ${changed.length}</button>
            <button type="button" class="ghost" data-diff-scope-show-all>Show all</button>
          </div>
          <div class="dqct-diff-global-controls">
            <button type="button" class="ghost" data-diff-expand-all>Expand all sections</button>
            <button type="button" class="ghost" data-diff-collapse-all>Collapse all sections</button>
          </div>
          <label class="dqct-diff-toggle" for="diffChangedFieldsOnlyToggle">
            <input id="diffChangedFieldsOnlyToggle" type="checkbox" ${showChangedFieldsOnly ? 'checked' : ''} />
            Show only changed fields
          </label>
          <div class="dqct-diff-shortcuts-hint" aria-label="Keyboard shortcuts hint">
            <span class="meta">Shortcuts:</span>
            <span>/ filter</span>
            <span>Esc clear</span>
            <span>Shift+E expand</span>
            <span>Shift+C collapse</span>
          </div>
        </div>
        ${anyScopeVisible ? '' : `
          <div class="empty-state" data-diff-sections-empty>
            <h3>No sections visible</h3>
            <p>All scope chips are turned off. Re-enable Added, Removed, or Changed to view records.</p>
            <div class="actions-row" style="margin-top:0.5rem;">
              <button type="button" class="ghost" data-diff-empty-show-all>Show all sections</button>
            </div>
          </div>
        `}
        <div class="empty-state hidden" data-diff-filter-empty>
          <h3>No matching records</h3>
          <p>The current filter did not match any visible records. Clear the search or broaden your query.</p>
          <div class="actions-row" style="margin-top:0.5rem;">
            <button type="button" class="ghost" data-diff-empty-clear-filter>Clear filter</button>
          </div>
        </div>
        <div class="section ${state.visibleScopes.added ? '' : 'hidden'}" data-diff-section="added">
          <h3>Added (<span data-diff-visible-count="added">${added.length}</span> / ${added.length})</h3>
          ${renderSectionControls('added', added.length)}
          <div class="dqct-diff-record-list">${added.length ? added.map((a, idx) => `
            ${renderCardStart('added', idx, String(a.key), `Comparison index: ${String(a.comparisonIndex)}`, startsExpanded('added', added.length), `${String(a.key)} comparison index ${String(a.comparisonIndex)}`)}
              <div class="dqct-diff-record-pane">
                <div class="meta">Added record</div>
                ${renderRecordPreview(a.record)}
              </div>
            ${renderCardEnd()}
          `).join('') : '<div class="meta">No added records</div>'}</div>
        </div>
        <div class="section ${state.visibleScopes.removed ? '' : 'hidden'}" data-diff-section="removed" style="margin-top:12px;">
          <h3>Removed (<span data-diff-visible-count="removed">${removed.length}</span> / ${removed.length})</h3>
          ${renderSectionControls('removed', removed.length)}
          <div class="dqct-diff-record-list">${removed.length ? removed.map((r, idx) => `
            ${renderCardStart('removed', idx, String(r.key), `Baseline index: ${String(r.baselineIndex)}`, startsExpanded('removed', removed.length), `${String(r.key)} baseline index ${String(r.baselineIndex)}`)}
              <div class="dqct-diff-record-pane">
                <div class="meta">Removed record</div>
                ${renderRecordPreview(r.record)}
              </div>
            ${renderCardEnd()}
          `).join('') : '<div class="meta">No removed records</div>'}</div>
        </div>
        <div class="section ${state.visibleScopes.changed ? '' : 'hidden'}" data-diff-section="changed" style="margin-top:12px;">
          <h3>Changed (<span data-diff-visible-count="changed">${changed.length}</span> / ${changed.length})</h3>
          ${renderSectionControls('changed', changed.length)}
          <div class="dqct-diff-record-list">${changed.length ? changed.map((c, idx) => `
            ${renderCardStart('changed', idx, String(c.key), `Baseline #${String(c.baselineIndex)} -> Comparison #${String(c.comparisonIndex)}`, startsExpanded('changed', changed.length), `${String(c.key)} ${(Array.isArray(c.changedFields) ? c.changedFields.join(' ') : '')}`)}
              ${renderChangedFields(c.changedFields)}
              ${showChangedFieldsOnly ? renderChangedFieldsCompact(c) : `
                <div class="dqct-diff-record-grid">
                  <div class="dqct-diff-record-pane">
                    <div class="meta">Before (baseline)</div>
                    ${renderRecordPreview(c.before)}
                  </div>
                  <div class="dqct-diff-record-pane">
                    <div class="meta">After (comparison)</div>
                    ${renderRecordPreview(c.after)}
                  </div>
                </div>
              `}
            ${renderCardEnd()}
          `).join('') : '<div class="meta">No changed records</div>'}</div>
        </div>
      `;

      const toggleScopeCards = (scope, openState) => {
        node.querySelectorAll(`details[data-diff-scope="${scope}"]`).forEach((card) => {
          card.open = openState;
        });
        state.scopeExpandedPreference = {
          ...state.scopeExpandedPreference,
          [scope]: openState
        };
        saveScopeExpandedPreference(state.scopeExpandedPreference);

        const scopeValues = [
          state.scopeExpandedPreference.added,
          state.scopeExpandedPreference.removed,
          state.scopeExpandedPreference.changed
        ];
        const allSame = scopeValues.every((value) => typeof value === 'boolean') && new Set(scopeValues).size === 1;
        state.globalExpandedPreference = allSame ? scopeValues[0] : undefined;
        saveGlobalExpandedPreference(state.globalExpandedPreference);
      };

      node.querySelectorAll('[data-diff-expand]').forEach((button) => {
        button.addEventListener('click', () => {
          const scope = button.getAttribute('data-diff-expand');
          if (!scope) return;
          toggleScopeCards(scope, true);
        });
      });

      node.querySelectorAll('[data-diff-collapse]').forEach((button) => {
        button.addEventListener('click', () => {
          const scope = button.getAttribute('data-diff-collapse');
          if (!scope) return;
          toggleScopeCards(scope, false);
        });
      });

      node.querySelectorAll('[data-diff-scope-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
          const scope = button.getAttribute('data-diff-scope-toggle');
          if (!scope) return;
          const nextState = !state.visibleScopes[scope];
          state.visibleScopes = {
            ...state.visibleScopes,
            [scope]: nextState
          };
          saveVisibleScopesPreference(state.visibleScopes);
          renderDiffResults(analysis);
        });
      });

      node.querySelector('[data-diff-scope-show-all]')?.addEventListener('click', () => {
        state.visibleScopes = { added: true, removed: true, changed: true };
        saveVisibleScopesPreference(state.visibleScopes);
        renderDiffResults(analysis);
      });

      node.querySelector('[data-diff-empty-show-all]')?.addEventListener('click', () => {
        state.visibleScopes = { added: true, removed: true, changed: true };
        saveVisibleScopesPreference(state.visibleScopes);
        renderDiffResults(analysis);
      });

      node.querySelector('[data-diff-empty-clear-filter]')?.addEventListener('click', () => {
        state.diffFilterQuery = '';
        saveDiffFilterQueryPreference('');
        const input = node.querySelector('#diffRecordFilterInput');
        if (input) {
          input.value = '';
          input.focus();
        }
        applyRecordFilter('');
      });

      const applyRecordFilter = (query) => {
        const normalized = String(query || '').trim().toLowerCase();
        let totalVisibleAcrossScopes = 0;
        ['added', 'removed', 'changed'].forEach((scope) => {
          const cards = Array.from(node.querySelectorAll(`details[data-diff-scope="${scope}"]`));
          let visibleCount = 0;
          cards.forEach((card) => {
            const haystack = (card.getAttribute('data-filter-text') || '').toLowerCase();
            const isVisible = !normalized || haystack.includes(normalized);
            card.classList.toggle('hidden', !isVisible);
            if (isVisible) {
              visibleCount += 1;
            }
          });
          const counter = node.querySelector(`[data-diff-visible-count="${scope}"]`);
          if (counter) {
            counter.textContent = String(visibleCount);
          }
          const sectionVisible = state.visibleScopes?.[scope] !== false;
          if (sectionVisible) {
            totalVisibleAcrossScopes += visibleCount;
          }
        });

        const anyScopeEnabled = Boolean(state.visibleScopes.added || state.visibleScopes.removed || state.visibleScopes.changed);
        const shouldShowFilterEmpty = Boolean(normalized) && anyScopeEnabled && totalVisibleAcrossScopes === 0;
        const filterEmptyNode = node.querySelector('[data-diff-filter-empty]');
        if (filterEmptyNode) {
          filterEmptyNode.classList.toggle('hidden', !shouldShowFilterEmpty);
        }
      };

      node.querySelector('[data-diff-expand-all]')?.addEventListener('click', () => {
        node.querySelectorAll('details[data-diff-scope]').forEach((card) => {
          card.open = true;
        });
        state.globalExpandedPreference = true;
        state.scopeExpandedPreference = {
          ...state.scopeExpandedPreference,
          added: true,
          removed: true,
          changed: true
        };
        saveGlobalExpandedPreference(true);
        saveScopeExpandedPreference(state.scopeExpandedPreference);
      });

      node.querySelector('[data-diff-collapse-all]')?.addEventListener('click', () => {
        node.querySelectorAll('details[data-diff-scope]').forEach((card) => {
          card.open = false;
        });
        state.globalExpandedPreference = false;
        state.scopeExpandedPreference = {
          ...state.scopeExpandedPreference,
          added: false,
          removed: false,
          changed: false
        };
        saveGlobalExpandedPreference(false);
        saveScopeExpandedPreference(state.scopeExpandedPreference);
      });

      node.querySelectorAll('details[data-diff-scope]').forEach((card) => {
        card.addEventListener('toggle', () => {
          const scope = card.getAttribute('data-diff-scope');
          if (!scope) return;
          const cardsForScope = Array.from(node.querySelectorAll(`details[data-diff-scope="${scope}"]`));
          if (!cardsForScope.length) return;
          const allOpen = cardsForScope.every((scopeCard) => scopeCard.open);
          const allClosed = cardsForScope.every((scopeCard) => !scopeCard.open);
          if (!allOpen && !allClosed) {
            return;
          }
          state.scopeExpandedPreference = {
            ...state.scopeExpandedPreference,
            [scope]: allOpen
          };
          saveScopeExpandedPreference(state.scopeExpandedPreference);
          const scopeValues = [
            state.scopeExpandedPreference.added,
            state.scopeExpandedPreference.removed,
            state.scopeExpandedPreference.changed
          ];
          const allSame = scopeValues.every((value) => typeof value === 'boolean') && new Set(scopeValues).size === 1;
          state.globalExpandedPreference = allSame ? scopeValues[0] : undefined;
          saveGlobalExpandedPreference(state.globalExpandedPreference);
        });
      });

      const changedFieldsOnlyToggle = node.querySelector('#diffChangedFieldsOnlyToggle');
      changedFieldsOnlyToggle?.addEventListener('change', () => {
        state.showChangedFieldsOnly = Boolean(changedFieldsOnlyToggle.checked);
        saveChangedFieldsOnlyPreference(state.showChangedFieldsOnly);
        renderDiffResults(analysis);
      });

      const recordFilterInput = node.querySelector('#diffRecordFilterInput');
      recordFilterInput?.addEventListener('input', () => {
        state.diffFilterQuery = String(recordFilterInput.value || '');
        saveDiffFilterQueryPreference(state.diffFilterQuery);
        applyRecordFilter(state.diffFilterQuery);
      });

      node.querySelector('#diffRecordFilterClear')?.addEventListener('click', () => {
        state.diffFilterQuery = '';
        saveDiffFilterQueryPreference('');
        if (recordFilterInput) {
          recordFilterInput.value = '';
          recordFilterInput.focus();
        }
        applyRecordFilter('');
      });
      applyRecordFilter(state.diffFilterQuery);
    }

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
    bindDiffShortcuts();
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
