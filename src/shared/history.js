/* history helpers: filterRuns(runs, filters)
   filters: { from: ISODate?, to: ISODate?, status: 'all'|'issues'|'clean', search: string }
*/
(function () {
  function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function matchesSearch(run, search) {
    if (!search) return true;
    const lower = String(search).toLowerCase();
    return String(run.profileName || "").toLowerCase().includes(lower)
      || (run.files || []).some((f) => String(f.name || "").toLowerCase().includes(lower))
      || String(run.timestamp || "").toLowerCase().includes(lower)
      || String(run.id || "").toLowerCase().includes(lower);
  }

  function filterRuns(runs = [], filters = {}) {
    const from = parseDate(filters.from);
    const to = parseDate(filters.to);
    const status = filters.status || 'all';
    const search = filters.search || '';

    return (runs || []).filter((run) => {
      const t = new Date(run.timestamp || run.generatedAt || run.time || null);
      if (from && t < from) return false;
      if (to && t > to) return false;
      if (status === 'issues' && !(run.failureCount && run.failureCount > 0)) return false;
      if (status === 'clean' && (run.failureCount && run.failureCount > 0)) return false;
      if (!matchesSearch(run, search)) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  if (typeof window !== 'undefined') {
    window.dqctHistory = window.dqctHistory || {};
    window.dqctHistory.filterRuns = filterRuns;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { filterRuns };
  }
})();
