/*
  Lightweight table controller used by validation results.
  API: DQCTTable.create({ tableElement, bodyElement, columns, onRowClick, pageSize })
*/
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function defaultSortValue(row, key) {
  const value = row?.[key];
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  return String(value).toLowerCase();
}

function create(config) {
  const tableElement = config?.tableElement;
  const bodyElement = config?.bodyElement;
  const columns = Array.isArray(config?.columns) ? config.columns : [];
  const onRowClick = typeof config?.onRowClick === "function" ? config.onRowClick : null;
  const pageSize = Number.isFinite(Number(config?.pageSize)) ? Number(config.pageSize) : 25;
  const summaryLabel = String(config?.summaryLabel || "rows");

  let rows = [];
  let sortState = { key: null, direction: "asc" };
  let currentPage = 1;
  let renderedRows = [];

  if (!(bodyElement instanceof HTMLElement) || !(tableElement instanceof HTMLElement)) {
    return {
      update() {},
      clear() {}
    };
  }

  const pagerElement = document.createElement("div");
  pagerElement.className = "table-pagination";
  const tableWrap = tableElement.closest(".table-wrap");
  if (tableWrap instanceof HTMLElement && tableWrap.parentElement) {
    tableWrap.insertAdjacentElement("afterend", pagerElement);
  } else if (tableElement.parentElement) {
    tableElement.parentElement.insertAdjacentElement("afterend", pagerElement);
  }

  const headers = Array.from(tableElement.querySelectorAll("thead th"));
  headers.forEach((th, index) => {
    const column = columns[index];
    if (!column?.sortable) return;
    th.style.cursor = "pointer";
    th.setAttribute("title", "Sort");
    th.addEventListener("click", () => {
      if (sortState.key === column.key) {
        sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
      } else {
        sortState = { key: column.key, direction: "asc" };
      }
      currentPage = 1;
      render();
    });
  });

  bodyElement.addEventListener("click", (event) => {
    if (!onRowClick) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rowNode = target.closest("tr[data-row-index]");
    if (!(rowNode instanceof HTMLElement)) return;
    const index = Number(rowNode.dataset.rowIndex);
    if (!Number.isFinite(index) || index < 0 || index >= renderedRows.length) return;
    onRowClick(renderedRows[index]);
  });

  pagerElement.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const actionButton = target.closest("[data-page-action]");
    if (!(actionButton instanceof HTMLElement)) return;
    const action = actionButton.getAttribute("data-page-action");
    if (action === "prev") {
      currentPage = Math.max(1, currentPage - 1);
      render();
      return;
    }
    if (action === "next") {
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      currentPage = Math.min(totalPages, currentPage + 1);
      render();
    }
  });

  function sortedRows() {
    if (!sortState.key) return rows;
    const column = columns.find((item) => item.key === sortState.key);
    if (!column) return rows;
    const valueFor = column.sortValue
      ? (row) => column.sortValue(row)
      : (row) => defaultSortValue(row, column.key);

    const sorted = [...rows].sort((a, b) => {
      const left = valueFor(a);
      const right = valueFor(b);
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });

    return sortState.direction === "desc" ? sorted.reverse() : sorted;
  }

  function renderPager(totalItems, totalPages) {
    if (!totalItems) {
      pagerElement.innerHTML = "";
      return;
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);
    const canGoPrev = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    pagerElement.innerHTML = `
      <div class="actions-row" style="justify-content: space-between; margin-top: 0.75rem; width: 100%;">
        <span class="meta">Showing ${start}-${end} of ${totalItems} ${escapeHtml(summaryLabel)}</span>
        <div class="actions-row" style="gap: 0.4rem;">
          <button type="button" class="btn-ghost" data-page-action="prev" ${canGoPrev ? "" : "disabled"}>Previous</button>
          <span class="meta">Page ${currentPage} / ${totalPages}</span>
          <button type="button" class="btn-ghost" data-page-action="next" ${canGoNext ? "" : "disabled"}>Next</button>
        </div>
      </div>
    `;
  }

  function render() {
    const ordered = sortedRows();
    const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageRows = ordered.slice(start, start + pageSize);
    renderedRows = pageRows;

    bodyElement.innerHTML = pageRows
      .map((row, pageIndex) => {
        const cells = columns
          .map((column) => {
            if (typeof column.render === "function") {
              return `<td>${column.render(row)}</td>`;
            }
            return `<td>${escapeHtml(row?.[column.key] ?? "")}</td>`;
          })
          .join("");
        return `<tr data-row-index="${pageIndex}">${cells}</tr>`;
      })
      .join("");

    renderPager(ordered.length, totalPages);
  }

  return {
    update(nextRows) {
      rows = Array.isArray(nextRows) ? nextRows : [];
      render();
    },
    clear() {
      rows = [];
      renderedRows = [];
      bodyElement.innerHTML = "";
      pagerElement.innerHTML = "";
    }
  };
}

export { create };
