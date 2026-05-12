/* Diff UI wiring: exposes openDiffModal and a small binder for view-diff actions */
(function () {
  function openDiffModal(base, compare, changedPaths) {
    if (window.jsonViewer && typeof window.jsonViewer.renderDiffViewer === "function") {
      window.jsonViewer.renderDiffViewer(base, compare, changedPaths || []);
    } else {
      console.warn("jsonViewer not available");
    }
  }

  window.diffUI = window.diffUI || {};
  window.diffUI.openDiffModal = openDiffModal;
})();
