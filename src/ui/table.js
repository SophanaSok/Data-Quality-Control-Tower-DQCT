(function attachDQCTTable(globalScope) {
  const INTERACTIVE_ELEMENT_SELECTORS = "button,a,input,select,textarea,label";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function create(config) {
    const tableElement = config?.tableElement;
    const bodyElement = config?.bodyElement;
    if (!tableElement || !bodyElement) {
      return null;
    }

    const columns = Array.isArray(config.columns) ? config.columns : [];
    const pageSize = Number.isFinite(config.pageSize) && config.pageSize > 0 ? Math.floor(config.pageSize) : 25;
    const onRowClick = typeof config.onRowClick === "function" ? config.onRowClick : null;

    const pager = document.createElement("div");
    pager.className = "dqct-table-pager";
    const parent = tableElement.parentElement;
    if (parent) {
      parent.insertAdjacentElement("afterend", pager);
    }

    const state = {
      rows: [],
      page: 1,
      sortKey: null,
      sortDirection: "asc"
    };

    function attachHeaderSort() {
      const headers = tableElement.querySelectorAll("thead th");
      headers.forEach((header, index) => {
        const column = columns[index];
        if (!column?.sortable) {
          header.classList.remove("dqct-sortable");
          header.removeAttribute("role");
          header.removeAttribute("tabindex");
          header.removeAttribute("aria-sort");
          return;
        }

        header.classList.add("dqct-sortable");
        header.setAttribute("role", "button");
        header.setAttribute("tabindex", "0");
        const direction = state.sortKey === column.key ? state.sortDirection : null;
        header.setAttribute("aria-sort", direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");

        const toggleSort = () => {
          if (state.sortKey === column.key) {
            state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
          } else {
            state.sortKey = column.key;
            state.sortDirection = "asc";
          }
          state.page = 1;
          render();
        };

        header.onclick = toggleSort;
        header.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleSort();
          }
        };
      });
    }

    function getSortedRows() {
      const rows = [...state.rows];
      if (!state.sortKey) {
        return rows;
      }

      const column = columns.find((entry) => entry.key === state.sortKey);
      const multiplier = state.sortDirection === "asc" ? 1 : -1;
      rows.sort((left, right) => {
        const leftValue = column?.sortValue ? column.sortValue(left) : left?.[state.sortKey];
        const rightValue = column?.sortValue ? column.sortValue(right) : right?.[state.sortKey];
        if (leftValue === rightValue) {
          return 0;
        }
        if (leftValue === null || leftValue === undefined) {
          return 1;
        }
        if (rightValue === null || rightValue === undefined) {
          return -1;
        }
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          return (leftValue - rightValue) * multiplier;
        }
        return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" }) * multiplier;
      });
      return rows;
    }

    function renderPager(totalPages) {
      if (totalPages <= 1) {
        pager.innerHTML = "";
        pager.classList.add("hidden");
        return;
      }
      pager.classList.remove("hidden");
      pager.innerHTML = `
        <button type="button" class="ghost" data-page-action="prev" ${state.page <= 1 ? "disabled" : ""}>Previous</button>
        <span class="meta">Page ${state.page} of ${totalPages}</span>
        <button type="button" class="ghost" data-page-action="next" ${state.page >= totalPages ? "disabled" : ""}>Next</button>
      `;
    }

    function render() {
      const sortedRows = getSortedRows();
      const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
      if (state.page > totalPages) {
        state.page = totalPages;
      }

      const start = (state.page - 1) * pageSize;
      const pagedRows = sortedRows.slice(start, start + pageSize);

      bodyElement.innerHTML = pagedRows.map((row, index) => {
        const cells = columns.map((column) => {
          const cellContent = column.render ? column.render(row) : escapeHtml(row?.[column.key] ?? "");
          return `<td>${cellContent}</td>`;
        }).join("");
        return `<tr data-row-index="${start + index}">${cells}</tr>`;
      }).join("");

      attachHeaderSort();
      renderPager(totalPages);
    }

    bodyElement.addEventListener("click", (event) => {
      if (!onRowClick) {
        return;
      }
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest(INTERACTIVE_ELEMENT_SELECTORS)) {
        return;
      }
      const rowNode = target.closest("tr[data-row-index]");
      if (!(rowNode instanceof HTMLTableRowElement)) {
        return;
      }
      const rowIndex = Number(rowNode.dataset.rowIndex);
      const row = getSortedRows()[rowIndex];
      if (row !== undefined) {
        onRowClick(row);
      }
    });

    pager.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const action = target.getAttribute("data-page-action");
      if (!action) {
        return;
      }
      if (action === "prev" && state.page > 1) {
        state.page -= 1;
        render();
      }
      const totalPages = Math.max(1, Math.ceil(getSortedRows().length / pageSize));
      if (action === "next" && state.page < totalPages) {
        state.page += 1;
        render();
      }
    });

    return {
      update(rows) {
        state.rows = Array.isArray(rows) ? rows : [];
        render();
      },
      clear() {
        state.rows = [];
        state.page = 1;
        bodyElement.innerHTML = "";
        pager.innerHTML = "";
        pager.classList.add("hidden");
        attachHeaderSort();
      }
    };
  }

  globalScope.DQCTTable = { create };
})(window);
