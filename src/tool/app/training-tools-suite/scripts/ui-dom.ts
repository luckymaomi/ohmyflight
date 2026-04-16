(function () {
  window.TrainingToolsSuiteUi = {
    requireElement(id, Type) {
      const element = document.getElementById(id);
      if (!(element instanceof Type)) {
        throw new Error(`页面缺少必要元素：${id}`);
      }
      return element;
    }
  };
})();
