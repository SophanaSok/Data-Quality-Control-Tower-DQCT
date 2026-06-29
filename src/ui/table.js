/*
  Lightweight table controller used by validation results.
  API: DQCTTable.create({ tableElement, bodyElement, columns, onRowClick, pageSize, pageSizeOptions })
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

function normalizePageSizeOptions(config) {
  const defaults = [25, 50, 100, 250];
  const raw = Array.isArray(config?.pageSizeOptions) ? config.pageSizeOptions : defaults;
  const normalized = raw
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const unique = [...new Set(normalized)].sort((a, b) => a - b);
  return unique.length ? unique : defaults;
}

function create(config) {
  const tableElement = config?.tableElement;
  const bodyElement = config?.bodyElement;
  const columns = Array.isArray(config?.columns) ? config.columns : [];
  const onRowClick = typeof config?.onRowClick === "function" ? config.onRowClick : null;
  const pageSizeOptions = normalizePageSizeOptions(config);
  const initialPageSize = Number.isFinite(Number(config?.pageSize)) ? Number(config.pageSize) : pageSizeOptions[0];
  if (!pageSizeOptions.includes(initialPageSize)) {
    pageSizeOptions.push(initialPageSize);
    pageSizeOptions.sort((a, b) => a - b);
  }
  let pageSize = initialPageSize;

  let rows = [];
  let orderedRows = [];
  let sortState = { key: null, direction: "asc" };
  let currentPage = 1;

  if (!(bodyElement instanceof HTMLElement) || !(tableElement instanceof HTMLElement)) {
    return {
      update() {},
      clear() {}
    };
  }

  const tableWrap = tableElement.parentElement;
  let paginationBar = tableWrap?.querySelector(":scope > .table-pagination[data-table-pagination]");
  if (!paginationBar && tableWrap instanceof HTMLElement) {
    paginationBar = document.createElement("div");
    paginationBar.className = "table-pagination";
    paginationBar.dataset.tablePagination = "true";
    paginationBar.setAttribute("role", "navigation");
    paginationBar.setAttribute("aria-label", "Table pagination");
    tableWrap.appendChild(paginationBar);
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
    if (!Number.isFinite(index) || index < 0 || index >= orderedRows.length) return;
    onRowClick(orderedRows[index]);
  });

  if (paginationBar instanceof HTMLElement) {
    paginationBar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-page-action]");
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;

      const totalPages = Math.max(1, Math.ceil(orderedRows.length / pageSize));
      const action = button.dataset.pageAction;
      if (action === "first") currentPage = 1;
      if (action === "prev") currentPage = Math.max(1, currentPage - 1);
      if (action === "next") currentPage = Math.min(totalPages, currentPage + 1);
      if (action === "last") currentPage = totalPages;
      render();
    });

    paginationBar.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) && !(target instanceof HTMLInputElement)) return;

      if (target instanceof HTMLSelectElement && target.matches("[data-page-size]")) {
        const nextSize = Number(target.value);
        if (!Number.isFinite(nextSize) || nextSize <= 0) return;
        pageSize = nextSize;
        currentPage = 1;
        render();
        return;
      }

      if (target instanceof HTMLInputElement && target.matches("[data-page-input]")) {
        const totalPages = Math.max(1, Math.ceil(orderedRows.length / pageSize));
        const requested = Number(target.value);
        if (!Number.isFinite(requested)) return;
        currentPage = Math.min(totalPages, Math.max(1, Math.trunc(requested)));
        render();
      }
    });

    paginationBar.addEventListener("keydown", (event) => {
      if (!(event.target instanceof HTMLInputElement) || !event.target.matches("[data-page-input]")) return;
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.target.blur();
      event.target.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

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

  function renderPagination(ordered) {
    if (!(paginationBar instanceof HTMLElement)) return;

    const totalRows = ordered.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = totalRows ? (currentPage - 1) * pageSize + 1 : 0;
    const end = totalRows ? Math.min(currentPage * pageSize, totalRows) : 0;
    const atFirst = currentPage <= 1;
    const atLast = currentPage >= totalPages;

    paginationBar.innerHTML = `
      <div class="table-pagination__info">
        Showing <strong>${start.toLocaleString()}</strong>–<strong>${end.toLocaleString()}</strong>
        of <strong>${totalRows.toLocaleString()}</strong>
      </div>
      <div class="table-pagination__controls">
        <button type="button" class="ghost table-pagination__button" data-page-action="first" aria-label="First page" ${atFirst ? "disabled" : ""}>«</button>
        <button type="button" class="ghost table-pagination__button" data-page-action="prev" aria-label="Previous page" ${atFirst ? "disabled" : ""}>‹</button>
        <label class="table-pagination__page">
          <span class="meta">Page</span>
          <input class="table-pagination__page-input" data-page-input type="number" min="1" max="${totalPages}" value="${currentPage}" aria-label="Current page" />
          <span class="meta">of ${totalPages.toLocaleString()}</span>
        </label>
        <button type="button" class="ghost table-pagination__button" data-page-action="next" aria-label="Next page" ${atLast ? "disabled" : ""}>›</button>
        <button type="button" class="ghost table-pagination__button" data-page-action="last" aria-label="Last page" ${atLast ? "disabled" : ""}>»</button>
      </div>
      <label class="table-pagination__size">
        <span class="meta">Rows per page</span>
        <select data-page-size aria-label="Rows per page">
          ${pageSizeOptions.map((option) => `<option value="${option}" ${option === pageSize ? "selected" : ""}>${option}</option>`).join("")}
        </select>
      </label>
    `;

    paginationBar.hidden = totalRows === 0;
  }

  function render() {
    orderedRows = sortedRows();
    const totalPages = Math.max(1, Math.ceil(orderedRows.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageRows = orderedRows.slice(start, start + pageSize);

    bodyElement.innerHTML = pageRows
      .map((row, pageIndex) => {
        const rowIndex = start + pageIndex;
        const cells = columns
          .map((column) => {
            if (typeof column.render === "function") {
              return `<td>${column.render(row)}</td>`;
            }
            return `<td>${escapeHtml(row?.[column.key] ?? "")}</td>`;
          })
          .join("");
        return `<tr data-row-index="${rowIndex}">${cells}</tr>`;
      })
      .join("");

    renderPagination(orderedRows);
  }

  return {
    update(nextRows) {
      rows = Array.isArray(nextRows) ? nextRows : [];
      currentPage = 1;
      render();
    },
    clear() {
      rows = [];
      orderedRows = [];
      currentPage = 1;
      bodyElement.innerHTML = "";
      if (paginationBar instanceof HTMLElement) {
        paginationBar.innerHTML = "";
        paginationBar.hidden = true;
      }
    }
  };
}

export { create };
