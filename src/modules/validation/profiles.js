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

  function compactRun(run) {
    return {
      timestamp: run?.timestamp || "",
      profileName: run?.profileName || run?.profile || "",
      failures: Number(run?.failures ?? run?.failureCount ?? 0),
      reopenTab: run?.reopenTab || undefined,
      label: run?.label || undefined
    };
  }

  function saveRuns(runKey, runs) {
    const pruned = pruneRuns(runs).slice(-25).map(compactRun);
    try {
      localStorage.setItem(runKey, JSON.stringify(pruned));
      return;
    } catch (e) {
      // Attempt progressively more aggressive pruning on quota errors
      try {
        console.warn('saveRuns: quota exceeded, retrying with smaller history', e);
        const smaller = pruned.slice(-5);
        localStorage.setItem(runKey, JSON.stringify(smaller));
        window.DQCTToasts?.showWarning?.('Run history truncated due to local storage limits.');
        return;
      } catch (e2) {
        try {
          console.warn('saveRuns: severe quota, retrying with single latest run', e2);
          const single = pruned.slice(-1);
          localStorage.setItem(runKey, JSON.stringify(single));
          window.DQCTToasts?.showWarning?.('Run history severely truncated due to storage limits.');
          return;
        } catch (e3) {
          console.error('saveRuns: unable to persist run history to localStorage, clearing key', e3);
          try { localStorage.removeItem(runKey); } catch (ignore) {}
          window.DQCTToasts?.showWarning?.('Unable to save run history due to storage limits. History cleared.');
        }
      }
    }
  }

  function loadRuns(runKey) {
    return pruneRuns(safeJsonParse(localStorage.getItem(runKey), [])).map(compactRun);
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
