function createRouter(routes = {}, options = {}) {
  const defaultRoute = options.defaultRoute || "#dashboard";
  const viewSelector = options.viewSelector || "[data-spa-view]";
  const navSelector = options.navSelector || "[data-spa-nav]";
  const normalizedRoutes = new Map(Object.entries(routes));
  let activeRoute = null;

  function normalizeHash(hash) {
    const raw = String(hash || "");
    return raw.startsWith("#") ? raw : `#${raw}`;
  }

  function resolveRoute(hash) {
    const normalized = normalizeHash(hash);
    if (normalizedRoutes.has(normalized)) {
      return normalized;
    }
    return normalizedRoutes.has(defaultRoute) ? defaultRoute : normalizedRoutes.keys().next().value || defaultRoute;
  }

  function syncViewState(routeKey) {
    const viewKey = routeKey.replace(/^#/, "");
    document.querySelectorAll(viewSelector).forEach((view) => {
      if (!(view instanceof HTMLElement)) {
        return;
      }
      view.classList.toggle("hidden", view.id !== `view-${viewKey}`);
    });

    document.querySelectorAll(navSelector).forEach((link) => {
      if (!(link instanceof HTMLElement)) {
        return;
      }
      const target = normalizeHash(link.getAttribute("href"));
      link.classList.toggle("is-active", target === routeKey);
      link.setAttribute("aria-current", target === routeKey ? "page" : "false");
    });
  }

  function transitionTo(nextRoute) {
    const routeKey = resolveRoute(nextRoute);
    if (routeKey === activeRoute) {
      syncViewState(routeKey);
      return routeKey;
    }

    const previousRoute = activeRoute && normalizedRoutes.get(activeRoute);
    if (previousRoute && typeof previousRoute.onLeave === "function") {
      previousRoute.onLeave();
    }

    activeRoute = routeKey;
    syncViewState(routeKey);

    const currentRoute = normalizedRoutes.get(routeKey);
    if (currentRoute && typeof currentRoute.onEnter === "function") {
      currentRoute.onEnter();
    }

    if (typeof options.onRouteChange === "function") {
      options.onRouteChange(routeKey);
    }

    return routeKey;
  }

  function handleHashChange() {
    transitionTo(window.location.hash || defaultRoute);
  }

  function start() {
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }

  return {
    get activeRoute() {
      return activeRoute;
    },
    start,
    transitionTo,
    syncViewState,
    resolveRoute
  };
}

export { createRouter };
