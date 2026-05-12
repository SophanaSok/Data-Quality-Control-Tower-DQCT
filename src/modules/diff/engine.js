(function attachDQCTDiffEngine(globalScope) {
  const DEFAULT_UNIQUE_KEY = "ProjectCode";

  function extractRecordsWithWrapper(payload) {
    if (Array.isArray(payload)) {
      return { records: payload, rootArray: "root" };
    }

    if (!payload || typeof payload !== "object") {
      return { records: [], rootArray: "root" };
    }

    if (Array.isArray(payload.Export)) {
      return { records: payload.Export, rootArray: "Export" };
    }

    const firstArrayEntry = Object.entries(payload).find(([, value]) => Array.isArray(value));
    if (firstArrayEntry) {
      return { records: firstArrayEntry[1], rootArray: firstArrayEntry[0] };
    }

    return { records: [], rootArray: "root" };
  }

  function normalizeIgnoreFields(ignoreFields) {
    if (Array.isArray(ignoreFields)) {
      return ignoreFields.map((field) => String(field || "").trim()).filter(Boolean);
    }

    if (typeof ignoreFields === "string") {
      return ignoreFields
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);
    }

    return [];
  }

  function canonicalize(value) {
    if (Array.isArray(value)) {
      return value.map((item) => canonicalize(item));
    }

    if (value && typeof value === "object") {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = canonicalize(value[key]);
          return acc;
        }, {});
    }

    return value;
  }

  function comparableRecord(record, ignoreSet) {
    const next = {};
    Object.keys(record || {}).forEach((key) => {
      if (!ignoreSet.has(key)) {
        next[key] = canonicalize(record[key]);
      }
    });
    return next;
  }

  function mapRecordsByKey(records, uniqueKey) {
    const map = new Map();
    records.forEach((record, index) => {
      const keyValue = record?.[uniqueKey];
      const normalizedKey = String(keyValue ?? "").trim();
      if (!normalizedKey) {
        return;
      }
      if (!map.has(normalizedKey)) {
        map.set(normalizedKey, []);
      }
      map.get(normalizedKey).push({ record, index });
    });
    return map;
  }

  function diffRecords(baselinePayload, comparisonPayload, options = {}) {
    const uniqueKey = String(options.uniqueKey || DEFAULT_UNIQUE_KEY).trim() || DEFAULT_UNIQUE_KEY;
    const ignoreFields = normalizeIgnoreFields(options.ignoreFields);
    const ignoreSet = new Set(ignoreFields);

    const baseline = extractRecordsWithWrapper(baselinePayload);
    const comparison = extractRecordsWithWrapper(comparisonPayload);
    const baselineMap = mapRecordsByKey(baseline.records, uniqueKey);
    const comparisonMap = mapRecordsByKey(comparison.records, uniqueKey);
    const seen = new Set();

    const changedRecords = [];
    const unchangedRecords = [];
    const newRecords = [];
    const removedRecords = [];
    const diffRows = [];

    comparisonMap.forEach((comparisonItems, key) => {
      // Duplicate keys are reported by findDuplicates; diff comparison uses the first occurrence per key.
      const comparisonItem = comparisonItems[0];
      const baselineItem = baselineMap.get(key)?.[0];
      if (!baselineItem) {
        newRecords.push({ key, record: comparisonItem.record, comparisonIndex: comparisonItem.index });
        diffRows.push({ key, status: "new", before: null, after: comparisonItem.record });
        return;
      }

      seen.add(key);
      const beforeComparable = comparableRecord(baselineItem.record, ignoreSet);
      const afterComparable = comparableRecord(comparisonItem.record, ignoreSet);
      const beforeText = JSON.stringify(beforeComparable);
      const afterText = JSON.stringify(afterComparable);

      if (beforeText === afterText) {
        unchangedRecords.push({ key, record: comparisonItem.record, baselineIndex: baselineItem.index, comparisonIndex: comparisonItem.index });
        return;
      }

      const changedFields = Array.from(
        new Set([...Object.keys(beforeComparable || {}), ...Object.keys(afterComparable || {})])
      ).filter((field) => JSON.stringify(beforeComparable?.[field]) !== JSON.stringify(afterComparable?.[field]));

      changedRecords.push({
        key,
        before: baselineItem.record,
        after: comparisonItem.record,
        baselineIndex: baselineItem.index,
        comparisonIndex: comparisonItem.index,
        changedFields
      });
      diffRows.push({
        key,
        status: "changed",
        before: baselineItem.record,
        after: comparisonItem.record,
        changedFields
      });
    });

    baselineMap.forEach((baselineItems, key) => {
      if (seen.has(key) || comparisonMap.has(key)) {
        return;
      }
      const baselineItem = baselineItems[0];
      removedRecords.push({ key, record: baselineItem.record, baselineIndex: baselineItem.index });
      diffRows.push({ key, status: "removed", before: baselineItem.record, after: null });
    });

    const changedAndNewRecords = [
      ...changedRecords.map((item) => item.after),
      ...newRecords.map((item) => item.record)
    ];

    return {
      uniqueKey,
      ignoreFields,
      wrapper: {
        baseline: baseline.rootArray,
        comparison: comparison.rootArray
      },
      baselineCount: baseline.records.length,
      comparisonCount: comparison.records.length,
      changedCount: changedRecords.length,
      newCount: newRecords.length,
      removedCount: removedRecords.length,
      unchangedCount: unchangedRecords.length,
      diffRows,
      changedRecords,
      newRecords,
      removedRecords,
      unchangedRecords,
      changedAndNewRecords
    };
  }

  function duplicatesFromPayload(payload, uniqueKey) {
    const normalizedKey = String(uniqueKey || DEFAULT_UNIQUE_KEY).trim() || DEFAULT_UNIQUE_KEY;
    const extracted = extractRecordsWithWrapper(payload);
    const keyed = mapRecordsByKey(extracted.records, normalizedKey);
    const duplicates = [];

    keyed.forEach((entries, key) => {
      if (entries.length > 1) {
        duplicates.push({
          key,
          count: entries.length,
          rows: entries.map((entry) => ({ index: entry.index, record: entry.record }))
        });
      }
    });

    return {
      wrapper: extracted.rootArray,
      totalRecords: extracted.records.length,
      duplicateCount: duplicates.length,
      duplicates
    };
  }

  function findDuplicates(file1Payload, file2Payload, options = {}) {
    const uniqueKey = String(options.uniqueKey || DEFAULT_UNIQUE_KEY).trim() || DEFAULT_UNIQUE_KEY;
    const file1 = duplicatesFromPayload(file1Payload, uniqueKey);
    const file2 = duplicatesFromPayload(file2Payload, uniqueKey);
    const file1Map = mapRecordsByKey(extractRecordsWithWrapper(file1Payload).records, uniqueKey);
    const file2Map = mapRecordsByKey(extractRecordsWithWrapper(file2Payload).records, uniqueKey);
    const duplicatesCross = [];

    file2Map.forEach((file2Entries, key) => {
      const file1Entries = file1Map.get(key);
      if (!file1Entries) {
        return;
      }
      duplicatesCross.push({
        key,
        file1Count: file1Entries.length,
        file2Count: file2Entries.length,
        file1Rows: file1Entries.map((entry) => ({ index: entry.index, record: entry.record })),
        file2Rows: file2Entries.map((entry) => ({ index: entry.index, record: entry.record }))
      });
    });

    return {
      uniqueKey,
      duplicatesFile1: file1,
      duplicatesFile2: file2,
      duplicatesCross
    };
  }

  function buildCleanExport(diffOutput, options = {}) {
    const records = Array.isArray(diffOutput?.changedAndNewRecords) ? diffOutput.changedAndNewRecords : [];
    const wrapperKey = options.wrapperKey || diffOutput?.wrapper?.comparison || "root";
    if (wrapperKey && wrapperKey !== "root") {
      return { [wrapperKey]: records };
    }
    return records;
  }

  globalScope.DQCTDiffEngine = {
    diffRecords,
    findDuplicates,
    buildCleanExport
  };
})(window);
