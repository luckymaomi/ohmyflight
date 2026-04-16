(function () {
  const tools = window.TrainingTools;
  const runtime = window.TrainingToolsSuiteUpdate;
  const state = runtime.state;
  const elements = runtime.elements;

  function setStatus(message, isError = false) {
    elements.statusLine.textContent = message;
    elements.statusLine.classList.toggle("is-error", Boolean(isError));
  }

  function badgeClass(status) {
    if (status === "超期") return "danger";
    if (status === "命中窗口") return "warn";
    if (status === "已更新") return "ok";
    if (status === "不变") return "info";
    if (status === "有效期回退") return "warn";
    if (status === "更新无效") return "danger";
    if (status === "跳过") return "danger";
    return "info";
  }

  function renderStats(stats) {
    const values = [
      stats.recordsTotal,
      stats.matched,
      stats.updated,
      stats.unchanged,
      stats.rollback,
      stats.invalid,
      stats.skipped
    ];

    Array.from(elements.statsGrid.children).forEach((card, index) => {
      const node = card.querySelector("strong");
      if (node) node.textContent = String(values[index] || 0);
    });
  }

  function renderPreview(rows) {
    if (!rows.length) {
      elements.previewBody.innerHTML = '<tr><td colspan="9" class="empty-block">暂无更新预览</td></tr>';
      return;
    }

    elements.previewBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${tools.escapeHtml(row.rowNumber)}</td>
        <td>${tools.escapeHtml(row.employeeId)}</td>
        <td>${tools.escapeHtml(row.name)}</td>
        <td>${tools.escapeHtml(row.projectName)}</td>
        <td>${tools.escapeHtml(row.oldExpiry)}</td>
        <td>${tools.escapeHtml(row.newExpiry)}</td>
        <td><span class="badge ${badgeClass(row.judgement)}">${tools.escapeHtml(row.judgement)}</span></td>
        <td><span class="badge ${badgeClass(row.result)}">${tools.escapeHtml(row.result)}</span></td>
        <td>${tools.escapeHtml(row.reason)}</td>
      </tr>
    `).join("");
  }

  function renderSkipped(rows) {
    if (!rows.length) {
      elements.skippedBody.innerHTML = '<tr><td colspan="5" class="empty-block">暂无跳过记录</td></tr>';
      return;
    }

    elements.skippedBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${tools.escapeHtml(row.rowNumber)}</td>
        <td>${tools.escapeHtml(row.name)}</td>
        <td>${tools.escapeHtml(row.projectName)}</td>
        <td><span class="badge danger">${tools.escapeHtml(row.status)}</span></td>
        <td>${tools.escapeHtml(row.reason)}</td>
      </tr>
    `).join("");
  }

  function resetView() {
    renderStats({ recordsTotal: 0, matched: 0, updated: 0, unchanged: 0, rollback: 0, invalid: 0, skipped: 0 });
    renderPreview([]);
    renderSkipped([]);
  }

  function exportWorkbook() {
    if (!state.result) return;

    const workbook = tools.buildValidityResultWorkbook(state.result);
    const outputName = tools.buildOutputFileName(state.sourceFileName || "培训有效期表", "更新结果");
    window.XLSX.writeFile(workbook, outputName);
    setStatus(`已导出结果文件：${outputName}`);
  }

  async function runUpdate() {
    const trainingFile = elements.trainingFile.files[0];
    const validityFile = elements.validityFile.files[0];

    if (!trainingFile || !validityFile) {
      setStatus("请同时选择培训表文件和有效期表文件。", true);
      return;
    }

    elements.runButton.disabled = true;
    elements.exportButton.disabled = true;
    setStatus("正在读取培训表和有效期表，生成更新预览...");

    try {
      const [trainingWorkbook, validityWorkbook] = await Promise.all([
        tools.readWorkbookFile(trainingFile),
        tools.readWorkbookFile(validityFile)
      ]);

      const result = tools.buildValidityUpdate(trainingWorkbook, validityWorkbook);
      state.result = result;
      state.sourceFileName = trainingFile.name;

      renderStats(result.stats);
      renderPreview(result.previewRows);
      renderSkipped(result.skippedRows);
      elements.exportButton.disabled = false;
      setStatus(
        `完成：命中可计算 ${result.stats.matched} 条，已更新 ${result.stats.updated} 条，不变 ${result.stats.unchanged} 条，有效期回退 ${result.stats.rollback} 条，更新无效 ${result.stats.invalid} 条，跳过 ${result.stats.skipped} 条。`
      );
    } catch (error) {
      state.result = null;
      state.sourceFileName = "";
      resetView();
      setStatus(error.message || "培训有效期更新失败。", true);
    } finally {
      elements.runButton.disabled = false;
    }
  }

  resetView();
  elements.runButton.addEventListener("click", runUpdate);
  elements.exportButton.addEventListener("click", exportWorkbook);
})();
