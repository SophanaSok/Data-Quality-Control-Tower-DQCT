(function attachDQCTToasts(globalScope) {
  function showToast(text, timeout = 3200) {
    const toast = document.createElement("div");
    toast.className = "dqct-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.classList.add("dqct-toast--hide"), timeout);
    window.setTimeout(() => toast.remove(), timeout + 350);
  }

  globalScope.DQCTToasts = {
    showToast
  };
})(window);
