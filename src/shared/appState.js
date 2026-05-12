(function attachDQCTAppState(globalScope) {
  const SETTINGS_KEY = "dqct.app.settings.v1";
  const RUN_HISTORY_KEY = "dqct.app.recentRuns.v1";
  const MAX_RECENT_RUNS = 10;
  const DEFAULT_SETTINGS = {
    defaultUniqueKey: "ProjectCode",
    ignoreFields: [],
    theme: "light",
    exportFormat: "pretty"
  };

  function safeJsonParse(text, fallback) {
    try {
      return text ? JSON.parse(text) : fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeSettings(settings) {
    const defaultUniqueKey = String(settings?.defaultUniqueKey || DEFAULT_SETTINGS.defaultUniqueKey).trim() || DEFAULT_SETTINGS.defaultUniqueKey;
    const ignoreFields = Array.isArray(settings?.ignoreFields)
      ? settings.ignoreFields.map((field) => String(field || "").trim()).filter(Boolean)
      : String(settings?.ignoreFields || "")
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);
    const theme = settings?.theme === "dark" ? "dark" : "light";
    const exportFormat = settings?.exportFormat === "minified" ? "minified" : "pretty";
    return {
      defaultUniqueKey,
      ignoreFields,
      theme,
      exportFormat
    };
  }

  function loadSettings() {
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...safeJsonParse(localStorage.getItem(SETTINGS_KEY), {}) });
  }

  function applyTheme(theme) {
    const normalizedTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", normalizedTheme);
  }

  function saveSettings(nextSettings) {
    const normalized = normalizeSettings(nextSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    applyTheme(normalized.theme);
    globalScope.dispatchEvent(new CustomEvent("dqct:settings-changed", { detail: normalized }));
    return normalized;
  }

  function updateSettings(patch) {
    const current = loadSettings();
    return saveSettings({ ...current, ...patch });
  }

  function resetSettings() {
    return saveSettings(DEFAULT_SETTINGS);
  }

  function normalizeRunEntry(entry) {
    return {
      timestamp: String(entry?.timestamp || new Date().toISOString()),
      type: entry?.type === "diff" ? "diff" : "validate",
      summary: entry?.summary && typeof entry.summary === "object" ? entry.summary : {},
      exportFiles: Array.isArray(entry?.exportFiles) ? entry.exportFiles.map((file) => String(file || "").trim()).filter(Boolean) : [],
      reopenTab: entry?.reopenTab || (entry?.type === "diff" ? "diff" : "validate"),
      label: String(entry?.label || "")
    };
  }

  function loadRecentRuns() {
    const runs = safeJsonParse(localStorage.getItem(RUN_HISTORY_KEY), []);
    if (!Array.isArray(runs)) {
      return [];
    }
    return runs
      .map(normalizeRunEntry)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, MAX_RECENT_RUNS);
  }

  function saveRecentRuns(runs) {
    const normalized = (Array.isArray(runs) ? runs : [])
      .map(normalizeRunEntry)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, MAX_RECENT_RUNS);
    localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(normalized));
    globalScope.dispatchEvent(new CustomEvent("dqct:runs-changed", { detail: normalized }));
    return normalized;
  }

  function addRecentRun(entry) {
    const runs = loadRecentRuns();
    runs.unshift(normalizeRunEntry(entry));
    return saveRecentRuns(runs);
  }

  applyTheme(loadSettings().theme);

  globalScope.DQCTAppState = {
    defaultSettings: structuredClone(DEFAULT_SETTINGS),
    getSettings: loadSettings,
    saveSettings,
    updateSettings,
    resetSettings,
    getRecentRuns: loadRecentRuns,
    saveRecentRuns,
    addRecentRun
  };
})(window);
