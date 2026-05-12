(function attachDQCTToasts(globalScope) {
  function resolveToastOptions(tone = "success", timeout = 3200) {
    if (typeof tone === "number") {
      return { tone: "success", timeout: tone };
    }
    return { tone: typeof tone === "string" ? tone : "success", timeout: Number.isFinite(timeout) ? timeout : 3200 };
  }

  function showToast(text, tone = "success", timeout = 3200) {
    const options = resolveToastOptions(tone, timeout);
    const toast = document.createElement("div");
    toast.className = `dqct-toast dqct-toast--${options.tone}`;
    toast.textContent = text;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.classList.add("dqct-toast--hide"), options.timeout);
    window.setTimeout(() => toast.remove(), options.timeout + 350);
  }

  function showSuccess(message) {
    showToast(message, "success");
  }

  function showWarning(message) {
    showToast(message, "warning");
  }

  function showError(message) {
    showToast(message, "error");
  }

  globalScope.DQCTToasts = {
    showToast,
    showSuccess,
    showWarning,
    showError
  };
})(window);
