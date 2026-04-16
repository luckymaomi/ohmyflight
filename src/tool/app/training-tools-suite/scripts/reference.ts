(function () {
  const tools = window.TrainingTools;
  const ruleMap = tools.getDefaultRuleMap();

  const elements = {
    projectBody: document.getElementById("projectBody"),
    caseSections: document.getElementById("caseSections"),
    trainingTemplateButton: document.getElementById("downloadTrainingTemplateButton"),
    validityTemplateButton: document.getElementById("downloadValidityTemplateButton")
  };

  function buildExample(ruleName, title, trainingDateText, oldExpiryText) {
    const rule = ruleMap.get(ruleName);
    const trainingDate = tools.parseDate(trainingDateText);
    const oldExpiry = tools.parseDate(oldExpiryText);
    const computed = tools.computeExpiry(rule, trainingDate, oldExpiry);
    const windowInfo = oldExpiry ? tools.getWindowInfo(rule, oldExpiry) : { hasWindow: false };

    let resultType = "首次/无旧值";
    if (oldExpiry) {
      if (windowInfo.hasWindow && trainingDate >= windowInfo.windowStart && trainingDate <= windowInfo.windowEnd) {
        resultType = "命中窗口";
      } else if (windowInfo.hasWindow && trainingDate > windowInfo.windowEnd) {
        resultType = "超期";
      } else if (windowInfo.hasWindow) {
        resultType = "提前/窗口外";
      } else if (trainingDate > oldExpiry) {
        resultType = "超期";
      } else {
        resultType = "无窗口";
      }
    }

    return {
      projectName: ruleName,
      title,
      trainingDate: trainingDateText,
      oldExpiry: oldExpiryText || "",
      resultType,
      newExpiry: tools.formatDate(computed.newExpiry),
      reason: computed.reason
    };
  }

  function buildSections() {
    return [
      {
        title: "基准月类：应急训练",
        intro: "窗口内保留的是基准月，不是旧有效期本身。命中窗口就顺延到下一轮；不在窗口内就用本次培训开始月份重建基准月。",
        rows: [
          buildExample("应急训练", "首次培训", "2000-01-01", ""),
          buildExample("应急训练", "窗口起点复训", "2001-12-01", "2002-02-28"),
          buildExample("应急训练", "窗口中间复训", "2002-01-15", "2002-02-28"),
          buildExample("应急训练", "窗口终点复训", "2002-02-28", "2002-02-28"),
          buildExample("应急训练", "提前太多复训", "2001-11-30", "2002-02-28"),
          buildExample("应急训练", "窗口后补训", "2002-03-01", "2002-02-28")
        ]
      },
      {
        title: "3个月窗口类：危险品",
        intro: "危险品按“失效日前 3 个日历月”打开窗口，但必须在失效前 1 日前完成。命中窗口时保留的是旧截止锚点，超期后按本次培训开始日期重新计算。",
        rows: [
          buildExample("危险品", "危险品首次培训", "2000-01-01", ""),
          buildExample("危险品", "危险品窗口起点复训", "2027-03-15", "2027-06-15"),
          buildExample("危险品", "危险品窗口终点复训", "2027-06-14", "2027-06-15"),
          buildExample("危险品", "危险品失效日当天补训", "2027-06-15", "2027-06-15"),
          buildExample("危险品", "危险品提前太多", "2027-03-14", "2027-06-15")
        ]
      },
      {
        title: "3个月窗口类：英语能力 / 汉语能力",
        intro: "英语能力按 ICAO4 管理，窗口内续考后顺延 3 年；汉语能力按 ICAO5 管理，窗口内续考后顺延 6 年。两者都从失效日前 3 个日历月开始，且窗口包含失效日当天。",
        rows: [
          buildExample("英语能力", "英语能力（ICAO4）窗口起点续考", "2027-03-15", "2027-06-15"),
          buildExample("英语能力", "英语能力（ICAO4）失效日当天续考", "2027-06-15", "2027-06-15"),
          buildExample("英语能力", "英语能力提前太多", "2027-03-14", "2027-06-15"),
          buildExample("汉语能力", "汉语能力（ICAO5）窗口内续考", "2027-05-20", "2027-06-15"),
          buildExample("汉语能力", "汉语能力（ICAO5）失效日当天续考", "2027-06-15", "2027-06-15"),
          buildExample("汉语能力", "汉语能力（ICAO5）超期后续考", "2027-06-16", "2027-06-15")
        ]
      },
      {
        title: "最新日期类：航空安保 / 疲劳管理 / 飞行作风",
        intro: "这类项目没有窗口期，也没有保护锚点。谁是最新培训开始日期，就按谁重算；因此速查时重点看“本次培训开始日期 + 对应有效期”。",
        rows: [
          buildExample("航空安保", "航空安保首次培训", "2000-01-01", ""),
          buildExample("航空安保", "航空安保有效期内复训", "2001-12-20", "2002-01-31"),
          buildExample("疲劳管理", "疲劳管理提前复训", "2000-06-15", "2002-01-31"),
          buildExample("疲劳管理", "疲劳管理到期当天复训", "2002-01-31", "2002-01-31"),
          buildExample("飞行作风", "飞行作风过期后补训", "2002-03-01", "2002-01-31"),
          buildExample("飞行作风", "飞行作风再次复训", "2003-05-10", "2004-03-31")
        ]
      }
    ];
  }

  function renderProjectTable() {
    const rows = tools.sortRules(Array.from(ruleMap.values()));
    elements.projectBody.innerHTML = rows.map((rule) => `
      <tr>
        <td>${tools.escapeHtml(rule.canonical)}</td>
        <td>${tools.escapeHtml(rule.aliases.join(" / "))}</td>
        <td>${tools.escapeHtml(rule.ruleType)}</td>
        <td>${tools.escapeHtml(tools.formatRuleDuration(rule))}</td>
        <td>${tools.escapeHtml(tools.formatWindowText(rule))}</td>
        <td>${tools.escapeHtml(rule.rounding)}</td>
        <td>${tools.escapeHtml(rule.note)}</td>
      </tr>
    `).join("");
  }

  function badgeClass(resultType) {
    if (resultType === "命中窗口") return "warn";
    if (resultType === "超期") return "danger";
    return "info";
  }

  function renderCaseSections() {
    const sections = buildSections();
    elements.caseSections.innerHTML = sections.map((section) => `
      <article class="section" style="margin-top: 16px;">
        <div class="section-head">
          <div>
            <h3 class="section-title" style="margin-top:0;">${tools.escapeHtml(section.title)}</h3>
            <p class="section-intro">${tools.escapeHtml(section.intro)}</p>
          </div>
        </div>
        <div class="table-shell">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th>项目</th>
                <th>场景</th>
                <th>旧有效期</th>
                <th>培训开始日期</th>
                <th>判断</th>
                <th>新有效期</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              ${section.rows.map((row) => `
                <tr>
                  <td>${tools.escapeHtml(row.projectName)}</td>
                  <td>${tools.escapeHtml(row.title)}</td>
                  <td>${tools.escapeHtml(row.oldExpiry || "无")}</td>
                  <td>${tools.escapeHtml(row.trainingDate)}</td>
                  <td><span class="badge ${badgeClass(row.resultType)}">${tools.escapeHtml(row.resultType)}</span></td>
                  <td>${tools.escapeHtml(row.newExpiry)}</td>
                  <td>${tools.escapeHtml(row.reason)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>
    `).join("");
  }

  renderProjectTable();
  renderCaseSections();
  elements.trainingTemplateButton.addEventListener("click", tools.exportTrainingTemplate);
  elements.validityTemplateButton.addEventListener("click", tools.exportValidityTemplate);
})();
