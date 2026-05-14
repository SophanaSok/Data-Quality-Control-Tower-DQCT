(function attachDQCTParser(globalScope) {
  function extractRecordsFromPayload(payload) {
    if (Array.isArray(payload)) {
      return { records: payload, rootArray: 'root', error: null };
    }

    if (Array.isArray(payload?.Export)) {
      return { records: payload.Export, rootArray: 'Export', error: null };
    }

    if (payload && typeof payload === 'object') {
      const keys = Object.keys(payload || {});
      if (keys.length) {
        return { records: null, error: `Expected root array or { Export: [...] } but found object with keys: ${keys.join(', ')}` };
      }
      return { records: null, error: 'Value is not an object or array' };
    }

    return { records: null, error: 'Value is not an object or array' };
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
