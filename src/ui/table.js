/*
  Lightweight table controller used by validation results.
  API: DQCTTable.create({ tableElement, bodyElement, columns, onRowClick, pageSize })
*/
(function attachDQCTTable(globalScope) {
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

    let rows = [];
    let sortState = { key: null, direction: "asc" };
    let currentPage = 1;

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

    function render() {
      const ordered = sortedRows();
      const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const pageRows = ordered.slice(start, start + pageSize);

      bodyElement.innerHTML = pageRows
        .map((row) => {
          const originalIndex = rows.indexOf(row);
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
    }

    return {
      update(nextRows) {
        rows = Array.isArray(nextRows) ? nextRows : [];
        render();
      },
      clear() {
        rows = [];
        bodyElement.innerHTML = "";
      }
    };
  }

  globalScope.DQCTTable = {
    create
  };
})(window);
