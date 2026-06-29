/*
  Lightweight table controller used by validation and diff results.
  API: DQCTTable.create({ tableElement, bodyElement, columns, onRowClick, pageSize })

  Renders one page of rows at a time for fast UI, and exposes pagination
  controls (first/prev/next/last + rows-per-page selector, including "All")
  so every record is reachable without overwhelming the DOM.
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

function buildPageSizeOptions(pageSize) {
  const base = [10, 20, 50, 100, 200, 500];
  const set = new Set(base);
  if (Number.isFinite(pageSize) && pageSize > 0) {
    set.add(pageSize);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function create(config) {
  const tableElement = config?.tableElement;
  const bodyElement = config?.bodyElement;
  const columns = Array.isArray(config?.columns) ? config.columns : [];
  const onRowClick = typeof config?.onRowClick === "function" ? config.onRowClick : null;
  const pageSize = Number.isFinite(Number(config?.pageSize)) ? Number(config.pageSize) : 25;

    let rows = [];
    let sortState = { key: null, direction: "asc" };
    let currentPage = 1;
    // Infinity represents the "All" rows-per-page option.
    let currentPageSize = pageSize > 0 ? pageSize : 25;

    if (!(bodyElement instanceof HTMLElement) || !(tableElement instanceof HTMLElement)) {
      return {
        update() {},
        clear() {}
      };
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
      if (!Number.isFinite(index) || index < 0 || index >= rows.length) return;
      onRowClick(rows[index]);
    });

    const pager = document.createElement("div");
    pager.className = "table-pager";
    pager.hidden = true;
    const pageSizeOptions = buildPageSizeOptions(currentPageSize);
    pager.innerHTML = `
      <div class="table-pager__info" data-pager-info></div>
      <div class="table-pager__controls">
        <label class="table-pager__size">
          <span class="table-pager__size-label">Rows per page</span>
          <select data-pager-size>
            ${pageSizeOptions.map((size) => `<option value="${size}"${size === currentPageSize ? " selected" : ""}>${size}</option>`).join("")}
            <option value="all">All</option>
          </select>
        </label>
        <div class="table-pager__nav">
          <button type="button" class="btn-ghost" data-pager-action="first" aria-label="First page">«</button>
          <button type="button" class="btn-ghost" data-pager-action="prev" aria-label="Previous page">‹ Prev</button>
          <span class="table-pager__status" data-pager-status></span>
          <button type="button" class="btn-ghost" data-pager-action="next" aria-label="Next page">Next ›</button>
          <button type="button" class="btn-ghost" data-pager-action="last" aria-label="Last page">»</button>
        </div>
      </div>
    `;

    const anchor = tableElement.closest(".table-wrap") || tableElement;
    anchor.insertAdjacentElement("afterend", pager);

    const infoNode = pager.querySelector("[data-pager-info]");
    const statusNode = pager.querySelector("[data-pager-status]");
    const sizeSelect = pager.querySelector("[data-pager-size]");

    function effectivePageSize(total) {
      if (currentPageSize === Infinity) {
        return Math.max(total, 1);
      }
      return currentPageSize;
    }

    function goToPage(target, totalPages) {
      const next = Math.min(Math.max(1, target), totalPages);
      if (next === currentPage) return;
      currentPage = next;
      render();
    }

    pager.querySelectorAll("[data-pager-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const ordered = sortedRows();
        const total = ordered.length;
        const totalPages = Math.max(1, Math.ceil(total / effectivePageSize(total)));
        const action = button.getAttribute("data-pager-action");
        if (action === "first") goToPage(1, totalPages);
        else if (action === "prev") goToPage(currentPage - 1, totalPages);
        else if (action === "next") goToPage(currentPage + 1, totalPages);
        else if (action === "last") goToPage(totalPages, totalPages);
      });
    });

    sizeSelect?.addEventListener("change", () => {
      const value = sizeSelect.value;
      currentPageSize = value === "all" ? Infinity : Number(value) || pageSize;
      currentPage = 1;
      render();
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

    function updatePager(total, totalPages, start, end) {
      if (total <= 0) {
        pager.hidden = true;
        return;
      }
      pager.hidden = false;
      if (infoNode instanceof HTMLElement) {
        infoNode.textContent = `Showing ${start + 1}–${end} of ${total}`;
      }
      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = `Page ${currentPage} of ${totalPages}`;
      }
      pager.querySelectorAll("[data-pager-action]").forEach((button) => {
        const action = button.getAttribute("data-pager-action");
        const isFirstPage = currentPage <= 1;
        const isLastPage = currentPage >= totalPages;
        const disabled = (action === "first" || action === "prev") ? isFirstPage : isLastPage;
        if (button instanceof HTMLButtonElement) {
          button.disabled = disabled;
        }
      });
    }

    function render() {
      const ordered = sortedRows();
      const total = ordered.length;
      const size = effectivePageSize(total);
      const totalPages = Math.max(1, Math.ceil(total / size));
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;
      const start = (currentPage - 1) * size;
      const end = Math.min(start + size, total);
      const pageRows = ordered.slice(start, end);

      bodyElement.innerHTML = pageRows
        .map((row, pageIndex) => {
          const originalIndex = start + pageIndex;
          const cells = columns
            .map((column) => {
              if (typeof column.render === "function") {
                return `<td>${column.render(row)}</td>`;
              }
              return `<td>${escapeHtml(row?.[column.key] ?? "")}</td>`;
            })
            .join("");
          return `<tr data-row-index="${originalIndex}">${cells}</tr>`;
        })
        .join("");

      updatePager(total, totalPages, start, end);
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
        pager.hidden = true;
      }
    };
  }

export { create };
