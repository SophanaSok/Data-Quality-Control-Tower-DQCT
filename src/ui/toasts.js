(function attachDQCTToasts(globalScope) {
  function showToast(text, toneOrTimeout = "success", maybeTimeout = 3200) {
    const tone = typeof toneOrTimeout === "string" ? toneOrTimeout : "success";
    const timeout = typeof toneOrTimeout === "number" ? toneOrTimeout : maybeTimeout;
    const toast = document.createElement("div");
    toast.className = `dqct-toast dqct-toast--${tone}`;
    toast.textContent = text;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.classList.add("dqct-toast--hide"), timeout);
    window.setTimeout(() => toast.remove(), timeout + 350);
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
