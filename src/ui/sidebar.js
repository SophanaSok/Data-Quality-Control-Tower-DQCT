function initSidebar(options = {}) {
  const shellElement = options.shellElement instanceof HTMLElement ? options.shellElement : document.querySelector(".app-shell");
  const sidebarElement = options.sidebarElement instanceof HTMLElement ? options.sidebarElement : document.querySelector(".sidebar");
  const collapseButton = options.collapseButton instanceof HTMLElement ? options.collapseButton : document.getElementById("sidebarToggle");
  const mobileButton = options.mobileButton instanceof HTMLElement ? options.mobileButton : document.getElementById("mobileSidebarToggle");
  const themeButton = options.themeButton instanceof HTMLElement ? options.themeButton : document.getElementById("themeToggle");
  const storageKey = options.storageKey || "dqct.ui.sidebarCollapsed.v1";
  const mobileBreakpoint = Number(options.mobileBreakpoint) || 768;

  function readCollapsedPreference() {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }

  function saveCollapsedPreference(value) {
    try {
      localStorage.setItem(storageKey, value ? "true" : "false");
    } catch {
      // Ignore storage failures.
    }
  }

  function syncCollapseButton(collapsed) {
    if (!(collapseButton instanceof HTMLButtonElement)) {
      return;
    }

    collapseButton.textContent = collapsed ? "›" : "Collapse sidebar";
    collapseButton.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    collapseButton.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
  }

  function setCollapsed(value) {
    const collapsed = !!value;
    shellElement?.classList.toggle("is-collapsed", collapsed);
    sidebarElement?.classList.toggle("sidebar--collapsed", collapsed);
    syncCollapseButton(collapsed);
    saveCollapsedPreference(collapsed);
  }

  function toggleCollapsed() {
    setCollapsed(!shellElement?.classList.contains("is-collapsed"));
  }

  function toggleMobileOpen() {
    shellElement?.classList.toggle("sidebar-open");
  }

  collapseButton?.addEventListener("click", toggleCollapsed);
  mobileButton?.addEventListener("click", toggleMobileOpen);
  themeButton?.addEventListener("click", () => {
    if (typeof options.onThemeToggle === "function") {
      options.onThemeToggle();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= mobileBreakpoint) {
      shellElement?.classList.remove("sidebar-open");
    }
  });

  setCollapsed(readCollapsedPreference());

  return {
    setCollapsed,
    toggleCollapsed,
    toggleMobileOpen
  };
}

export { initSidebar };
