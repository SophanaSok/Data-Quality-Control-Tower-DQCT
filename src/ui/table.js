/* Simple table render helper with filter hook support
   Exposes renderRows(tbodyEl, rows, renderRowFn)
*/
(function () {
  function renderRows(tbodyEl, rows, renderRowFn) {
    if (!tbodyEl) return;
    tbodyEl.innerHTML = (rows || []).map((row, i) => renderRowFn(row, i)).join('');
  }

  if (typeof window !== 'undefined') {
    window.tableRenderer = window.tableRenderer || {};
    window.tableRenderer.renderRows = renderRows;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderRows };
  }
})();
