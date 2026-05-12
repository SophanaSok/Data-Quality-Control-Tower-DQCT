/* Simple JSON diff viewer helper
   Provides renderDiffViewer(base, compare, changedPaths)
   Attaches UI to window.jsonViewer so other modules can call it.
*/
(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function highlightLines(text, changedPaths) {
    if (!changedPaths || !changedPaths.length) return escapeHtml(text).replace(/\n/g, "<br>");
    const lines = text.split(/\n/);
    const out = lines.map((line) => {
      const match = changedPaths.some((p) => line.indexOf(p) !== -1);
      return match ? `<div class=\"diff-changed\">${escapeHtml(line)}</div>` : `<div>${escapeHtml(line)}</div>`;
    });
    return out.join("");
  }

  function ensureModal() {
    let modal = document.getElementById("json-diff-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "json-diff-modal";
      modal.className = "json-diff-modal hidden";
      modal.innerHTML = `
        <div class="json-diff-backdrop"></div>
        <div class="json-diff-panel">
          <div class="json-diff-head">
            <strong>JSON Side-by-side Diff</strong>
            <div class="json-diff-actions"><button id="jsonDiffClose">Close</button></div>
          </div>
          <div class="json-diff-body">
            <div class="json-diff-column"><div class="json-diff-title">Base</div><div id="jsonDiffBase" class="json-diff-content"></div></div>
            <div class="json-diff-column"><div class="json-diff-title">Compare</div><div id="jsonDiffCompare" class="json-diff-content"></div></div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector("#jsonDiffClose").addEventListener("click", () => modal.classList.add("hidden"));
      modal.querySelector(".json-diff-backdrop").addEventListener("click", () => modal.classList.add("hidden"));
    }
    return modal;
  }

  function renderDiffViewer(base, compare, changedPaths) {
    const modal = ensureModal();
    const baseText = JSON.stringify(base || {}, null, 2);
    const compareText = JSON.stringify(compare || {}, null, 2);
    const baseEl = modal.querySelector("#jsonDiffBase");
    const compareEl = modal.querySelector("#jsonDiffCompare");
    baseEl.innerHTML = `<pre class=\"json-pre\">${highlightLines(baseText, changedPaths)}</pre>`;
    compareEl.innerHTML = `<pre class=\"json-pre\">${highlightLines(compareText, changedPaths)}</pre>`;
    modal.classList.remove("hidden");
  }

  window.jsonViewer = window.jsonViewer || {};
  window.jsonViewer.renderDiffViewer = renderDiffViewer;
})();

// Developer smoke-test: append ?devDiffTest=1 to URL to auto-open a sample diff
(function devSmoke() {
  try {
    if (typeof window === 'undefined') return;
    if (!window.location || !window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('devDiffTest')) return;
    const base = { id: 1, AgentName: "Alpha Co", ProjectCode: "SRC0000000001", BidURL: "https://example.org/1" };
    const compare = { id: 1, AgentName: "Alpha Company", ProjectCode: "SRC0000000001", BidURL: "http://example.org/1" };
    setTimeout(() => {
      window.jsonViewer.renderDiffViewer(base, compare, ["AgentName", "BidURL"]);
    }, 600);
  } catch (e) {}
})();

// Auto-run dev helper: load sample data and trigger a validation run when ?autoRun=1
(function devAutoRun() {
  try {
    if (typeof window === 'undefined') return;
    if (!window.location || !window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('autoRun')) return;
    // click the seed demo button, then run
    setTimeout(() => {
      const seed = document.getElementById('seedDemoButton');
      const runBtn = document.getElementById('runButton');
      if (seed) seed.click();
      setTimeout(() => {
        if (runBtn) runBtn.click();
      }, 700);
    }, 300);
  } catch (e) {}
})();
