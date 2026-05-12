(function attachDQCTParser(globalScope) {
  function extractRecordsFromPayload(payload) {
    if (Array.isArray(payload)) {
      return { records: payload, rootArray: "root" };
    }

    if (Array.isArray(payload?.Export)) {
      return { records: payload.Export, rootArray: "Export" };
    }

    return null;
  }

  function normalizeRecords(records) {
    return Array.isArray(records) ? records : [];
  }

  function parseJsonText(text) {
    return JSON.parse(String(text || ""));
  }

  globalScope.DQCTParser = {
    extractRecordsFromPayload,
    normalizeRecords,
    parseJsonText
  };
})(window);
