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

  // Produce a character-level diff between two strings and return HTML
  // with differing character runs wrapped in <mark class="dqct-json-diff-char">.
function charLevelDiffHtml(a, b) {
  const sa = String(a ?? "");
  const sb = String(b ?? "");
  const m = sa.length;
  const n = sb.length;
    // Build LCS table
    const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
    for (let i = 0; i < m; i++) {
      const ai = sa.charCodeAt(i);
      const row = dp[i + 1];
      const prev = dp[i];
      for (let j = 0; j < n; j++) {
        if (ai === sb.charCodeAt(j)) row[j + 1] = prev[j] + 1;
        else row[j + 1] = Math.max(row[j], prev[j + 1]);
      }
    }
    // Backtrack to find matched index pairs
    const matchedA = new Array(m).fill(false);
    const matchedB = new Array(n).fill(false);
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (sa.charCodeAt(i - 1) === sb.charCodeAt(j - 1)) {
        matchedA[i - 1] = true;
        matchedB[j - 1] = true;
        i--; j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

  function buildHtml(str, matched) {
    let out = "";
    let run = "";
    let runMatched = null;
    for (let k = 0; k < str.length; k++) {
      const ch = str[k];
      const isMatched = !!matched[k];
      if (runMatched === null) { runMatched = isMatched; run = ch; }
      else if (isMatched === runMatched) { run += ch; }
      else {
        const esc = escapeHtml(run);
        if (runMatched) out += esc;
        else out += `<mark class="dqct-json-diff-char">${esc}</mark>`;
        run = ch; runMatched = isMatched;
      }
    }
    if (run.length) {
      const esc = escapeHtml(run);
      out += runMatched ? esc : `<mark class="dqct-json-diff-char">${esc}</mark>`;
    }
    return out;
  }

    return {
      baseHtml: buildHtml(sa, matchedA),
      compareHtml: buildHtml(sb, matchedB)
    };
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
  const baseJson = formatJson(base);
  const compareJson = formatJson(compare);
  const diff = charLevelDiffHtml(baseJson, compareJson);
  const hasMarks = (diff.baseHtml.indexOf('dqct-json-diff-char') !== -1) || (diff.compareHtml.indexOf('dqct-json-diff-char') !== -1);
  wrapper.dataset.diffHasMarks = hasMarks ? "1" : "0";
  wrapper.innerHTML = `
      <div class="dqct-json-viewer__header">
        <strong>Diff viewer</strong>
        <span class="meta">${paths.length} changed path${paths.length === 1 ? "" : "s"}</span>
        <span class="meta">Char-marks: ${hasMarks ? 'yes' : 'no'}</span>
      </div>
      <div class="dqct-json-diff-viewer__grid">
        <div>
          <div class="meta">Baseline</div>
          <pre class="dqct-json-viewer__code">${diff.baseHtml}</pre>
        </div>
        <div>
          <div class="meta">Comparison</div>
          <pre class="dqct-json-viewer__code">${diff.compareHtml}</pre>
        </div>
      </div>
      ${paths.length ? `<div class="meta">Changed paths: ${escapeHtml(paths.join(", "))}</div>` : ""}
    `;
  return wrapper;
}

export {
  charLevelDiffHtml,
  formatJson,
  highlightJsonForPaths,
  highlightJsonText,
  renderDiffViewer,
  renderRecordViewer
};
