const DEFAULT_STANDARD_PROFILE = {
  profile_name: "Standard Profile",
  source: "Built-in standard profile",
  version: "1.0",
  root_array: "Export",
  rules: [
    { id: "R01", layer: "core", field: "AgentName", type: "required", severity: "high", enabled: true, notes: "Always required - identifies the scraper source" },
    { id: "R02", layer: "core", field: "AgentID", type: "required", severity: "high", enabled: true, notes: "Always required" },
    { id: "R03", layer: "core", field: "LegacyAgentID", type: "required", severity: "high", enabled: true, notes: "Always required" },
    { id: "R04", layer: "core", field: "ResourceURL", type: "required", severity: "high", enabled: true, notes: "Always required - source portal link" },
    { id: "R05", layer: "domain", field: "ProjectCode", type: "required", severity: "medium", enabled: true, notes: "Primary bid identifier; missing values should warn, not fail" },
    { id: "R06", layer: "domain", field: "ProjectCode", type: "unique", severity: "high", enabled: true, notes: "No duplicate bids in same file" },
    { id: "R07", layer: "domain", field: "ProjectCode", type: "regex", severity: "medium", enabled: true, pattern: "^SRC\\d{10}$", notes: "Standard profile project code format" },
    { id: "R08", layer: "domain", field: "Title", type: "required", severity: "high", enabled: true, notes: "Bid title required for publication" },
    { id: "R09", layer: "domain", field: "BidURL", type: "required", severity: "high", enabled: true, notes: "Direct link to bid on source portal" },
    { id: "R10", layer: "domain", field: "BidURL", type: "regex", severity: "medium", enabled: true, pattern: "^https://", notes: "Must be a secure URL" },
    { id: "R11", layer: "domain", field: "BidStatus", type: "enum", severity: "high", enabled: true, allowed: ["Open for Bidding", "Closed", "Cancelled", "Awarded", "Terminated"], notes: "Known status values for this profile" },
    { id: "R12", layer: "domain", field: "PublishedDate", type: "required", severity: "high", enabled: true, notes: "Required for publication" },
    { id: "R13", layer: "domain", field: "PublishedDate", type: "date_format", severity: "medium", enabled: true, notes: "Accepts any recognizable date format across all portals" },
    { id: "R14", layer: "domain", field: "DueDate", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Open for Bidding" }, notes: "Open bids should have a due date" },
    { id: "R15", layer: "domain", field: "AwardedVendorName", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Awarded" }, notes: "Awarded bids should name the vendor" },
    { id: "R16", layer: "domain", field: "BidDocuments", type: "documents_have_required_keys", severity: "high", enabled: true, required_keys: ["Title", "URL", "Hash"], run_if_not_empty: true, notes: "Each bid document must have Title, URL, Hash" },
    { id: "R17", layer: "domain", field: "AddendumDocuments", type: "documents_have_required_keys", severity: "high", enabled: true, required_keys: ["Title", "URL", "Hash"], run_if_not_empty: true, notes: "Each addendum document must have Title, URL, Hash" },
    { id: "R18", layer: "domain", field: "BidTabulations", type: "documents_have_required_keys", severity: "high", enabled: true, required_keys: ["Title", "URL", "Hash"], run_if_not_empty: true, notes: "Each tabulation must have Title, URL, Hash" },
    { id: "R19", layer: "domain", field: "AwardDocuments", type: "documents_have_required_keys", severity: "high", enabled: true, required_keys: ["Title", "URL", "Hash"], run_if_not_empty: true, notes: "Each award document must have Title, URL, Hash" },
    { id: "R20", layer: "domain", field: "BidDocuments", type: "hash_count_matches_documents", severity: "medium", enabled: true, hash_field: "BidDocumentHashes", notes: "Hash count must match document count" },
    { id: "R21", layer: "domain", field: "AddendumDocuments", type: "hash_count_matches_documents", severity: "medium", enabled: true, hash_field: "AddendumDocumentHashes", notes: "Hash count must match document count" },
    { id: "R22", layer: "domain", field: "BidTabulations", type: "hash_count_matches_documents", severity: "medium", enabled: true, hash_field: "BidTabulationHashes", notes: "Hash count must match document count" },
    { id: "R23", layer: "domain", field: "AwardDocuments", type: "hash_count_matches_documents", severity: "medium", enabled: true, hash_field: "AwardDocumentHashes", notes: "Hash count must match document count" },
    { id: "R24", layer: "domain", field: "BidDocuments", type: "no_duplicate_documents", severity: "medium", enabled: true, run_if_not_empty: true, notes: "Detects scraper deduplication failures" },
    { id: "R25", layer: "diagnostic", field: "Description", type: "required", severity: "medium", enabled: true, notes: "Description should be present; missing values should warn" },
    { id: "R26", layer: "diagnostic", field: "BidType", type: "required", severity: "low", enabled: false, notes: "Enable to audit bid type classification" },
    { id: "R27", layer: "diagnostic", field: "ContractValue", type: "required", severity: "low", enabled: false, notes: "Enable to check awarded bids have contract values" },
    { id: "R28", layer: "diagnostic", field: "IssuingAgencyCity", type: "required", severity: "low", enabled: false, notes: "Enable to audit agency address coverage" },
    { id: "R29", layer: "diagnostic", field: "ContactEmail", type: "required", severity: "low", enabled: false, notes: "Enable to audit contact info coverage" },
    { id: "R30", layer: "diagnostic", field: "DueDate", type: "not_future", severity: "low", enabled: false, notes: "Sanity check: due dates are not unreasonably far in future" },
    { id: "R31", layer: "diagnostic", field: "PublishedDate", type: "ambiguous_date", severity: "low", enabled: false, notes: "Flag ambiguous published dates" },
    { id: "R32", layer: "diagnostic", field: "DueDate", type: "ambiguous_date", severity: "low", enabled: false, notes: "Flag ambiguous due dates" },
    { id: "R33", layer: "diagnostic", field: "AwardDate", type: "ambiguous_date", severity: "low", enabled: false, notes: "Flag ambiguous award dates" },
    { id: "R34", layer: "domain", field: "BidDocuments", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Open for Bidding" }, notes: "Open bids should have supporting documents" },
    { id: "R35", layer: "domain", field: "BidDocuments", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Closed" }, notes: "Closed bids should have supporting documents" },
    { id: "R36", layer: "domain", field: "AwardDate", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Awarded" }, notes: "Awarded bids should record the award date" },
    { id: "R37", layer: "domain", field: "BidStatus", type: "terminated_award_check", severity: "medium", enabled: true, notes: "Flag Terminated bids that have award data" }
  ]
};

function clone(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function getDefaultStandardProfile() {
  return clone(DEFAULT_STANDARD_PROFILE);
}

function safeJsonParse(text, fallback) {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

function loadProfiles(storageKey, defaultProfile = getDefaultStandardProfile()) {
  const stored = safeJsonParse(localStorage.getItem(storageKey), []);
  const map = new Map(stored.map((profile) => [profile.profile_name, profile]));
  map.set(defaultProfile.profile_name, clone(defaultProfile));
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
      globalThis.DQCTToasts?.showWarning?.('Run history truncated due to local storage limits.');
      return;
    } catch (e2) {
      try {
        console.warn('saveRuns: severe quota, retrying with single latest run', e2);
        const single = pruned.slice(-1);
        localStorage.setItem(runKey, JSON.stringify(single));
        globalThis.DQCTToasts?.showWarning?.('Run history severely truncated due to storage limits.');
        return;
      } catch (e3) {
        console.error('saveRuns: unable to persist run history to localStorage, clearing key', e3);
        try { localStorage.removeItem(runKey); } catch (ignore) {}
        globalThis.DQCTToasts?.showWarning?.('Unable to save run history due to storage limits. History cleared.');
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

export {
  DEFAULT_STANDARD_PROFILE as defaultStandardProfile,
  compactRun,
  getDefaultStandardProfile,
  loadProfiles,
  loadRuns,
  loadSchemaBaselines,
  loadUiState,
  pruneRuns,
  safeJsonParse,
  saveProfiles,
  saveRuns,
  saveSchemaBaselines,
  saveUiState
};
