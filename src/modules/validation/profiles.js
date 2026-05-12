(function attachDQCTProfiles(globalScope) {
  function safeJsonParse(text, fallback) {
    try {
      return text ? JSON.parse(text) : fallback;
    } catch {
      return fallback;
    }
  }

  function loadProfiles(storageKey, defaultProfile) {
    const stored = safeJsonParse(localStorage.getItem(storageKey), []);
    const map = new Map(stored.map((profile) => [profile.profile_name, profile]));
    map.set(defaultProfile.profile_name, structuredClone(defaultProfile));
    return Array.from(map.values());
  }

  function saveProfiles(storageKey, profiles) {
    localStorage.setItem(storageKey, JSON.stringify(profiles));
  }

  function loadUiState(uiStateKey) {
    return safeJsonParse(localStorage.getItem(uiStateKey), { expandedFields: [] });
  }

  function saveUiState(uiStateKey, uiState) {
    localStorage.setItem(uiStateKey, JSON.stringify(uiState));
  }

  function pruneRuns(runs) {
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
    return (runs || []).filter((run) => {
      const timestamp = Date.parse(run?.timestamp || "");
      return Number.isNaN(timestamp) ? true : timestamp >= cutoff;
    });
  }

  function saveRuns(runKey, runs) {
    localStorage.setItem(runKey, JSON.stringify(pruneRuns(runs).slice(-25)));
  }

  function loadRuns(runKey) {
    return pruneRuns(safeJsonParse(localStorage.getItem(runKey), []));
  }

  function loadSchemaBaselines(schemaKey) {
    return safeJsonParse(localStorage.getItem(schemaKey), {});
  }

  function saveSchemaBaselines(schemaKey, schemaBaselines) {
    localStorage.setItem(schemaKey, JSON.stringify(schemaBaselines));
  }

  globalScope.DQCTProfiles = {
    safeJsonParse,
    loadProfiles,
    saveProfiles,
    loadUiState,
    saveUiState,
    pruneRuns,
    saveRuns,
    loadRuns,
    loadSchemaBaselines,
    saveSchemaBaselines
  };
})(window);
