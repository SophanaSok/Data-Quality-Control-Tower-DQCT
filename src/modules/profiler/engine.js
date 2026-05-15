(function attachDQCTProfiler(globalScope) {
  'use strict';

  /**
   * Compute field-level statistics for a set of records.
   * @param {Array<Object>} records
   * @returns {Array<Object>} fieldStat objects
   */
  function computeFieldStats(records) {
    const total = Array.isArray(records) ? records.length : 0;
    const fields = new Map();

    const normalizeType = (value) => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      const t = typeof value;
      if (t === 'object') return 'object';
      if (t === 'boolean') return 'boolean';
      if (t === 'number') return 'number';
      return 'string';
    };

    for (let i = 0; i < total; i++) {
      const rec = records[i] || {};
      const keys = Object.keys(rec);
      // also include undefined keys present (if any) by iteration over keys only
      keys.forEach((key) => {
        if (!fields.has(key)) {
          fields.set(key, {
            fieldName: key,
            presenceCount: 0,
            nullCount: 0,
            types: new Set(),
            values: new Set(),
            samples: []
          });
        }

        const meta = fields.get(key);
        const val = rec[key];
        const isNullish = val === null || val === undefined || (typeof val === 'string' && val.trim() === '');

        if (!isNullish) {
          meta.presenceCount += 1;
          const t = normalizeType(val);
          meta.types.add(t);
          try {
            // use JSON stringify for deterministic value identity when possible
            const keyVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            if (!meta.values.has(keyVal)) {
              meta.values.add(keyVal);
              if (meta.samples.length < 5) meta.samples.push(val);
            }
          } catch (e) {
            const keyVal = String(val);
            if (!meta.values.has(keyVal)) {
              meta.values.add(keyVal);
              if (meta.samples.length < 5) meta.samples.push(val);
            }
          }
        } else {
          meta.nullCount += 1;
          const t = val === null ? 'null' : (Array.isArray(val) ? 'array' : (typeof val === 'object' ? 'object' : typeof val));
          meta.types.add(t === 'undefined' ? 'null' : t);
        }
      });
    }

    const results = [];
    for (const [key, meta] of fields.entries()) {
      const presenceCount = meta.presenceCount;
      const nullCount = meta.nullCount;
      const observedTypes = Array.from(meta.types);
      const distinctCount = meta.values.size;
      const sampleValues = meta.samples.slice(0, 5);
      const presencePercent = total === 0 ? 0 : (presenceCount / total) * 100;
      const nullPercent = total === 0 ? 0 : (nullCount / total) * 100;
      const uniquenessPercent = presenceCount === 0 ? 0 : (distinctCount / presenceCount) * 100;

      results.push({
        fieldName: key,
        presenceCount,
        presencePercent,
        nullCount,
        nullPercent,
        observedTypes,
        distinctCount,
        uniquenessPercent,
        sampleValues
      });
    }

    return results.sort((a, b) => b.presenceCount - a.presenceCount);
  }


  /**
   * Suggest candidate rules from field statistics.
   * @param {Array<Object>} fieldStats
   * @param {number} totalRecords
   * @returns {Object} { required: [], enumCandidates: [], duplicateKeyCandidates: [] }
   */
  function suggestRules(fieldStats, totalRecords) {
    const required = [];
    const enumCandidates = [];
    const duplicateKeyCandidates = [];

    const blacklistSubstrings = ['id','url','link','date','time','stamp','hash','key','code','number','num','index'];

    const looksLikeIso = (s) => {
      if (typeof s !== 'string') return false;
      // quick ISO date-ish check
      const isoLike = /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{4}\/\d{2}\/\d{2}/.test(s);
      if (isoLike && !Number.isNaN(Date.parse(s))) return true;
      return false;
    };

    const looksLikeUnixTimestamp = (s) => {
      if (s == null) return false;
      if (typeof s === 'number') {
        const str = String(s);
        return /^\d{10,13}$/.test(str);
      }
      if (typeof s === 'string') {
        return /^\d{10,13}$/.test(s.trim());
      }
      return false;
    };

    fieldStats.forEach((fs) => {
      const name = String(fs.fieldName || '').toLowerCase();
      const presence = fs.presencePercent || 0;
      const distinct = fs.distinctCount || 0;
      const uniqueness = fs.uniquenessPercent || 0;
      const observed = Array.isArray(fs.observedTypes) ? fs.observedTypes : (fs.observedTypes ? [fs.observedTypes] : []);
      const samples = Array.isArray(fs.sampleValues) ? fs.sampleValues : [];

      // REQUIRED heuristic
      if (presence === 100) {
        required.push(fs.fieldName);
      }

      // ENUM candidate heuristic
      const smallDistinct = distinct <= 10;
      const lowCardinalityRatio = totalRecords === 0 ? false : (distinct / totalRecords) < 0.3;
      const nameOk = !blacklistSubstrings.some((substr) => name.includes(substr));
      const samplesNoHttp = !samples.some((v) => typeof v === 'string' && v.trim().toLowerCase().startsWith('http'));
      const samplesAllDatesOrTimestamps = samples.length > 0 && samples.every((v) => (typeof v === 'string' && (looksLikeIso(v) || looksLikeUnixTimestamp(v))) || (typeof v === 'number' && looksLikeUnixTimestamp(v)));

      if (smallDistinct && lowCardinalityRatio && nameOk && samplesNoHttp && !samplesAllDatesOrTimestamps) {
        enumCandidates.push(fs.fieldName);
      }

      // DUPLICATE KEY candidate heuristic
      const observedOnlyString = observed.length === 1 && observed[0] === 'string';
      const observedOnlyNumber = observed.length === 1 && observed[0] === 'number';
      if (uniqueness === 100 && presence >= 95 && (observedOnlyString || observedOnlyNumber)) {
        duplicateKeyCandidates.push(fs.fieldName);
      }
    });

    return { required, enumCandidates, duplicateKeyCandidates };
  }


  /**
   * Infer a suggested profile name from records using AgentID/AgentName.
   * @param {Array<Object>} records
   * @returns {string} sanitized profile name
   */
  function inferProfileName(records) {
    const list = Array.isArray(records) ? records : [];
    let agentId = null;
    let agentName = null;

    for (let i = 0; i < list.length; i++) {
      const r = list[i] || {};
      const aId = r.AgentID || r.AgentId || r.agentId || r.agentID;
      const aName = r.AgentName || r.Agentname || r.agentName || r.agentname || r.Agentname;
      const aIdStr = aId == null ? '' : String(aId).trim();
      const aNameStr = aName == null ? '' : String(aName).trim();
      if (aIdStr && aNameStr) {
        agentId = aIdStr;
        agentName = aNameStr;
        break;
      }
      if (!agentId && aIdStr) agentId = aIdStr;
      if (!agentName && aNameStr) agentName = aNameStr;
    }

    let base = '';
    if (agentId && agentName) base = `${agentId} - ${agentName} Profile`;
    else if (agentId) base = `${agentId} Profile`;
    else if (agentName) base = `${agentName} Profile`;
    else base = `Suggested Profile ${new Date().toLocaleDateString()}`;

    // Sanitize: trim, collapse spaces, remove disallowed chars, truncate to 64
    base = base.trim();
    base = base.replace(/\s+/g, ' ');
    base = base.replace(/[^A-Za-z0-9\- _]/g, '');
    if (base.length > 64) base = base.slice(0, 64);
    return base;
  }

  globalScope.DQCTProfiler = {
    computeFieldStats,
    suggestRules,
    inferProfileName
  };
})(window);
