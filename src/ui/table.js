(function attachDQCTTable(globalScope) {
  function setBodyHtml(element, html) {
    if (!element) {
      return;
    }
    element.innerHTML = html;
  }

  globalScope.DQCTTable = {
    setBodyHtml
  };
})(window);
