      const STORAGE_KEY = "dqct.profiles.v1";
      const RUN_KEY = "dqct.runs.v1";
      const SCHEMA_KEY = "dqct.schemas.v1";
      const HISTORY_DB_NAME = "dqct-history-db";
      const HISTORY_STORE_NAME = "runs";
      const MAX_FILES = 10;
      const MAX_FILE_SIZE = 50 * 1024 * 1024;

      const defaultProfile = {
        profile_name: "Ohio Buys",
        source: "State of Ohio Buys — ohiobuys.ohio.gov",
        version: "1.0",
        root_array: "Export",
        rules: [
          { id: "R01", layer: "core", field: "AgentName", type: "required", severity: "high", enabled: true, notes: "Always required — identifies the scraper source" },
          { id: "R02", layer: "core", field: "AgentID", type: "required", severity: "high", enabled: true, notes: "Always required" },
          { id: "R03", layer: "core", field: "LegacyAgentID", type: "required", severity: "high", enabled: true, notes: "Always required" },
          { id: "R04", layer: "core", field: "ResourceURL", type: "required", severity: "high", enabled: true, notes: "Always required — source portal link" },
          { id: "R05", layer: "domain", field: "ProjectCode", type: "required", severity: "high", enabled: true, notes: "Primary bid identifier" },
          { id: "R06", layer: "domain", field: "ProjectCode", type: "unique", severity: "high", enabled: true, notes: "No duplicate bids in same file" },
          { id: "R07", layer: "domain", field: "ProjectCode", type: "regex", severity: "medium", enabled: true, pattern: "^SRC\\d{10}$", notes: "Ohio Buys project code format" },
          { id: "R08", layer: "domain", field: "Title", type: "required", severity: "high", enabled: true, notes: "Bid title required for publication" },
          { id: "R09", layer: "domain", field: "BidURL", type: "required", severity: "high", enabled: true, notes: "Direct link to bid on source portal" },
          { id: "R10", layer: "domain", field: "BidURL", type: "regex", severity: "medium", enabled: true, pattern: "^https://", notes: "Must be a secure URL" },
          { id: "R11", layer: "domain", field: "BidStatus", type: "enum", severity: "high", enabled: true, allowed: ["Open for Bidding", "Closed", "Cancelled", "Awarded"], notes: "Known status values from Ohio Buys" },
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
          { id: "R33", layer: "diagnostic", field: "AwardDate", type: "ambiguous_date", severity: "low", enabled: false, notes: "Flag ambiguous award dates" }
        ]
      };

      const state = {
        profiles: loadProfiles(),
        activeProfileId: defaultProfile.profile_name,
        files: [],
        parsedRuns: [],
        results: [],
        runHistory: [],
        schemaBaselines: loadSchemaBaselines(),
        currentSchema: null,
        currentDrift: { added: [], removed: [], typeChanges: [] },
        currentAnomalies: [],
        currentRunStats: null,
        currentIssueGroups: [],
        currentLayer: "all",
        ruleSearch: "",
        runtimeOverrides: new Set()
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
        resultsBody: document.getElementById("resultsBody"),
        resultsWrap: document.getElementById("resultsWrap"),
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
        const stored = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
        const map = new Map(stored.map((profile) => [profile.profile_name, profile]));
        map.set(defaultProfile.profile_name, structuredClone(defaultProfile));
        return Array.from(map.values());
      }

      function saveProfiles() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profiles));
      }

      function saveRuns(runs) {
        localStorage.setItem(RUN_KEY, JSON.stringify(pruneRuns(runs).slice(-25)));
      }

      function loadSchemaBaselines() {
        return safeJsonParse(localStorage.getItem(SCHEMA_KEY), {});
      }

      function saveSchemaBaselines() {
        localStorage.setItem(SCHEMA_KEY, JSON.stringify(state.schemaBaselines));
      }

      function loadRuns() {
        return pruneRuns(safeJsonParse(localStorage.getItem(RUN_KEY), []));
      }

      function pruneRuns(runs) {
        const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
        return (runs || []).filter((run) => {
          const timestamp = Date.parse(run?.timestamp || "");
          return Number.isNaN(timestamp) ? true : timestamp >= cutoff;
        });
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
        try {
          return text ? JSON.parse(text) : fallback;
        } catch {
          return fallback;
        }
      }

      function extractRecordsFromPayload(payload) {
        if (Array.isArray(payload)) {
          return { records: payload, rootArray: "root" };
        }

        if (Array.isArray(payload?.Export)) {
          return { records: payload.Export, rootArray: "Export" };
        }

        return null;
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
            const json = JSON.parse(text);
            const records = Array.isArray(json) ? json : Array.isArray(json?.Export) ? json.Export : null;
            if (!records) {
              throw new Error('Root must be an array or an object with an "Export" array.');
            }

            parsedFiles.push({
              name: file.name,
              size: file.size,
              records,
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
        if (value === "" || value === null || value === undefined) {
          return [];
        }

        if (Array.isArray(value)) {
          return value;
        }

        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed || trimmed === "[]") {
            return [];
          }
          try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return null;
          }
        }

        return null;
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
        return record.ProjectCode || record.Title || record.AgentID || record.ResourceURL || "(missing primary id)";
      }

      function isEmpty(value) {
        return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
      }

      function formatValue(value) {
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        if (value && typeof value === "object") {
          return JSON.stringify(value);
        }
        return value === undefined ? "(undefined)" : String(value);
      }

      function applyRule(rule, record, recordIndex) {
        const failures = [];
        const value = record[rule.field];
        const isDisabledByRuntime = state.runtimeOverrides.has(rule.id);
        if (!rule.enabled || isDisabledByRuntime) {
          return failures;
        }

        const common = {
          field: rule.field,
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          expected: "",
          actual: formatValue(value),
          recordIndex,
          primaryId: getPrimaryId(record),
          documentIndex: null,
          fileName: ""
        };

        const fail = (expected, actual = value, extra = {}) => {
          failures.push({
            ...common,
            expected,
            actual: formatValue(actual),
            ...extra
          });
        };

        if (rule.type === "required") {
          if (isEmpty(value)) {
            fail("non-empty value", value);
          }
          return failures;
        }

        if (rule.type === "required_if") {
          const condition = rule.condition || {};
          const conditionMatches = record[condition.field] === condition.equals;
          if (conditionMatches && isEmpty(value)) {
            fail(`required when ${condition.field} equals ${condition.equals}`, value);
          }
          return failures;
        }

        if (rule.type === "unique") {
          return failures;
        }

        if (rule.type === "regex") {
          if (!isEmpty(value) && !new RegExp(rule.pattern).test(String(value))) {
            fail(`pattern ${rule.pattern}`, value);
          }
          return failures;
        }

        if (rule.type === "enum") {
          if (!isEmpty(value) && !rule.allowed.includes(value)) {
            fail(`one of ${rule.allowed.join(", ")}`, value);
          }
          return failures;
        }

        if (rule.type === "type") {
          if (isEmpty(value)) {
            return failures;
          }

          const expectedType = rule.expected_type || rule.expectedType || rule.data_type || "string";
          const actualType = inferFieldType(value);
          const typeMatches = expectedType === actualType || (expectedType === "date" && !Number.isNaN(Date.parse(String(value))));

          if (!typeMatches) {
            fail(`type ${expectedType}`, value);
          }
          return failures;
        }

        if (rule.type === "range") {
          if (isEmpty(value)) {
            return failures;
          }

          const numericValue = Number(value);
          if (Number.isNaN(numericValue)) {
            fail("numeric value", value);
            return failures;
          }

          const min = rule.min !== undefined && rule.min !== null && rule.min !== "" ? Number(rule.min) : null;
          const max = rule.max !== undefined && rule.max !== null && rule.max !== "" ? Number(rule.max) : null;

          if ((min !== null && numericValue < min) || (max !== null && numericValue > max)) {
            fail(`range ${min !== null ? min : "-∞"} to ${max !== null ? max : "∞"}`, value);
          }
          return failures;
        }

        if (rule.type === "date_format") {
          if (!isEmpty(value) && Number.isNaN(Date.parse(value))) {
            fail("a parseable date", value);
          }
          return failures;
        }

        if (rule.type === "not_future") {
          if (!isEmpty(value)) {
            const parsed = Date.parse(value);
            if (!Number.isNaN(parsed) && parsed > Date.now()) {
              fail("a non-future date", value);
            }
          }
          return failures;
        }

        if (rule.type === "ambiguous_date") {
          if (!isEmpty(value)) {
            const match = String(value).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (match) {
              const first = Number(match[1]);
              const second = Number(match[2]);
              if (first <= 12 && second <= 12) {
                fail("an unambiguous date", value, { severity: "low" });
              }
            }
          }
          return failures;
        }

        if (rule.type === "documents_have_required_keys") {
          const documents = parseDocumentCollection(value);
          if (documents === null) {
            fail("valid JSON document payload", value);
            return failures;
          }

          if (!documents.length && rule.run_if_not_empty) {
            return failures;
          }

          documents.forEach((document, documentIndex) => {
            for (const key of rule.required_keys || []) {
              if (isEmpty(document?.[key])) {
                failures.push({
                  ...common,
                  expected: `document key ${key}`,
                  actual: formatValue(document || null),
                  documentIndex,
                  primaryId: getPrimaryId(record)
                });
              }
            }
          });
          return failures;
        }

        if (rule.type === "hash_count_matches_documents") {
          const documents = parseDocumentCollection(value);
          if (documents === null) {
            fail("valid JSON document payload", value);
            return failures;
          }

          const hashValues = parseDocumentCollection(record[rule.hash_field]);
          const documentCount = documents.length;
          const hashCount = Array.isArray(hashValues) ? hashValues.length : String(record[rule.hash_field] || "").split(/[,\n]+/).filter(Boolean).length;
          if (documentCount !== hashCount) {
            fail(`document count to match ${rule.hash_field}`, `${documentCount} documents vs ${hashCount} hashes`);
          }
          return failures;
        }

        if (rule.type === "no_duplicate_documents") {
          const documents = parseDocumentCollection(value);
          if (documents === null) {
            fail("valid JSON document payload", value);
            return failures;
          }

          const seen = new Set();
          documents.forEach((document, documentIndex) => {
            const key = document?.URL || "";
            if (key && seen.has(key)) {
              failures.push({
                ...common,
                expected: "unique document URL",
                actual: formatValue(document),
                documentIndex
              });
            }
            if (key) {
              seen.add(key);
            }
          });
          return failures;
        }

        return failures;
      }

      async function validateRun() {
        updateRuntimeOverrides();
        const profile = activeProfile();
        const records = getLoadedRecords();
        if (!records.length) {
          state.results = [];
          state.currentIssueGroups = [];
          state.currentAnomalies = [];
          state.currentRunStats = { rowCount: 0, nullRates: {}, enumValues: {}, duplicateDocumentCount: 0, failureCount: 0, passRate: 1, schema: { fields: [] } };
          render();
          return { results: [], perFileSummary: [], skipped: true, message: "No files loaded. Upload a JSON file before running validation." };
        }
        const results = [];
        const perFileSummary = [];

        state.files.forEach((file) => {
          if (file.status === "error") {
            results.push({
              fileName: file.name,
              recordIndex: 0,
              primaryId: "(file error)",
              field: "Upload",
              ruleType: "parse",
              expected: "valid JSON",
              actual: file.error,
              severity: "high",
              ruleId: "FILE_PARSE"
            });
            perFileSummary.push({ name: file.name, records: 0, failures: 1 });
            return;
          }

          const recordFailuresBefore = results.length;
          const records = file.records;
          profile.rules.forEach((rule) => {
            if (rule.type === "unique" && rule.enabled && !state.runtimeOverrides.has(rule.id)) {
              const values = new Map();
              records.forEach((record, recordIndex) => {
                const value = record[rule.field];
                if (isEmpty(value)) {
                  return;
                }
                if (values.has(value)) {
                  results.push({
                    fileName: file.name,
                    recordIndex: recordIndex + 1,
                    primaryId: getPrimaryId(record),
                    field: rule.field,
                    ruleType: rule.type,
                    expected: "unique values",
                    actual: formatValue(value),
                    severity: rule.severity,
                    ruleId: rule.id
                  });
                  results.push({
                    fileName: file.name,
                    recordIndex: values.get(value) + 1,
                    primaryId: getPrimaryId(records[values.get(value)]),
                    field: rule.field,
                    ruleType: rule.type,
                    expected: "unique values",
                    actual: formatValue(value),
                    severity: rule.severity,
                    ruleId: rule.id
                  });
                } else {
                  values.set(value, recordIndex);
                }
              });
            }
          });

          records.forEach((record, recordIndex) => {
            profile.rules.forEach((rule) => {
              if (rule.type === "unique") {
                return;
              }
              const failures = applyRule(rule, record, recordIndex + 1);
              failures.forEach((failure) => {
                results.push({
                  fileName: file.name,
                  ...failure
                });
              });
            });
          });

          perFileSummary.push({ name: file.name, records: records.length, failures: results.length - recordFailuresBefore });
        });

        state.results = results;
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
          schemaDriftCount: state.currentDrift.added.length + state.currentDrift.removed.length + state.currentDrift.typeChanges.length,
          stats: state.currentRunStats,
          issues: results.slice(0, 25),
          anomalies: state.currentAnomalies
        };

        await saveRunHistory(historyEntry);
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
        const payload = JSON.parse(text);
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
        const lines = [];
        lines.push(`DQCT validation report: ${profile.profile_name}`);
        lines.push(`Files: ${state.files.length}`);
        lines.push(`Failures: ${state.results.length}`);
        lines.push("");
        state.results.slice(0, 40).forEach((result) => {
          lines.push([
            result.fileName,
            `record ${result.recordIndex}`,
            result.primaryId,
            result.field,
            result.ruleType,
            result.expected,
            result.actual,
            result.severity
          ].join(" | "));
        });
        return lines.join("\n");
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

      function downloadIssuesJson() {
        const payload = {
          generatedAt: new Date().toISOString(),
          profile: activeProfile().profile_name,
          files: state.files.map((file) => ({ name: file.name, status: file.status, records: file.records.length })),
          totals: {
            records: state.currentRunStats?.rowCount || 0,
            failures: state.results.length,
            anomalies: state.currentAnomalies.length
          },
          schemaDrift: state.currentDrift,
          groupedIssues: state.currentIssueGroups,
          issueRows: state.results,
          anomalies: state.currentAnomalies
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stamp = new Date().toISOString().replaceAll(":", "-");
        a.href = url;
        a.download = `dqct-issues-${activeProfile().profile_name.toLowerCase().replace(/\s+/g, "-")}-${stamp}.json`;
        document.body.append(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return { filename: a.download, issueCount: state.results.length };
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
              AgentName: "Ohio Buys",
              AgentID: "OH-001",
              LegacyAgentID: "LEG-1001",
              ResourceURL: "https://ohiobuys.ohio.gov/bids/1",
              ProjectCode: "SRC1234567890",
              Title: "Replacement of HVAC controls",
              BidURL: "https://ohiobuys.ohio.gov/bids/1",
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
              AgentName: "Ohio Buys",
              AgentID: "OH-001",
              LegacyAgentID: "LEG-1001",
              ResourceURL: "https://ohiobuys.ohio.gov/bids/1",
              ProjectCode: "SRC1234567890",
              Title: "Replacement of HVAC controls duplicate",
              BidURL: "http://ohiobuys.ohio.gov/bids/1",
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
            name: "sample-ohio-buys.json",
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

