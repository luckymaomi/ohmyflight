(function () {
  const Config = window.SuperTraining.Config;
  const Utils = window.SuperTraining.Utils;
  const RuleEngine = window.SuperTraining.RuleEngine;

  const elements = {
    projectBody: document.getElementById("projectBody"),
    caseSections: document.getElementById("caseSections")
  };

  function getRuleMap() {
    return new Map(Config.PROJECT_RULES.map((rule) => [rule.canonical, rule]));
  }

  function formatRuleDuration(rule) {
    return `${rule.validityValue}${Utils.normalizeText(rule.validityUnit)}`;
  }

  function formatWindowText(rule) {
    const windowInfo = RuleEngine.getWindowInfo(rule, Utils.makeDate(2027, 6, 15));
    if (!windowInfo.hasWindow) return "无窗口";
    return windowInfo.tag || "窗口";
  }

  function normalizeResultType(rule, trainingDate, oldExpiry) {
    if (!oldExpiry) return "首次/无旧值";
    const judgement = RuleEngine.classifyUpdateJudgement(rule, trainingDate, oldExpiry);
    if (judgement === "最新日期重算") return "无窗口";
    if (judgement === "提前窗口外") return "提前/窗口外";
    return judgement;
  }

  function buildExample(ruleName, title, trainingDateText, oldExpiryText) {
    const rule = getRuleMap().get(ruleName);
    const trainingDate = Utils.parseDate(trainingDateText);
    const oldExpiry = Utils.parseDate(oldExpiryText);
    const computed = RuleEngine.computeExpiry(rule, trainingDate, oldExpiry);
    return {
      projectName: ruleName,
      title,
      trainingDate: trainingDateText,
      oldExpiry: oldExpiryText || "",
      resultType: normalizeResultType(rule, trainingDate, oldExpiry),
      newExpiry: Utils.formatDate(computed.newExpiry),
      reason: computed.reason
    };
  }

  function buildSections() {
    return [
      {
        title: "基准月类：应急训练",
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
        rows: [
          buildExample("危险品", "首次培训", "2000-01-01", ""),
          buildExample("危险品", "窗口起点复训", "2027-03-15", "2027-06-15"),
          buildExample("危险品", "窗口终点复训", "2027-06-14", "2027-06-15"),
          buildExample("危险品", "失效日当天补训", "2027-06-15", "2027-06-15"),
          buildExample("危险品", "提前太多", "2027-03-14", "2027-06-15")
        ]
      },
      {
        title: "3个月窗口类：英语能力 / 汉语能力",
        rows: [
          buildExample("英语能力", "窗口起点续考", "2027-03-15", "2027-06-15"),
          buildExample("英语能力", "失效日当天续考", "2027-06-15", "2027-06-15"),
          buildExample("英语能力", "提前太多", "2027-03-14", "2027-06-15"),
          buildExample("汉语能力", "窗口内续考", "2027-05-20", "2027-06-15"),
          buildExample("汉语能力", "失效日当天续考", "2027-06-15", "2027-06-15"),
          buildExample("汉语能力", "超期后续考", "2027-06-16", "2027-06-15")
        ]
      },
      {
        title: "最新日期类：航空安保 / 疲劳管理 / 飞行作风",
        rows: [
          buildExample("航空安保", "首次培训", "2000-01-01", ""),
          buildExample("航空安保", "有效期内复训", "2001-12-20", "2002-01-31"),
          buildExample("疲劳管理", "提前复训", "2000-06-15", "2002-01-31"),
          buildExample("疲劳管理", "到期当天复训", "2002-01-31", "2002-01-31"),
          buildExample("飞行作风", "过期后补训", "2002-03-01", "2002-01-31"),
          buildExample("飞行作风", "再次复训", "2003-05-10", "2004-03-31")
        ]
      }
    ];
  }

  function badgeClass(resultType) {
    if (resultType === "命中窗口") return "warn";
    if (resultType === "超期") return "danger";
    return "info";
  }

  function renderProjectTable() {
    elements.projectBody.innerHTML = Config.PROJECT_RULES.map((rule) => `
      <tr>
        <td>${Utils.escapeHtml(rule.canonical)}</td>
        <td>${Utils.escapeHtml(rule.aliases.join(" / "))}</td>
        <td>${Utils.escapeHtml(rule.ruleType)}</td>
        <td>${Utils.escapeHtml(formatRuleDuration(rule))}</td>
        <td>${Utils.escapeHtml(formatWindowText(rule))}</td>
        <td>${Utils.escapeHtml(rule.rounding)}</td>
      </tr>
    `).join("");
  }

  function renderCaseSections() {
    elements.caseSections.innerHTML = buildSections().map((section) => `
      <article class="section" style="margin-top: 16px;">
        <div class="section-head">
          <div>
            <h3 class="section-title" style="margin-top:0;">${Utils.escapeHtml(section.title)}</h3>
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
                  <td>${Utils.escapeHtml(row.projectName)}</td>
                  <td>${Utils.escapeHtml(row.title)}</td>
                  <td>${Utils.escapeHtml(row.oldExpiry || "无")}</td>
                  <td>${Utils.escapeHtml(row.trainingDate)}</td>
                  <td><span class="badge ${badgeClass(row.resultType)}">${Utils.escapeHtml(row.resultType)}</span></td>
                  <td>${Utils.escapeHtml(row.newExpiry)}</td>
                  <td>${Utils.escapeHtml(row.reason)}</td>
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
})();
