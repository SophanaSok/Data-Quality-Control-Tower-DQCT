/*
  Lightweight table controller used by validation and diff results.
  API: DQCTTable.create({ tableElement, bodyElement, columns, onRowClick, pageSize, controlsElement })
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
  const configuredPageSize = Number(config?.pageSize);
  const pageSize = Number.isFinite(configuredPageSize) && configuredPageSize > 0
    ? Math.floor(configuredPageSize)
    : 25;

  let rows = [];
  let sortState = { key: null, direction: "asc" };
  let currentPage = 1;

  if (!(bodyElement instanceof HTMLElement) || !(tableElement instanceof HTMLElement)) {
    return {
      update() {},
      clear() {}
    };
  }

  const pagerElement = resolvePagerElement();
  const scrollContainer = tableElement.closest(".table-wrap");

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
    if (!Number.isFinite(index) || index < 0 || index >= rows.length) return;
    onRowClick(rows[index]);
  });

  function resolvePagerElement() {
    if (config?.controlsElement instanceof HTMLElement) {
      return config.controlsElement;
    }

    const existingPager = tableElement.nextElementSibling;
    if (existingPager instanceof HTMLElement && existingPager.classList.contains("dqct-table-pager")) {
      return existingPager;
    }

    const pager = document.createElement("div");
    pager.className = "dqct-table-pager";
    pager.setAttribute("aria-live", "polite");
    const insertionTarget = tableElement.closest(".table-wrap") || tableElement;
    insertionTarget.insertAdjacentElement("afterend", pager);
    return pager;
  }

  function sortedRowEntries() {
    const entries = rows.map((row, index) => ({ row, index }));
    if (!sortState.key) return entries;
    const column = columns.find((item) => item.key === sortState.key);
    if (!column) return entries;
    const valueFor = column.sortValue
      ? (row) => column.sortValue(row)
      : (row) => defaultSortValue(row, column.key);

    const sorted = [...entries].sort((a, b) => {
      const left = valueFor(a.row);
      const right = valueFor(b.row);
      if (left < right) return -1;
      if (left > right) return 1;
      return a.index - b.index;
    });

    return sortState.direction === "desc" ? sorted.reverse() : sorted;
  }

  function setPage(nextPage) {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    currentPage = Math.min(Math.max(1, Number(nextPage) || 1), totalPages);
    render();
    if (scrollContainer instanceof HTMLElement) {
      scrollContainer.scrollTop = 0;
    }
  }

  function renderPager(totalRows, totalPages, start, end) {
    if (!(pagerElement instanceof HTMLElement)) {
      return;
    }

    const hasRows = totalRows > 0;
    const firstRow = hasRows ? start + 1 : 0;
    const lastRow = hasRows ? end : 0;
    pagerElement.classList.toggle("hidden", !hasRows);
    pagerElement.innerHTML = `
      <span class="dqct-table-pager__summary">Showing ${escapeHtml(firstRow)}-${escapeHtml(lastRow)} of ${escapeHtml(totalRows)} rows</span>
      <div class="dqct-table-pager__controls">
        <button type="button" class="ghost" data-table-page="first" ${currentPage <= 1 ? "disabled" : ""}>First</button>
        <button type="button" class="ghost" data-table-page="previous" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
        <span class="meta">Page ${escapeHtml(currentPage)} of ${escapeHtml(totalPages)}</span>
        <button type="button" class="ghost" data-table-page="next" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
        <button type="button" class="ghost" data-table-page="last" ${currentPage >= totalPages ? "disabled" : ""}>Last</button>
      </div>
    `;
  }

  pagerElement?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.getAttribute("data-table-page");
    if (!action) {
      return;
    }
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (action === "first") setPage(1);
    if (action === "previous") setPage(currentPage - 1);
    if (action === "next") setPage(currentPage + 1);
    if (action === "last") setPage(totalPages);
  });

  function render() {
    const ordered = sortedRowEntries();
    const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, ordered.length);
    const pageEntries = ordered.slice(start, end);

    bodyElement.innerHTML = pageEntries
      .map(({ row, index }) => {
        const cells = columns
          .map((column) => {
            if (typeof column.render === "function") {
              return `<td>${column.render(row)}</td>`;
            }
            return `<td>${escapeHtml(row?.[column.key] ?? "")}</td>`;
          })
          .join("");
        return `<tr data-row-index="${index}">${cells}</tr>`;
      })
      .join("");
    renderPager(ordered.length, totalPages, start, end);
  }

  return {
    update(nextRows) {
      rows = Array.isArray(nextRows) ? nextRows : [];
      currentPage = 1;
      render();
    },
    clear() {
      rows = [];
      currentPage = 1;
      bodyElement.innerHTML = "";
      renderPager(0, 1, 0, 0);
    }
  };
}

export { create };
