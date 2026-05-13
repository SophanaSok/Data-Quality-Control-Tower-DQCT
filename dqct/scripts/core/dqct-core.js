      const STORAGE_KEY = "dqct.profiles.v1";
      const UI_STATE_KEY = "dqct.ui.v1";
      const RUN_KEY = "dqct.runs.v1";
      const SCHEMA_KEY = "dqct.schemas.v1";
      const HISTORY_DB_NAME = "dqct-history-db";
      const HISTORY_STORE_NAME = "runs";
      const MAX_FILES = 10;
      const MAX_FILE_SIZE = 50 * 1024 * 1024;

      const defaultProfile = {
        profile_name: "Standard Profile",
        source: "Built-in standard profile",
        version: "1.0",
        root_array: "Export",
        rules: [
          { id: "R01", layer: "core", field: "AgentName", type: "required", severity: "high", enabled: true, notes: "Always required — identifies the scraper source" },
          { id: "R02", layer: "core", field: "AgentID", type: "required", severity: "high", enabled: true, notes: "Always required" },
          { id: "R03", layer: "core", field: "LegacyAgentID", type: "required", severity: "high", enabled: true, notes: "Always required" },
          { id: "R04", layer: "core", field: "ResourceURL", type: "required", severity: "high", enabled: true, notes: "Always required — source portal link" },
          { id: "R05", layer: "domain", field: "ProjectCode", type: "required", severity: "high", enabled: true, notes: "Primary bid identifier" },
          { id: "R06", layer: "domain", field: "ProjectCode", type: "unique", severity: "high", enabled: true, notes: "No duplicate bids in same file" },
          { id: "R07", layer: "domain", field: "ProjectCode", type: "regex", severity: "medium", enabled: true, pattern: "^SRC\\d{10}$", notes: "Standard profile project code format" },
          { id: "R08", layer: "domain", field: "Title", type: "required", severity: "high", enabled: true, notes: "Bid title required for publication" },
          { id: "R09", layer: "domain", field: "BidURL", type: "required", severity: "high", enabled: true, notes: "Direct link to bid on source portal" },
          { id: "R10", layer: "domain", field: "BidURL", type: "regex", severity: "medium", enabled: true, pattern: "^https://", notes: "Must be a secure URL" },
          { id: "R11", layer: "domain", field: "BidStatus", type: "enum", severity: "high", enabled: true, allowed: ["Open for Bidding", "Closed", "Cancelled", "Awarded"], notes: "Known status values for this profile" },
          { id: "R12", layer: "domain", field: "PublishedDate", type: "required", severity: "high", enabled: true, notes: "Required for publication" },
          { id: "R13", layer: "domain", field: "PublishedDate", type: "date_format", severity: "medium", enabled: true, notes: "Accepts any recognizable date format across all portals — flags only unparseable values" },
          { id: "R14", layer: "domain", field: "DueDate", type: "required_if", severity: "high", enabled: true, condition: { field: "BidStatus", equals: "Open for Bidding" }, notes: "Open bids must have a due date" },
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
          { id: "R25", layer: "diagnostic", field: "Description", type: "required", severity: "low", enabled: false, notes: "Enable to audit description coverage" },
          { id: "R26", layer: "diagnostic", field: "BidType", type: "required", severity: "low", enabled: false, notes: "Enable to audit bid type classification" },
          { id: "R27", layer: "diagnostic", field: "ContractValue", type: "required", severity: "low", enabled: false, notes: "Enable to check awarded bids have contract values" },
          { id: "R28", layer: "diagnostic", field: "IssuingAgencyCity", type: "required", severity: "low", enabled: false, notes: "Enable to audit agency address coverage" },
          { id: "R29", layer: "diagnostic", field: "ContactEmail", type: "required", severity: "low", enabled: false, notes: "Enable to audit contact info coverage" },
          { id: "R30", layer: "diagnostic", field: "DueDate", type: "not_future", severity: "low", enabled: false, notes: "Sanity check: due dates are not unreasonably far in future" },
          { id: "R31", layer: "diagnostic", field: "PublishedDate", type: "ambiguous_date", severity: "low", enabled: false, notes: "Flag dates like 04/05/2026 where day/month order is ambiguous — useful for auditing portal-level format inconsistency" },
          { id: "R32", layer: "diagnostic", field: "DueDate", type: "ambiguous_date", severity: "low", enabled: false, notes: "Flag ambiguous due dates — enable when comparing data across multiple portal sources" },
          { id: "R33", layer: "diagnostic", field: "AwardDate", type: "ambiguous_date", severity: "low", enabled: false, notes: "Flag ambiguous award dates" },
          { id: "R34", layer: "domain", field: "BidDocuments", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Open for Bidding" }, notes: "Open bids should have supporting documents" },
          { id: "R35", layer: "domain", field: "BidDocuments", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Closed" }, notes: "Closed bids should have supporting documents" },
          { id: "R36", layer: "domain", field: "AwardDate", type: "required_if", severity: "medium", enabled: true, condition: { field: "BidStatus", equals: "Awarded" }, notes: "Awarded bids should record the award date" },
          { id: "R37", layer: "domain", field: "BidStatus", type: "terminated_award_check", severity: "medium", enabled: true, notes: "Flag Terminated bids that have award data (unexpected pattern)" }
        ]
      };

      const state = {
        profiles: loadProfiles(),
        activeProfileId: defaultProfile.profile_name,
        editingProfile: null,
        expandedFields: new Set(loadUiState().expandedFields || []),
        files: [],
        parsedRuns: [],
        results: [],
        recordSummaries: [],
        exactDuplicates: [],
        nearDuplicates: [],
        runHistory: [],
        schemaBaselines: loadSchemaBaselines(),
        currentSchema: null,
        currentDrift: { added: [], removed: [], typeChanges: [] },
        currentAnomalies: [],
        currentRunStats: null,
        currentIssueGroups: [],
        currentLayer: "all",
        ruleSearch: "",
        runtimeOverrides: new Set(),
        viewMode: "failures",
        historyFilters: { status: 'all', from: null, to: null, search: '' },
        duplicateFilter: "all"
      };

      const els = {
        fileInput: document.getElementById("fileInput"),
        profileSelect: document.getElementById("profileSelect"),
        loadedFileCount: document.getElementById("loadedFileCount"),
        loadedFileMeta: document.getElementById("loadedFileMeta"),
        activeProfileLabel: document.getElementById("activeProfileLabel"),
        activeProfileMeta: document.getElementById("activeProfileMeta"),
        failureCount: document.getElementById("failureCount"),
        failureMeta: document.getElementById("failureMeta"),
        fileList: document.getElementById("fileList"),
        rulesList: document.getElementById("rulesList"),
        summaryLayout: document.getElementById("summaryLayout"),
        dashboardRunsToday: document.getElementById("dashboardRunsToday"),
        dashboardRunsTodayMeta: document.getElementById("dashboardRunsTodayMeta"),
        dashboardFilesChecked: document.getElementById("dashboardFilesChecked"),
        dashboardFilesCheckedMeta: document.getElementById("dashboardFilesCheckedMeta"),
        dashboardPassRate: document.getElementById("dashboardPassRate"),
        dashboardPassRateMeta: document.getElementById("dashboardPassRateMeta"),
        dashboardOpenIssues: document.getElementById("dashboardOpenIssues"),
        dashboardOpenIssuesMeta: document.getElementById("dashboardOpenIssuesMeta"),
        historyBadge: document.getElementById("historyBadge"),
        runHistoryBody: document.getElementById("runHistoryBody"),
        trendSparkline: document.getElementById("trendSparkline"),
        recentIssuesFeed: document.getElementById("recentIssuesFeed"),
        // Run history filters
        runFilterStatus: document.getElementById("runFilterStatus"),
        runFilterFrom: document.getElementById("runFilterFrom"),
        runFilterTo: document.getElementById("runFilterTo"),
        runFilterSearch: document.getElementById("runFilterSearch"),
        baselineSchemaMeta: document.getElementById("baselineSchemaMeta"),
        baselineSchemaFields: document.getElementById("baselineSchemaFields"),
        incomingSchemaMeta: document.getElementById("incomingSchemaMeta"),
        incomingSchemaFields: document.getElementById("incomingSchemaFields"),
        addedFieldsList: document.getElementById("addedFieldsList"),
        removedFieldsList: document.getElementById("removedFieldsList"),
        typeChangesList: document.getElementById("typeChangesList"),
        driftDiffList: document.getElementById("driftDiffList"),
        anomaliesList: document.getElementById("anomaliesList"),
        issueSummaryList: document.getElementById("issueSummaryList"),
        ticketPreview: document.getElementById("ticketPreview"),
        resultsTable: document.getElementById("resultsTable"),
        resultsBody: document.getElementById("resultsBody"),
        resultsWrap: document.getElementById("resultsWrap"),
        recordSummariesTable: document.getElementById("recordSummariesTable"),
        recordSummariesBody: document.getElementById("recordSummariesBody"),
        recordSummariesWrap: document.getElementById("recordSummariesWrap"),
        viewToggle: document.getElementById("viewToggle"),
        failureViewHelper: document.getElementById("failureViewHelper"),
        recordViewHelper: document.getElementById("recordViewHelper"),
        nearDuplicateHelper: document.getElementById("nearDuplicateHelper"),
        duplicateSummaryBar: document.getElementById("duplicateSummaryBar"),
        exactDuplicateGroupCount: document.getElementById("exactDuplicateGroupCount"),
        nearDuplicateGroupCount: document.getElementById("nearDuplicateGroupCount"),
        duplicateRecordCount: document.getElementById("duplicateRecordCount"),
        downloadRecordSummariesButton: document.getElementById("downloadRecordSummariesButton"),
        downloadNearDuplicatesButton: document.getElementById("downloadNearDuplicatesButton"),
        emptyState: document.getElementById("emptyState"),
        dropzone: document.getElementById("dropzone"),
        runButton: document.getElementById("runButton"),
        exportButton: document.getElementById("exportButton"),
        actionStatus: document.getElementById("actionStatus"),
        downloadIssuesButton: document.getElementById("downloadIssuesButton"),
        clearFilesButton: document.getElementById("clearFilesButton"),
        seedDemoButton: document.getElementById("seedDemoButton"),
        profileList: document.getElementById("profileList"),
        cloneProfileButton: document.getElementById("cloneProfileButton"),
        importSchemaButton: document.getElementById("importSchemaButton"),
        schemaImportInput: document.getElementById("schemaImportInput"),
        saveProfileButton: document.getElementById("saveProfileButton"),
        resetProfileButton: document.getElementById("resetProfileButton"),
        newProfileName: document.getElementById("newProfileName"),
        newRootArray: document.getElementById("newRootArray"),
        searchRules: document.getElementById("searchRules"),
        runtimeOverrides: document.getElementById("runtimeOverrides"),
        showCore: document.getElementById("showCore"),
        showDomain: document.getElementById("showDomain"),
        showDiagnostic: document.getElementById("showDiagnostic"),
        showAll: document.getElementById("showAll")
      };

      function loadProfiles() {
        return window.DQCTProfiles.loadProfiles(STORAGE_KEY, defaultProfile);
      }

      function saveProfiles() {
        window.DQCTProfiles.saveProfiles(STORAGE_KEY, state.profiles);
      }

      function loadUiState() {
        return window.DQCTProfiles.loadUiState(UI_STATE_KEY);
      }

      function saveUiState() {
        window.DQCTProfiles.saveUiState(UI_STATE_KEY, { expandedFields: Array.from(state.expandedFields || []) });
      }

      function saveRuns(runs) {
        window.DQCTProfiles.saveRuns(RUN_KEY, runs);
      }

      function loadSchemaBaselines() {
        return window.DQCTProfiles.loadSchemaBaselines(SCHEMA_KEY);
      }

      function saveSchemaBaselines() {
        window.DQCTProfiles.saveSchemaBaselines(SCHEMA_KEY, state.schemaBaselines);
      }

      function loadRuns() {
        return window.DQCTProfiles.loadRuns(RUN_KEY);
      }

      function pruneRuns(runs) {
        return window.DQCTProfiles.pruneRuns(runs);
      }

      function openHistoryDb() {
        return new Promise((resolve, reject) => {
          if (!window.indexedDB) {
            reject(new Error("IndexedDB unavailable"));
            return;
          }

          const request = indexedDB.open(HISTORY_DB_NAME, 1);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
              const store = db.createObjectStore(HISTORY_STORE_NAME, { keyPath: "id", autoIncrement: true });
              store.createIndex("profileName", "profileName", { unique: false });
              store.createIndex("timestamp", "timestamp", { unique: false });
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error || new Error("Unable to open history database"));
        });
      }

      function historyFallbackLoad() {
        return safeJsonParse(localStorage.getItem(`${RUN_KEY}.historyFallback`), []);
      }

      function historyFallbackSave(records) {
        localStorage.setItem(`${RUN_KEY}.historyFallback`, JSON.stringify(records.slice(-100)));
      }

      function pruneHistoryRecords(records) {
        const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
        return (records || []).filter((record) => {
          const timestamp = Date.parse(record?.timestamp || "");
          return Number.isNaN(timestamp) ? true : timestamp >= cutoff;
        });
      }

      async function pruneIndexedDbHistory(db) {
        const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
        await new Promise((resolve, reject) => {
          const tx = db.transaction(HISTORY_STORE_NAME, "readwrite");
          const store = tx.objectStore(HISTORY_STORE_NAME);
          const request = store.getAll();
          request.onsuccess = () => {
            (request.result || []).forEach((record) => {
              const timestamp = Date.parse(record?.timestamp || "");
              if (!Number.isNaN(timestamp) && timestamp < cutoff && record.id !== undefined) {
                store.delete(record.id);
              }
            });
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error("Unable to prune history"));
        });
      }

      async function loadRunHistory() {
        try {
          const db = await openHistoryDb();
          return await new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, "readonly");
            const request = tx.objectStore(HISTORY_STORE_NAME).getAll();
            request.onsuccess = () => {
              pruneIndexedDbHistory(db).catch(() => {});
              resolve(pruneHistoryRecords(request.result || []));
            };
            request.onerror = () => reject(request.error || new Error("Unable to read history"));
          });
        } catch {
          return pruneHistoryRecords(historyFallbackLoad());
        }
      }

      async function saveRunHistory(record) {
        try {
          const db = await openHistoryDb();
          await new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, "readwrite");
            tx.objectStore(HISTORY_STORE_NAME).add(record);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("Unable to save history"));
          });
          await pruneIndexedDbHistory(db);
        } catch {
          const fallback = historyFallbackLoad();
          fallback.push(record);
          historyFallbackSave(pruneHistoryRecords(fallback));
        }
      }

      function safeJsonParse(text, fallback) {
        return window.DQCTProfiles.safeJsonParse(text, fallback);
      }

      function extractRecordsFromPayload(payload) {
        return window.DQCTParser.extractRecordsFromPayload(payload);
      }

      function activeProfile() {
        return state.profiles.find((profile) => profile.profile_name === state.activeProfileId) || state.profiles[0];
      }

      function clone(obj) {
        return structuredClone(obj);
      }

      function normalizeProfile(profile) {
        return {
          ...profile,
          rules: profile.rules.map((rule) => ({ ...rule }))
        };
      }

      function deleteRule(ruleId) {
        const profile = activeProfile();
        const nextRules = profile.rules.filter((rule) => rule.id !== ruleId);
        if (nextRules.length === profile.rules.length) {
          return false;
        }

        const nextProfile = { ...profile, rules: nextRules };
        state.profiles = state.profiles.map((item) => (item.profile_name === profile.profile_name ? nextProfile : item));
        saveProfiles();
        render();
        return true;
      }

      function deleteRulesByField(fieldName) {
        if (!fieldName) return false;

        const profile = activeProfile();
        const nextRules = profile.rules.filter((rule) => (rule.field || "(no field)") !== fieldName);
        if (nextRules.length === profile.rules.length) {
          return false;
        }

        const nextProfile = { ...profile, rules: nextRules };
        state.profiles = state.profiles.map((item) => (item.profile_name === profile.profile_name ? nextProfile : item));
        saveProfiles();
        render();
        return true;
      }

      function deleteProfile(profileName) {
        if (!profileName) return false;
        const before = state.profiles.length;
        state.profiles = state.profiles.filter((p) => p.profile_name !== profileName);
        if (state.profiles.length === before) return false;

        if (state.activeProfileId === profileName) {
          state.activeProfileId = state.profiles[0]?.profile_name || defaultProfile.profile_name;
        }

        // Remove any saved schema baseline for the profile
        if (state.schemaBaselines && state.schemaBaselines[profileName]) {
          delete state.schemaBaselines[profileName];
          saveSchemaBaselines();
        }

        // Remove runs stored in localStorage for this profile
        try {
          const runs = loadRuns();
          const filtered = (runs || []).filter((r) => r.profileName !== profileName);
          saveRuns(filtered);
        } catch (err) {
          // silently ignore prune errors for run history cleanup
        }

        saveProfiles();
        render();
        return true;
      }

      function renameProfile(oldName, newName, newSource) {
        if (!oldName || !newName) return false;
        if (oldName === newName) {
          // still update description/source
          state.profiles = state.profiles.map((p) => (p.profile_name === oldName ? { ...p, source: newSource || p.source } : p));
          saveProfiles();
          render();
          return true;
        }

        // prevent name collision
        if (state.profiles.some((p) => p.profile_name === newName)) return false;

        state.profiles = state.profiles.map((p) => {
          if (p.profile_name === oldName) {
            return { ...p, profile_name: newName, source: newSource || p.source };
          }
          return p;
        });

        // move schema baseline key if exists
        if (state.schemaBaselines && state.schemaBaselines[oldName]) {
          state.schemaBaselines[newName] = state.schemaBaselines[oldName];
          delete state.schemaBaselines[oldName];
          saveSchemaBaselines();
        }

        // update run history entries
        try {
          const runs = loadRuns() || [];
          const updated = runs.map((r) => (r.profileName === oldName ? { ...r, profileName: newName } : r));
          saveRuns(updated);
        } catch (err) {
          // silently ignore errors updating run history
        }

        // update active profile id if necessary
        if (state.activeProfileId === oldName) state.activeProfileId = newName;

        saveProfiles();
        render();
        return true;
      }

      function setActiveProfile(name) {
        state.activeProfileId = name;
        render();
      }

      function updateRuntimeOverrides() {
        const values = els.runtimeOverrides.value.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean);
        state.runtimeOverrides = new Set(values);
      }

      function readTextFile(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
          reader.readAsText(file);
        });
      }

      async function ingestFiles(fileList) {
        const files = Array.from(fileList).slice(0, MAX_FILES);
        if (!files.length) {
          return;
        }

        const parsedFiles = [];
        for (const file of files) {
          if (file.size > MAX_FILE_SIZE) {
            alert(`${file.name} exceeds the 50 MB limit.`);
            continue;
          }

          try {
            const text = await readTextFile(file);
            const json = window.DQCTParser.parseJsonText(text);
            const extracted = extractRecordsFromPayload(json);
            if (!extracted) {
              throw new Error('Root must be an array or an object with an "Export" array.');
            }

            parsedFiles.push({
              name: file.name,
              size: file.size,
              records: window.DQCTParser.normalizeRecords(extracted.records),
              raw: json,
              status: "ready"
            });
          } catch (error) {
            parsedFiles.push({
              name: file.name,
              size: file.size,
              records: [],
              raw: null,
              status: "error",
              error: error.message || String(error)
            });
          }
        }

        state.files = parsedFiles;
        render();
      }

      function parseDocumentCollection(value) {
        return window.DQCTValidationEngine.parseDocumentCollection(value);
      }

      function inferFieldType(value) {
        if (value === null || value === undefined || value === "") {
          return "empty";
        }
        if (Array.isArray(value)) {
          return "array";
        }
        if (value instanceof Date) {
          return "date";
        }
        const type = typeof value;
        if (type === "number") {
          return Number.isFinite(value) ? "number" : "non-finite-number";
        }
        if (type === "boolean") {
          return "boolean";
        }
        if (type === "object") {
          return "object";
        }
        return "string";
      }

      function inferSchema(records) {
        const fieldMap = new Map();
        records.forEach((record) => {
          Object.entries(record || {}).forEach(([field, value]) => {
            const existing = fieldMap.get(field) || { field, count: 0, nullCount: 0, types: new Map() };
            existing.count += 1;
            if (isEmpty(value)) {
              existing.nullCount += 1;
            }
            const inferredType = inferFieldType(value);
            existing.types.set(inferredType, (existing.types.get(inferredType) || 0) + 1);
            fieldMap.set(field, existing);
          });
        });

        return {
          fields: Array.from(fieldMap.values()).map((entry) => {
            const sortedTypes = Array.from(entry.types.entries()).sort((a, b) => b[1] - a[1]);
            return {
              field: entry.field,
              type: sortedTypes[0]?.[0] || "empty",
              types: sortedTypes.map(([type]) => type),
              count: entry.count,
              nullCount: entry.nullCount,
              nullRate: entry.count ? entry.nullCount / entry.count : 0
            };
          }).sort((a, b) => a.field.localeCompare(b.field))
        };
      }

      function compareSchemas(baseline, incoming) {
        const baselineFields = new Map((baseline?.fields || []).map((field) => [field.field, field]));
        const incomingFields = new Map((incoming?.fields || []).map((field) => [field.field, field]));
        const added = [];
        const removed = [];
        const typeChanges = [];

        for (const [fieldName, field] of incomingFields.entries()) {
          if (!baselineFields.has(fieldName)) {
            added.push(field);
          } else {
            const baselineField = baselineFields.get(fieldName);
            if (baselineField.type !== field.type) {
              typeChanges.push({ field: fieldName, baseline: baselineField.type, incoming: field.type });
            }
          }
        }

        for (const [fieldName, field] of baselineFields.entries()) {
          if (!incomingFields.has(fieldName)) {
            removed.push(field);
          }
        }

        return { added, removed, typeChanges };
      }

      function buildRunStats(records, results, profile) {
        const schema = inferSchema(records);
        const rowCount = records.length;
        const nullRates = Object.fromEntries(schema.fields.map((field) => [field.field, field.nullRate]));
        const enumValues = {};

        profile.rules.filter((rule) => rule.enabled && rule.type === "enum").forEach((rule) => {
          enumValues[rule.field] = Array.from(new Set(records.map((record) => record[rule.field]).filter((value) => !isEmpty(value))));
        });

        const duplicateDocumentCount = results.filter((result) => result.ruleId === "R24" || result.ruleType === "no_duplicate_documents").length;

        return {
          rowCount,
          nullRates,
          enumValues,
          duplicateDocumentCount,
          failureCount: results.length,
          passRate: rowCount ? Math.max(0, (rowCount - results.length) / rowCount) : 1,
          schema
        };
      }

      function buildImportedProfile(records, sourceName, rootArray) {
        const schema = inferSchema(records);
        const safeSourceName = String(sourceName || "Imported schema").replace(/\.json$/i, "");
        const profileName = `Draft schema: ${safeSourceName}`;
        const rules = [];
        let ruleNumber = 1;

        schema.fields.forEach((field) => {
          if (field.nullRate === 0) {
            rules.push({
              id: `S${String(ruleNumber).padStart(2, "0")}`,
              layer: "domain",
              field: field.field,
              type: "required",
              severity: "high",
              enabled: true,
              notes: "Imported from sample schema; review before saving"
            });
            ruleNumber += 1;
          }

          if (field.type && field.type !== "empty") {
            rules.push({
              id: `S${String(ruleNumber).padStart(2, "0")}`,
              layer: "diagnostic",
              field: field.field,
              type: "type",
              severity: "medium",
              enabled: true,
              expected_type: field.type,
              notes: "Imported from sample schema; confirm inferred type"
            });
            ruleNumber += 1;
          }
        });

        return {
          profile_name: profileName,
          source: `Imported from ${sourceName}`,
          version: "draft-1.0",
          root_array: rootArray || "Export",
          draft: true,
          imported_from: sourceName,
          imported_at: new Date().toISOString(),
          schema_summary: schema,
          rules
        };
      }

      function detectAnomalies(currentStats, previousStats, profile) {
        if (!previousStats) {
          return [];
        }

        const anomalies = [];
        const currentRows = currentStats.rowCount || 0;
        const previousRows = previousStats.rowCount || 0;
        if (previousRows > 0) {
          if (currentRows < previousRows * 0.7) {
            anomalies.push({ type: "row_count_drop", severity: "warn", label: "Row count drop", detail: `${currentRows} rows vs ${previousRows} on the prior run.` });
          } else if (currentRows > previousRows * 3) {
            anomalies.push({ type: "row_count_spike", severity: "warn", label: "Row count spike", detail: `${currentRows} rows vs ${previousRows} on the prior run.` });
          }
        }

        const fieldNames = new Set([...Object.keys(previousStats.nullRates || {}), ...Object.keys(currentStats.nullRates || {})]);
        fieldNames.forEach((fieldName) => {
          const previousRate = previousStats.nullRates?.[fieldName] || 0;
          const currentRate = currentStats.nullRates?.[fieldName] || 0;
          const delta = previousRate === 0 ? (currentRate > 0 ? 1 : 0) : Math.abs(currentRate - previousRate) / previousRate;
          if ((previousRate === 0 && currentRate > 0) || delta > 0.2) {
            anomalies.push({
              type: "null_rate_change",
              severity: currentRate > previousRate ? "warn" : "info",
              label: `${fieldName} null rate shifted`,
              detail: `Previous ${(previousRate * 100).toFixed(1)}% vs current ${(currentRate * 100).toFixed(1)}%.`
            });
          }
        });

        profile.rules.filter((rule) => rule.enabled && rule.type === "enum").forEach((rule) => {
          const previousValues = previousStats.enumValues?.[rule.field] || [];
          const currentValues = currentStats.enumValues?.[rule.field] || [];
          const unseen = currentValues.filter((value) => !previousValues.includes(value));
          if (unseen.length) {
            anomalies.push({
              type: "new_enum_value",
              severity: "warn",
              label: `${rule.field} gained new values`,
              detail: unseen.slice(0, 5).map((value) => String(value)).join(", ")
            });
          }
        });

        if ((currentStats.duplicateDocumentCount || 0) > (previousStats.duplicateDocumentCount || 0)) {
          anomalies.push({
            type: "duplicate_document_increase",
            severity: "warn",
            label: "Duplicate document count increased",
            detail: `${currentStats.duplicateDocumentCount} vs ${previousStats.duplicateDocumentCount} on the prior run.`
          });
        }

        return anomalies;
      }

      function getLoadedRecords() {
        return state.files.filter((file) => file.status === "ready").flatMap((file) => file.records);
      }

      function getLatestHistoryForProfile(profileName) {
        return [...state.runHistory].filter((run) => run.profileName === profileName).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }

      function getLatestRunForProfile(profileName) {
        const runs = getLatestHistoryForProfile(profileName);
        return runs[0] || null;
      }

      function getPrimaryId(record) {
        const uniqueKey = window.DQCTAppState?.getSettings?.()?.defaultUniqueKey;
        if (uniqueKey && record?.[uniqueKey] !== undefined && String(record[uniqueKey]).trim() !== "") {
          return record[uniqueKey];
        }
        return record.ProjectCode || record.Title || record.AgentID || record.ResourceURL || "(missing primary id)";
      }

      function isEmpty(value) {
        return window.DQCTValidationEngine.isEmpty(value);
      }

      function formatValue(value) {
        return window.DQCTValidationEngine.formatValue(value);
      }

      function applyRule(rule, record, recordIndex) {
        return window.DQCTValidationEngine.applyRule(rule, record, recordIndex, {
          runtimeOverrides: state.runtimeOverrides,
          getPrimaryId,
          inferFieldType
        });
      }

      async function validateRun() {
        updateRuntimeOverrides();
        const profile = activeProfile();
        const records = getLoadedRecords();
        if (!records.length) {
          state.results = [];
          state.recordSummaries = [];
          state.exactDuplicates = [];
          state.nearDuplicates = [];
          state.currentIssueGroups = [];
          state.currentAnomalies = [];
          state.currentRunStats = { rowCount: 0, nullRates: {}, enumValues: {}, duplicateDocumentCount: 0, failureCount: 0, passRate: 1, schema: { fields: [] } };
          render();
          return { results: [], perFileSummary: [], skipped: true, message: "No files loaded. Upload a JSON file before running validation." };
        }
        const validationOutput = window.DQCTValidationEngine.validateFiles(state.files, profile.rules, {
          runtimeOverrides: state.runtimeOverrides,
          getPrimaryId,
          inferFieldType
        });
        const results = validationOutput.results;
        const perFileSummary = validationOutput.perFileSummary;

        state.results = results;
        state.recordSummaries = window.DQCTValidationEngine.buildRecordSummaries(state.files, results);
        state.exactDuplicates = buildExactDuplicateGroups(state.recordSummaries);
        state.nearDuplicates = buildNearDuplicateGroups(state.recordSummaries);
        state.currentSchema = inferSchema(records);
        if (!state.schemaBaselines[profile.profile_name]) {
          state.schemaBaselines[profile.profile_name] = {
            profileName: profile.profile_name,
            rootArray: profile.root_array,
            savedAt: new Date().toISOString(),
            schema: structuredClone(state.currentSchema)
          };
          saveSchemaBaselines();
        }

        const baselineSchema = state.schemaBaselines[profile.profile_name]?.schema || null;
        state.currentDrift = compareSchemas(baselineSchema, state.currentSchema);
        state.currentRunStats = buildRunStats(records, results, profile);
        state.currentIssueGroups = buildIssueGroups(results);
        const previousRun = getLatestRunForProfile(profile.profile_name);
        state.currentAnomalies = detectAnomalies(state.currentRunStats, previousRun?.stats || null, profile);
        const rulesChecked = profile.rules.filter((rule) => rule.enabled && !state.runtimeOverrides.has(rule.id)).length;

        const historyEntry = {
          profileName: profile.profile_name,
          timestamp: new Date().toISOString(),
          files: state.files.map((file) => ({ name: file.name, status: file.status, count: file.records.length })),
          rowCount: state.currentRunStats.rowCount,
          ruleCount: rulesChecked,
          failureCount: results.length,
          passRate: state.currentRunStats.passRate,
          anomalyCount: state.currentAnomalies.length,
          exactDuplicateCount: state.exactDuplicates.length,
          nearDuplicateCount: state.nearDuplicates.length,
          schemaDriftCount: state.currentDrift.added.length + state.currentDrift.removed.length + state.currentDrift.typeChanges.length,
          stats: state.currentRunStats,
          issues: results.slice(0, 25),
          anomalies: state.currentAnomalies,
          exactDuplicates: state.exactDuplicates,
          nearDuplicates: state.nearDuplicates
        };
        const issuesFilename = getIssuesFilename(historyEntry.timestamp);

        await saveRunHistory(historyEntry);
        window.DQCTAppState?.addRecentRun?.({
          timestamp: historyEntry.timestamp,
          type: "validate",
          summary: {
            files: state.files.length,
            records: state.currentRunStats.rowCount,
            failures: results.length,
            anomalies: state.currentAnomalies.length,
            exactDuplicates: state.exactDuplicates.length,
            nearDuplicates: state.nearDuplicates.length
          },
          exportFiles: [issuesFilename],
          reopenTab: "validate",
          label: profile.profile_name
        });
        state.runHistory = await loadRunHistory();
        state.parsedRuns = loadRuns();
        state.parsedRuns.push({
          timestamp: historyEntry.timestamp,
          profile: profile.profile_name,
          files: state.files.map((file) => ({ name: file.name, status: file.status, count: file.records.length })),
          failures: results.length
        });
        saveRuns(state.parsedRuns);
        render();
        return { results, perFileSummary };
      }

      async function importSchemaFromFile(file) {
        const text = await readTextFile(file);
        const payload = window.DQCTParser.parseJsonText(text);
        const extracted = extractRecordsFromPayload(payload);

        if (!extracted || !extracted.records.length) {
          throw new Error('Schema import requires a JSON array or an object with a non-empty "Export" array.');
        }

        const draftProfile = buildImportedProfile(extracted.records, file.name, extracted.rootArray);
        state.profiles = state.profiles.filter((profile) => profile.profile_name !== draftProfile.profile_name).concat(draftProfile);
        state.activeProfileId = draftProfile.profile_name;
        state.ruleSearch = "";
        state.currentLayer = "all";
        state.runtimeOverrides = new Set();
        els.newProfileName.value = draftProfile.profile_name;
        els.newRootArray.value = draftProfile.root_array || "Export";
        saveProfiles();
        render();
        return draftProfile;
      }

      function buildReportText() {
        const profile = activeProfile();
        return window.DQCTExports.buildReportText(profile.profile_name, state.files, state.results);
      }

      function buildIssueGroups(results) {
        const grouped = new Map();
        results.forEach((result) => {
          const key = issueGroupKey(result);
          if (!grouped.has(key)) {
            grouped.set(key, {
              key,
              ruleId: result.ruleId || "unknown",
              field: result.field || "unknown",
              ruleType: result.ruleType || "unknown",
              severity: result.severity || "low",
              expected: result.expected || "",
              count: 0,
              samples: []
            });
          }

          const entry = grouped.get(key);
          entry.count += 1;
          if (entry.samples.length < 5) {
            entry.samples.push({
              fileName: result.fileName || "",
              primaryId: result.primaryId || "",
              actual: result.actual || "",
              recordIndex: result.recordIndex || 0
            });
          }
        });

        const order = { high: 3, medium: 2, low: 1 };
        return Array.from(grouped.values()).sort((a, b) => {
          const severityDelta = (order[b.severity] || 0) - (order[a.severity] || 0);
          if (severityDelta !== 0) {
            return severityDelta;
          }
          return b.count - a.count;
        });
      }

      function buildNearDuplicateGroups(recordSummaries) {
        const grouped = new Map();

        (recordSummaries || []).forEach((summary) => {
          const agentId = String(summary?.AgentID || "").trim();
          const projectCode = String(summary?.ProjectCode || "").trim();
          const fingerprint = String(summary?.fingerprint || "").trim();
          if (!agentId || !projectCode || !fingerprint) {
            return;
          }

          const key = `${agentId}::${projectCode}`;
          if (!grouped.has(key)) {
            grouped.set(key, {
              agentId,
              projectCode,
              rows: [],
              fingerprints: new Set(),
              files: new Set()
            });
          }

          const entry = grouped.get(key);
          entry.rows.push({
            file_name: summary.file_name,
            row_number: summary.row_number,
            Title: summary.Title,
            BidStatus: summary.BidStatus,
            fingerprint
          });
          entry.fingerprints.add(fingerprint);
          entry.files.add(summary.file_name);
        });

        return Array.from(grouped.values())
          .filter((entry) => entry.rows.length > 1 && entry.fingerprints.size > 1)
          .map((entry) => ({
            type: "near_duplicate",
            agentId: entry.agentId,
            projectCode: entry.projectCode,
            recordCount: entry.rows.length,
            fingerprintCount: entry.fingerprints.size,
            files: Array.from(entry.files),
            fingerprints: Array.from(entry.fingerprints),
            rows: entry.rows
          }))
          .sort((a, b) => b.recordCount - a.recordCount);
      }

      function buildExactDuplicateGroups(recordSummaries) {
        const grouped = new Map();

        (recordSummaries || []).forEach((summary) => {
          const fingerprint = String(summary?.fingerprint || "").trim();
          if (!fingerprint) {
            return;
          }

          if (!grouped.has(fingerprint)) {
            grouped.set(fingerprint, {
              fingerprint,
              rows: [],
              files: new Set(),
              agentProjectPairs: new Set()
            });
          }

          const entry = grouped.get(fingerprint);
          const agentId = String(summary?.AgentID || "").trim();
          const projectCode = String(summary?.ProjectCode || "").trim();
          entry.rows.push({
            file_name: summary.file_name,
            row_number: summary.row_number,
            AgentID: agentId,
            ProjectCode: projectCode,
            Title: summary.Title,
            BidStatus: summary.BidStatus,
            fingerprint
          });
          entry.files.add(summary.file_name);
          entry.agentProjectPairs.add(`${agentId}::${projectCode}`);
        });

        return Array.from(grouped.values())
          .filter((entry) => entry.rows.length > 1)
          .map((entry) => ({
            type: "exact_duplicate",
            fingerprint: entry.fingerprint,
            recordCount: entry.rows.length,
            fileCount: entry.files.size,
            uniqueAgentProjectCount: entry.agentProjectPairs.size,
            files: Array.from(entry.files),
            rows: entry.rows
          }))
          .sort((a, b) => b.recordCount - a.recordCount);
      }

      function issueGroupKey(result) {
        return `${result.ruleId || "unknown"}|${result.field || "unknown"}|${result.ruleType || "unknown"}`;
      }

      function findRuleLayer(ruleId) {
        const profile = activeProfile();
        return profile.rules.find((rule) => rule.id === ruleId)?.layer || "Unknown";
      }

      function buildTicketText(issue) {
        const profile = activeProfile();
        const totalRecords = state.currentRunStats?.rowCount || 0;
        const percentage = totalRecords ? ((issue.count / totalRecords) * 100).toFixed(2) : "0.00";
        const lines = [];
        lines.push(`[DEFECT] ${profile.profile_name} — ${issue.field} failed ${issue.ruleType}`);
        lines.push("");
        lines.push(`Date: ${new Date().toISOString()}`);
        lines.push(`File count: ${state.files.length}`);
        lines.push(`Affected records: ${issue.count} / ${totalRecords} (${percentage}%)`);
        lines.push(`Rule: ${issue.ruleType}`);
        lines.push(`Expected: ${issue.expected || "See rule configuration"}`);
        lines.push("Actual examples:");
        issue.samples.forEach((sample) => {
          lines.push(`  - Record ${sample.primaryId || sample.recordIndex}: \"${String(sample.actual)}\" (${sample.fileName})`);
        });
        lines.push(`Layer: ${findRuleLayer(issue.ruleId)}`);
        lines.push(`Severity: ${issue.severity}`);
        lines.push(`Rule ID: ${issue.ruleId}`);
        return lines.join("\n");
      }

      async function copyIssueTicket(issueKey) {
        const issue = state.currentIssueGroups.find((entry) => entry.key === issueKey);
        if (!issue) {
          return;
        }
        const text = buildTicketText(issue);
        await navigator.clipboard.writeText(text);
        els.ticketPreview.textContent = text;
        els.ticketPreview.classList.remove("hidden");
      }

      function getIssuesFilename(timestamp) {
        const stamp = new Date(timestamp || new Date().toISOString()).toISOString().replaceAll(":", "-");
        return `dqct-issues-${activeProfile().profile_name.toLowerCase().replace(/\s+/g, "-")}-${stamp}.json`;
      }

      function downloadIssuesJson() {
        const payload = window.DQCTExports.buildIssuesPayload({
          profileName: activeProfile().profile_name,
          files: state.files,
          currentRunStats: state.currentRunStats,
          results: state.results,
          currentAnomalies: state.currentAnomalies,
          currentDrift: state.currentDrift,
          currentIssueGroups: state.currentIssueGroups,
          settings: window.DQCTAppState?.getSettings?.() || null
        });
        const filename = getIssuesFilename(new Date().toISOString());
        const downloadResult = window.DQCTExports.downloadJson(payload, filename);
        return { filename: downloadResult.filename, issueCount: state.results.length };
      }

      function downloadRecordSummariesJson() {
        const payload = {
          metadata: {
            profile_name: activeProfile().profile_name,
            export_date: new Date().toISOString(),
            total_records: state.recordSummaries.length,
            total_errors: state.recordSummaries.reduce((sum, r) => sum + r.error_count, 0),
            total_warnings: state.recordSummaries.reduce((sum, r) => sum + r.warning_count, 0),
            total_info: state.recordSummaries.reduce((sum, r) => sum + r.info_count, 0)
          },
          record_summaries: state.recordSummaries
        };
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `record-summaries_${timestamp}.json`;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return { filename, recordCount: state.recordSummaries.length };
      }

      function downloadNearDuplicatesJson() {
        const payload = {
          metadata: {
            profile_name: activeProfile().profile_name,
            export_date: new Date().toISOString(),
            exact_duplicate_group_count: state.exactDuplicates.length,
            near_duplicate_group_count: state.nearDuplicates.length,
            duplicate_group_count: state.exactDuplicates.length + state.nearDuplicates.length,
            exact_affected_record_count: state.exactDuplicates.reduce((sum, group) => sum + group.recordCount, 0),
            near_affected_record_count: state.nearDuplicates.reduce((sum, group) => sum + group.recordCount, 0)
          },
          exact_duplicates: state.exactDuplicates,
          near_duplicates: state.nearDuplicates
        };
        const timestamp = new Date().toISOString().split("T")[0];
        const filename = `near-duplicates_${timestamp}.json`;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return {
          filename,
          groupCount: state.exactDuplicates.length + state.nearDuplicates.length,
          recordCount:
            state.exactDuplicates.reduce((sum, group) => sum + group.recordCount, 0)
            + state.nearDuplicates.reduce((sum, group) => sum + group.recordCount, 0)
        };
      }

      async function copyReport() {
        const text = buildReportText();
        await navigator.clipboard.writeText(text);
        return text;
      }

      function loadSampleData() {
        const sample = {
          Export: [
            {
              AgentName: "Standard Profile",
              AgentID: "OH-001",
              LegacyAgentID: "LEG-1001",
              ResourceURL: "https://example.com/bids/1",
              ProjectCode: "SRC1234567890",
              Title: "Replacement of HVAC controls",
              BidURL: "https://example.com/bids/1",
              BidStatus: "Open for Bidding",
              PublishedDate: "4/5/2026",
              DueDate: "4/25/2026",
              BidDocuments: JSON.stringify([{ Title: "spec.pdf", URL: "https://example.com/spec.pdf", Hash: "abc123" }]),
              BidDocumentHashes: "abc123",
              AddendumDocuments: "[]",
              AddendumDocumentHashes: "",
              BidTabulations: "[]",
              BidTabulationHashes: "",
              AwardDocuments: "[]",
              AwardDocumentHashes: "",
              Addendum: ""
            },
            {
              AgentName: "Standard Profile",
              AgentID: "OH-001",
              LegacyAgentID: "LEG-1001",
              ResourceURL: "https://example.com/bids/1",
              ProjectCode: "SRC1234567890",
              Title: "Replacement of HVAC controls duplicate",
              BidURL: "https://example.com/bids/1",
              BidStatus: "Open for Bidding",
              PublishedDate: "13/5/2026",
              DueDate: "",
              BidDocuments: JSON.stringify([
                { Title: "spec.pdf", URL: "https://example.com/spec.pdf", Hash: "abc123" },
                { Title: "spec.pdf", URL: "https://example.com/spec.pdf", Hash: "def456" }
              ]),
              BidDocumentHashes: "abc123,def456",
              AddendumDocuments: "[]",
              AddendumDocumentHashes: "",
              BidTabulations: "[]",
              BidTabulationHashes: "",
              AwardDocuments: "[]",
              AwardDocumentHashes: "",
              Addendum: ""
            }
          ]
        };

        state.files = [
          {
            name: "sample-standard-profile.json",
            size: JSON.stringify(sample).length,
            records: sample.Export,
            raw: sample,
            status: "ready"
          }
        ];
        render();
        return { fileCount: state.files.length, recordCount: sample.Export.length };
      }

      function clearFiles() {
        state.files = [];
        state.results = [];
        state.recordSummaries = [];
        state.exactDuplicates = [];
        state.nearDuplicates = [];
        state.currentIssueGroups = [];
        els.ticketPreview.classList.add("hidden");
        els.ticketPreview.textContent = "";
        render();
        return { fileCount: 0, issueCount: 0 };
      }

      function resetProfile() {
        state.profiles = [structuredClone(defaultProfile), ...state.profiles.filter((profile) => profile.profile_name !== defaultProfile.profile_name)];
        state.activeProfileId = defaultProfile.profile_name;
        saveProfiles();
        render();
        return defaultProfile.profile_name;
      }

      function cloneProfile() {
        const base = activeProfile();
        const name = els.newProfileName.value.trim() || `${base.profile_name} Clone`;
        const rootArray = els.newRootArray.value.trim() || base.root_array || "Export";
        const cloned = normalizeProfile({ ...clone(base), profile_name: name, root_array: rootArray });
        cloned.rules = cloned.rules.map((rule) => ({ ...rule, enabled: true }));
        state.profiles = state.profiles.filter((profile) => profile.profile_name !== name).concat(cloned);
        state.activeProfileId = name;
        saveProfiles();
        render();
        return cloned.profile_name;
      }

      function saveActiveProfile() {
        const profile = activeProfile();
        const next = normalizeProfile(profile);
        const index = state.profiles.findIndex((item) => item.profile_name === next.profile_name);
        if (index >= 0) {
          state.profiles[index] = next;
        } else {
          state.profiles.push(next);
        }
        saveProfiles();
        render();
        return next.profile_name;
      }
