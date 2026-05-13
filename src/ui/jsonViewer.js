(function attachDQCTJsonViewer(globalScope) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatJson(value) {
    try {
      return JSON.stringify(value ?? null, null, 2);
    } catch (error) {
      return String(value ?? "");
    }
  }

  function highlightJsonText(text, highlightPath) {
    const escaped = escapeHtml(text);
    if (!highlightPath) {
      return escaped;
    }
    const pathToken = String(highlightPath).split(".").filter(Boolean).at(-1);
    if (!pathToken) {
      return escaped;
    }
    const pattern = new RegExp(`(&quot;${pathToken}&quot;\\s*:)`, "g");
    return escaped.replace(pattern, '<mark class="dqct-json-highlight">$1</mark>');
  }

  function highlightJsonForPaths(text, paths) {
    const escaped = escapeHtml(text);
    if (!Array.isArray(paths) || !paths.length) return escaped;
    // Highlight all tokens (use last token of dotted paths)
    const tokens = Array.from(new Set(paths.map((p) => String(p).split('.').filter(Boolean).at(-1)).filter(Boolean)));
    if (!tokens.length) return escaped;
    // Build a single regex to avoid repeated passes
    const pattern = new RegExp(`(&quot;(?:${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})&quot;\\s*:)`, 'g');
    return escaped.replace(pattern, '<mark class="dqct-json-highlight">$1</mark>');
  }

  function renderRecordViewer(record, highlightPath) {
    const wrapper = document.createElement("div");
    wrapper.className = "dqct-json-viewer";
    wrapper.innerHTML = `
      <div class="dqct-json-viewer__header">
        <strong>Record inspector</strong>
        ${highlightPath ? `<span class="meta">Highlight: ${escapeHtml(highlightPath)}</span>` : ""}
      </div>
      <pre class="dqct-json-viewer__code">${highlightJsonText(formatJson(record), highlightPath)}</pre>
    `;
    return wrapper;
  }

  function renderDiffViewer(base, compare, changedPaths) {
    const wrapper = document.createElement("div");
    wrapper.className = "dqct-json-diff-viewer";
    const paths = Array.isArray(changedPaths) ? changedPaths : [];
    wrapper.innerHTML = `
      <div class="dqct-json-viewer__header">
        <strong>Diff viewer</strong>
        <span class="meta">${paths.length} changed path${paths.length === 1 ? "" : "s"}</span>
      </div>
      <div class="dqct-json-diff-viewer__grid">
        <div>
          <div class="meta">Baseline</div>
          <pre class="dqct-json-viewer__code">${highlightJsonForPaths(formatJson(base), paths)}</pre>
        </div>
        <div>
          <div class="meta">Comparison</div>
          <pre class="dqct-json-viewer__code">${highlightJsonForPaths(formatJson(compare), paths)}</pre>
        </div>
      </div>
      ${paths.length ? `<div class="meta">Changed paths: ${escapeHtml(paths.join(", "))}</div>` : ""}
    `;
    return wrapper;
  }

  globalScope.DQCTJsonViewer = {
    renderRecordViewer,
    renderDiffViewer
  };
})(window);
