(function attachDQCTValidationEngine(globalScope) {
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

  function applyRule(rule, record, recordIndex, options) {
    const failures = [];
    const value = record[rule.field];
    const runtimeOverrides = options?.runtimeOverrides || new Set();
    const getPrimaryId = options?.getPrimaryId || (() => "(missing primary id)");
    const inferFieldType = options?.inferFieldType || ((input) => typeof input);
    const isDisabledByRuntime = runtimeOverrides.has(rule.id);
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

    if (rule.type === "terminated_award_check") {
      // Check if BidStatus is "Terminated" and any award-related fields are populated
      const bidStatus = record?.BidStatus || "";
      if (bidStatus === "Terminated") {
        const awardDate = record?.AwardDate || "";
        const awardedVendorName = record?.AwardedVendorName || "";
        const awardDocuments = record?.AwardDocuments || "";
        
        const hasAwardData = awardDate || awardedVendorName || awardDocuments;
        if (hasAwardData) {
          fail(
            "no award data when BidStatus is Terminated",
            `AwardDate: ${awardDate || "(empty)"}, AwardedVendorName: ${awardedVendorName || "(empty)"}, AwardDocuments: ${awardDocuments || "(empty)"}`
          );
        }
      }
      return failures;
    }

    return failures;
  }

  function validateFiles(files, rules, options) {
    const results = [];
    const perFileSummary = [];
    const runtimeOverrides = options?.runtimeOverrides || new Set();
    const getPrimaryId = options?.getPrimaryId || (() => "(missing primary id)");
    const inferFieldType = options?.inferFieldType || ((input) => typeof input);

    files.forEach((file) => {
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
      const records = file.records || [];

      rules.forEach((rule) => {
        if (rule.type === "unique" && rule.enabled && !runtimeOverrides.has(rule.id)) {
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
        rules.forEach((rule) => {
          if (rule.type === "unique") {
            return;
          }
          const failures = applyRule(rule, record, recordIndex + 1, { runtimeOverrides, getPrimaryId, inferFieldType });
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

    return { results, perFileSummary };
  }

  function buildRecordSummaries(files, flatResults) {
    const recordSummaries = [];
    const failuresByRecord = new Map();

    // Group failures by (fileName, recordIndex)
    flatResults.forEach((failure) => {
      const key = `${failure.fileName}:${failure.recordIndex}`;
      if (!failuresByRecord.has(key)) {
        failuresByRecord.set(key, []);
      }
      failuresByRecord.get(key).push(failure);
    });

    // Build summaries for each record in each file
    files.forEach((file) => {
      if (file.status === "error") {
        // Skip error files
        return;
      }

      const records = file.records || [];
      records.forEach((record, recordIndex) => {
        const key = `${file.name}:${recordIndex + 1}`;
        const recordFailures = failuresByRecord.get(key) || [];

        // Generate fingerprint for this record (using synchronous version for consistency in loop)
        let fingerprint = "";
        if (typeof window !== "undefined" && window.DQCTFingerprint?.generateFingerprintSync) {
          fingerprint = window.DQCTFingerprint.generateFingerprintSync(record);
        }

        // Classify failures by severity
        const errorFailures = recordFailures.filter((f) => f.severity === "high");
        const warningFailures = recordFailures.filter((f) => f.severity === "medium");
        const infoFailures = recordFailures.filter((f) => f.severity === "low");

        // Determine qa_status
        let qa_status = "PASS";
        if (errorFailures.length > 0) {
          qa_status = "FAIL";
        } else if (warningFailures.length > 0) {
          qa_status = "PASS_WITH_WARNINGS";
        }

        recordSummaries.push({
          row_number: recordIndex + 1,
          file_name: file.name,
          AgentID: record?.AgentID || "",
          ProjectCode: record?.ProjectCode || "",
          Title: record?.Title || "",
          BidStatus: record?.BidStatus || "",
          fingerprint,
          qa_status,
          error_count: errorFailures.length,
          warning_count: warningFailures.length,
          info_count: infoFailures.length,
          errors: errorFailures.map((f) => ({
            field: f.field,
            ruleId: f.ruleId,
            ruleType: f.ruleType,
            expected: f.expected,
            actual: f.actual
          })),
          warnings: warningFailures.map((f) => ({
            field: f.field,
            ruleId: f.ruleId,
            ruleType: f.ruleType,
            expected: f.expected,
            actual: f.actual
          })),
          infos: infoFailures.map((f) => ({
            field: f.field,
            ruleId: f.ruleId,
            ruleType: f.ruleType,
            expected: f.expected,
            actual: f.actual
          }))
        });
      });
    });

    return recordSummaries;
  }

  globalScope.DQCTValidationEngine = {
    isEmpty,
    formatValue,
    parseDocumentCollection,
    applyRule,
    validateFiles,
    buildRecordSummaries
  };
})(window);
