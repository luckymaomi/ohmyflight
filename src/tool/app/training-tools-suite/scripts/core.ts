(function () {
  type TrainingToolsSheetValue = unknown;
  type TrainingToolsSheetRow = TrainingToolsSheetValue[];
  type TrainingToolsSheetMatrix = TrainingToolsSheetRow[];
  type TrainingToolsSheetRecord = Record<string, TrainingToolsSheetValue> & { __rowNumber: number };
  type TrainingToolsBuildSheetOptions = {
    dateHeaders?: Iterable<string>;
  };

  const DEFAULT_RULES = [
    {
      canonical: "应急训练",
      aliases: ["应急训练", "EP-飞行人员应急复训"],
      ruleType: "基准月",
      validityValue: 24,
      validityUnit: "日历月",
      baseMonthFlex: 1,
      rounding: "月底",
      enabled: true,
      note: "基准月前后 1 个月内复训沿用原基准月"
    },
    {
      canonical: "危险品",
      aliases: ["危险品", "DGET-危险品培训"],
      ruleType: "3个月窗口（截止到前一日）",
      validityValue: 2,
      validityUnit: "年",
      baseMonthFlex: 0,
      rounding: "当日",
      enabled: true,
      note: "到期前 3 个日历月内复训沿用原到期锚点，但必须在失效前 1 日前完成"
    },
    {
      canonical: "航空安保",
      aliases: ["航空安保"],
      ruleType: "最新日期",
      validityValue: 24,
      validityUnit: "日历月",
      baseMonthFlex: 0,
      rounding: "月底",
      enabled: true,
      note: "按最新培训开始日期重算"
    },
    {
      canonical: "疲劳管理",
      aliases: ["疲劳管理"],
      ruleType: "最新日期",
      validityValue: 24,
      validityUnit: "日历月",
      baseMonthFlex: 0,
      rounding: "月底",
      enabled: true,
      note: "按最新培训开始日期重算"
    },
    {
      canonical: "飞行作风",
      aliases: ["飞行作风"],
      ruleType: "最新日期",
      validityValue: 24,
      validityUnit: "日历月",
      baseMonthFlex: 0,
      rounding: "月底",
      enabled: true,
      note: "按最新培训开始日期重算"
    },
    {
      canonical: "英语能力",
      aliases: ["英语能力", "LG_STUDY-英语语言学习/考试"],
      ruleType: "3个月窗口",
      validityValue: 3,
      validityUnit: "年",
      baseMonthFlex: 0,
      rounding: "当日",
      enabled: true,
      note: "ICAO4：到期前 3 个日历月内考试沿用原到期锚点，窗口含到期日"
    },
    {
      canonical: "汉语能力",
      aliases: ["汉语能力", "LG_STUDY-汉语语言学习/考试"],
      ruleType: "3个月窗口",
      validityValue: 6,
      validityUnit: "年",
      baseMonthFlex: 0,
      rounding: "当日",
      enabled: true,
      note: "ICAO5：到期前 3 个日历月内考试沿用原到期锚点，窗口含到期日"
    }
  ];

  const RULE_REQUIRED_HEADERS = [
    "项目名称",
    "规则类型",
    "有效期数值",
    "有效期单位",
    "基准月浮动月数",
    "到期取整方式",
    "是否启用"
  ];

  const TRAINING_REQUIRED_HEADERS = [
    "员工号",
    "姓名",
    "项目名称",
    "培训开始日期",
    "培训结束日期",
    "培训信息是否录入"
  ];

  const CONFLICT_REQUIRED_HEADERS = [
    "姓名",
    "项目名称",
    "培训开始日期",
    "培训结束日期"
  ];

  const VALIDITY_REQUIRED_HEADERS = ["员工号", "姓名"];
  const EXCEL_DATE_FORMAT = "yyyy/mm/dd";
  const CENTER_ALIGNMENT = { horizontal: "center", vertical: "center" };

  const PROJECT_ORDER = DEFAULT_RULES.map((item) => item.canonical);
  const PROJECT_LOOKUP = new Map();

  DEFAULT_RULES.forEach((item) => {
    [item.canonical, ...item.aliases].forEach((alias) => PROJECT_LOOKUP.set(alias, item.canonical));
  });

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function isNullLikeText(value) {
    const text = normalizeText(value);
    return ["不适用", "N/A", "NA", "None", "无", "/"].includes(text);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function makeDate(year, month, day) {
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function isValidDate(value) {
    return value instanceof Date && !Number.isNaN(value.valueOf());
  }

  function cloneDate(value) {
    return makeDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  function formatDate(value) {
    return isValidDate(value)
      ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      : "";
  }

  function monthEnd(year, month) {
    return makeDate(year, month, new Date(year, month, 0).getDate());
  }

  function firstDayOfMonth(value) {
    return makeDate(value.getFullYear(), value.getMonth() + 1, 1);
  }

  function excelSerialToDate(serial) {
    if (!Number.isFinite(serial)) return null;
    const epoch = Date.UTC(1899, 11, 30);
    const milliseconds = Math.round(serial * 86400000);
    const date = new Date(epoch + milliseconds);
    if (!isValidDate(date)) return null;
    return makeDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  function parseDate(value) {
    if (value === undefined || value === null || value === "") return null;
    if (isValidDate(value)) return cloneDate(value);
    if (typeof value === "number" && Number.isFinite(value)) return excelSerialToDate(value);

    const text = normalizeText(value);
    if (!text || isNullLikeText(text)) return null;

    let matched = text.replace(/\//g, "-").replace(/\./g, "-").replace("T", " ").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matched) return makeDate(Number(matched[1]), Number(matched[2]), Number(matched[3]));

    matched = text.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (matched) return makeDate(Number(matched[1]), Number(matched[2]), Number(matched[3]));
    return null;
  }

  function normalizeNumberLike(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (isValidDate(value)) {
      const excelEpoch = makeDate(1899, 12, 30);
      return Math.round((value.getTime() - excelEpoch.getTime()) / 86400000);
    }
    const text = normalizeText(value);
    if (!text) return 0;
    const direct = Number(text);
    if (Number.isFinite(direct)) return direct;
    const matched = text.match(/-?\d+(?:\.\d+)?/);
    return matched ? Number(matched[0]) : 0;
  }

  function normalizeProjectName(name) {
    const text = normalizeText(name);
    if (!text) return "";
    return PROJECT_LOOKUP.get(text) || text;
  }

  function sortRules(rules) {
    return [...rules].sort((left, right) => {
      const leftIndex = PROJECT_ORDER.indexOf(left.canonical);
      const rightIndex = PROJECT_ORDER.indexOf(right.canonical);
      const normalizedLeft = leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex;
      if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
      return left.canonical.localeCompare(right.canonical, "zh-Hans-CN");
    });
  }

  function rangesOverlap(startA, endA, startB, endB) {
    if (!startA || !endA || !startB || !endB) return false;
    return startA <= endB && startB <= endA;
  }

  function addMonths(value, months) {
    const totalMonth = value.getMonth() + months;
    const year = value.getFullYear() + Math.floor(totalMonth / 12);
    const month = ((totalMonth % 12) + 12) % 12 + 1;
    const day = Math.min(value.getDate(), new Date(year, month, 0).getDate());
    return makeDate(year, month, day);
  }

  function addYears(value, years) {
    const year = value.getFullYear() + years;
    const month = value.getMonth() + 1;
    const day = Math.min(value.getDate(), new Date(year, month, 0).getDate());
    return makeDate(year, month, day);
  }

  function addValidity(dateValue, rule) {
    const usesYears = normalizeText(rule.validityUnit).includes("年");
    const base = usesYears ? addYears(dateValue, rule.validityValue) : addMonths(dateValue, rule.validityValue);
    return normalizeText(rule.rounding) === "月底" ? monthEnd(base.getFullYear(), base.getMonth() + 1) : base;
  }

  function calculateBaseMonthExpiry(trainingDate, validityMonths) {
    const anchor = firstDayOfMonth(trainingDate);
    const expiryMonth = addMonths(anchor, validityMonths + 1);
    return monthEnd(expiryMonth.getFullYear(), expiryMonth.getMonth() + 1);
  }

  function inferBaseMonthWindow(oldExpiry, flexMonths) {
    const baseMonth = firstDayOfMonth(addMonths(oldExpiry, -1));
    const windowStart = firstDayOfMonth(addMonths(baseMonth, -flexMonths));
    const windowEndMonth = addMonths(baseMonth, flexMonths);
    const windowEnd = monthEnd(windowEndMonth.getFullYear(), windowEndMonth.getMonth() + 1);
    return { windowStart, windowEnd, baseMonth };
  }

  function shiftDays(value, days) {
    const shifted = cloneDate(value);
    shifted.setDate(shifted.getDate() + days);
    return shifted;
  }

  function isThreeMonthWindowRule(rule) {
    const ruleType = normalizeText(rule.ruleType);
    return ruleType === "3个月窗口（截止到前一日）" || ruleType === "3个月窗口";
  }

  function resolveWindowPolicy(rule) {
    const ruleType = normalizeText(rule.ruleType);

    if (ruleType === "3个月窗口（截止到前一日）") {
      return {
        unit: "month",
        amount: 3,
        endOffsetDays: -1,
        tag: "3个月窗口（截止到前一日）",
        detailLabel: "3个月窗口"
      };
    }

    if (ruleType === "3个月窗口") {
      return {
        unit: "month",
        amount: 3,
        endOffsetDays: 0,
        tag: "3个月窗口",
        detailLabel: "3个月窗口"
      };
    }

    return null;
  }

  function buildWindowRange(oldExpiry, windowPolicy) {
    const windowStart = windowPolicy.unit === "month"
      ? addMonths(oldExpiry, -windowPolicy.amount)
      : shiftDays(oldExpiry, -windowPolicy.amount);
    const windowEnd = shiftDays(oldExpiry, windowPolicy.endOffsetDays);
    return { windowStart, windowEnd };
  }

  function getWindowInfo(rule, oldExpiry) {
    const ruleType = normalizeText(rule.ruleType);
    if (!oldExpiry) {
      return {
        hasWindow: false,
        windowStart: null,
        windowEnd: null,
        tag: "",
        detail: "无旧有效期，无法推导窗口。"
      };
    }

    if (ruleType === "基准月") {
      const { windowStart, windowEnd, baseMonth } = inferBaseMonthWindow(oldExpiry, rule.baseMonthFlex);
      return {
        hasWindow: true,
        windowStart,
        windowEnd,
        tag: "基准月窗口",
        detail: `当前基准月为 ${baseMonth.getMonth() + 1} 月，窗口为 ${formatDate(windowStart)} 至 ${formatDate(windowEnd)}。`
      };
    }

    const windowPolicy = resolveWindowPolicy(rule);
    if (windowPolicy) {
      const { windowStart, windowEnd } = buildWindowRange(oldExpiry, windowPolicy);
      return {
        hasWindow: true,
        windowStart,
        windowEnd,
        tag: windowPolicy.tag,
        detail: `旧截止锚点为 ${formatDate(oldExpiry)}，${windowPolicy.detailLabel}为 ${formatDate(windowStart)} 至 ${formatDate(windowEnd)}。`
      };
    }

    return {
      hasWindow: false,
      windowStart: null,
      windowEnd: null,
      tag: "无窗口",
      detail: "该项目无窗口期，只按最新培训开始日期直接重算。"
    };
  }

  function computeExpiry(rule, trainingDate, oldExpiry) {
    const ruleType = normalizeText(rule.ruleType);

    if (ruleType === "最新日期") {
      const newExpiry = addValidity(trainingDate, rule);
      return { newExpiry, reason: `无窗口期，按本次培训开始日期直接重算到 ${formatDate(newExpiry)}。` };
    }

    const windowPolicy = resolveWindowPolicy(rule);
    if (windowPolicy) {
      if (oldExpiry) {
        const windowInfo = getWindowInfo(rule, oldExpiry);
        if (trainingDate >= windowInfo.windowStart && trainingDate <= windowInfo.windowEnd) {
          const newExpiry = addValidity(oldExpiry, rule);
          return { newExpiry, reason: `命中${windowInfo.tag}，沿用旧截止锚点顺延到 ${formatDate(newExpiry)}。` };
        }
      }
      const newExpiry = addValidity(trainingDate, rule);
      return { newExpiry, reason: `未命中${windowPolicy.detailLabel}，按本次培训开始日期重算到 ${formatDate(newExpiry)}。` };
    }

    if (ruleType === "基准月") {
      if (oldExpiry) {
        const windowInfo = getWindowInfo(rule, oldExpiry);
        if (trainingDate >= windowInfo.windowStart && trainingDate <= windowInfo.windowEnd) {
          const newExpiry = addValidity(oldExpiry, rule);
          return { newExpiry, reason: `命中基准月窗口，保留原基准月并顺延到下一轮 ${formatDate(newExpiry)}。` };
        }
      }
      const newExpiry = calculateBaseMonthExpiry(trainingDate, rule.validityValue);
      return { newExpiry, reason: `未命中基准月窗口，基准月改为 ${trainingDate.getMonth() + 1} 月，新有效期为 ${formatDate(newExpiry)}。` };
    }

    throw new Error(`不支持的规则类型：${ruleType}`);
  }

  function daysBetween(later, earlier) {
    return Math.round((later.getTime() - earlier.getTime()) / 86400000);
  }

  function formatRuleDuration(rule) {
    return `${rule.validityValue}${normalizeText(rule.validityUnit)}`;
  }

  function formatWindowText(rule) {
    const ruleType = normalizeText(rule.ruleType);
    if (ruleType === "基准月") return `基准月前后 ${rule.baseMonthFlex} 个月`;
    const windowPolicy = resolveWindowPolicy(rule);
    if (windowPolicy) {
      if (windowPolicy.unit === "month") {
        return windowPolicy.endOffsetDays < 0 ? "到期前 3 个月（截止到前一日）" : "到期前 3 个月（含到期日）";
      }
      return `到期前 ${windowPolicy.amount} 天`;
    }
    return "无窗口";
  }

  function computeSheetWidths(rows) {
    const widths = [];
    rows.forEach((row) => {
      row.forEach((value, index) => {
        const text = String(value ?? "");
        widths[index] = Math.min(38, Math.max(widths[index] || 10, text.length + 2));
      });
    });
    return widths.map((wch) => ({ wch }));
  }

  function cloneSimple(value) {
    if (isValidDate(value)) return cloneDate(value);
    if (Array.isArray(value)) return value.map((item) => cloneSimple(item));
    if (!value || typeof value !== "object") return value;
    const result = {};
    Object.keys(value).forEach((key) => {
      result[key] = cloneSimple(value[key]);
    });
    return result;
  }

  function deepClone(value) {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch (error) {
        return cloneSimple(value);
      }
    }
    return cloneSimple(value);
  }

  function mergeStyle(baseStyle, patchStyle) {
    const base = baseStyle && typeof baseStyle === "object" ? deepClone(baseStyle) : {};
    Object.keys(patchStyle || {}).forEach((key) => {
      const baseValue = base[key];
      const patchValue = patchStyle[key];
      if (
        baseValue &&
        patchValue &&
        typeof baseValue === "object" &&
        typeof patchValue === "object" &&
        !Array.isArray(baseValue) &&
        !Array.isArray(patchValue)
      ) {
        base[key] = mergeStyle(baseValue, patchValue);
      } else {
        base[key] = deepClone(patchValue);
      }
    });
    return base;
  }

  function stripExtension(fileName) {
    return normalizeText(fileName).replace(/\.[^.]+$/, "");
  }

  function buildTimestamp() {
    const now = new Date();
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate())
    ].join("") + "_" + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");
  }

  function buildOutputFileName(sourceFileName, actionLabel) {
    return `${stripExtension(sourceFileName)}_${actionLabel}_${buildTimestamp()}.xlsx`;
  }

  function prepareRowsForSheet(rows, dateHeaders) {
    const normalizedDateHeaders = new Set((dateHeaders || []).map((item) => normalizeText(item)));
    if (!rows.length || !normalizedDateHeaders.size) return rows;

    const headers = rows[0].map((item) => normalizeText(item));
    return rows.map((row, rowIndex) => {
      if (rowIndex === 0) return row;
      return row.map((value, columnIndex) => {
        if (!normalizedDateHeaders.has(headers[columnIndex])) return value;
        return parseDate(value) || value;
      });
    });
  }

  function applyDateFormats(sheet, rows, dateHeaders) {
    const normalizedDateHeaders = new Set((dateHeaders || []).map((item) => normalizeText(item)));
    if (!rows.length || !normalizedDateHeaders.size) return;

    const headers = rows[0].map((item) => normalizeText(item));
    headers.forEach((header, columnIndex) => {
      if (!normalizedDateHeaders.has(header)) return;
      for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        const dateValue = parseDate(rows[rowIndex][columnIndex]);
        if (!dateValue) continue;
        const address = window.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        if (!sheet[address]) continue;
        sheet[address].z = EXCEL_DATE_FORMAT;
      }
    });
  }

  function applyCenterAlignment(sheet) {
    Object.keys(sheet || {}).forEach((address) => {
      if (address.startsWith("!")) return;
      const cell = sheet[address];
      if (!cell || typeof cell !== "object") return;
      const currentStyle = cell.s && typeof cell.s === "object" ? cell.s : {};
      const currentAlignment = currentStyle.alignment && typeof currentStyle.alignment === "object"
        ? currentStyle.alignment
        : {};

      cell.s = {
        ...currentStyle,
        alignment: {
          ...currentAlignment,
          ...CENTER_ALIGNMENT
        }
      };
    });
  }

  function buildSheet(rows: TrainingToolsSheetMatrix, options: TrainingToolsBuildSheetOptions = {}) {
    const preparedRows = prepareRowsForSheet(rows, options.dateHeaders);
    const sheet = window.XLSX.utils.aoa_to_sheet(preparedRows, { cellDates: true });
    applyDateFormats(sheet, rows, options.dateHeaders);
    applyCenterAlignment(sheet);
    sheet["!cols"] = computeSheetWidths(rows);
    return sheet;
  }

  function readWorkbookFile(file) {
    if (!window.XLSX) throw new Error("未加载 XLSX 库。");
    return file.arrayBuffer().then((buffer) => window.XLSX.read(buffer, { type: "array", cellDates: true }));
  }

  function sheetToMatrix(sheet): TrainingToolsSheetMatrix {
    return window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, dateNF: "yyyy-mm-dd" }) as TrainingToolsSheetMatrix;
  }

  function sheetToObjects(matrix: TrainingToolsSheetMatrix): TrainingToolsSheetRecord[] {
    if (!matrix.length) return [];
    const headers = matrix[0].map((item) => normalizeText(item));
    return matrix.slice(1).reduce<TrainingToolsSheetRecord[]>((rows, row, index) => {
      if (!row.some((value) => value !== undefined && value !== null && normalizeText(value) !== "")) return rows;
      const item = { __rowNumber: index + 2 } as TrainingToolsSheetRecord;
      headers.forEach((header, headerIndex) => {
        item[header] = row[headerIndex];
      });
      rows.push(item);
      return rows;
    }, []);
  }

  function ensureRequiredHeaders(headers, requiredHeaders, sheetName) {
    const normalizedHeaders = headers.map((item) => normalizeText(item));
    const missing = requiredHeaders.filter((item) => !normalizedHeaders.includes(item));
    if (missing.length) throw new Error(`${sheetName} 缺少必要列：${missing.join("、")}。`);
  }

  function findSheetInfo(workbook, preferredName, requiredHeaders) {
    const preferred = preferredName ? [preferredName] : [];
    const names = [...preferred, ...workbook.SheetNames.filter((name) => !preferred.includes(name))];
    for (const name of names) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const matrix = sheetToMatrix(sheet);
      const headers = (matrix[0] || []).map((item) => normalizeText(item));
      const hasAll = requiredHeaders.every((item) => headers.includes(item));
      if (hasAll) return { name, sheet, matrix, headers, rows: sheetToObjects(matrix) };
    }
    throw new Error(`未找到符合要求的工作表：${requiredHeaders.join("、")}。`);
  }

  function normalizeYes(value) {
    const text = normalizeText(value);
    return ["是", "Y", "y", "YES", "Yes", "true", "TRUE", "1"].includes(text);
  }

  function normalizeRule(row) {
    const projectName = normalizeProjectName(row["项目名称"]);
    return {
      canonical: projectName,
      aliases: [projectName],
      ruleType: normalizeText(row["规则类型"]),
      validityValue: normalizeNumberLike(row["有效期数值"]),
      validityUnit: normalizeText(row["有效期单位"]),
      baseMonthFlex: normalizeNumberLike(row["基准月浮动月数"]),
      rounding: normalizeText(row["到期取整方式"]),
      enabled: normalizeYes(row["是否启用"]),
      note: normalizeText(row["备注"])
    };
  }

  function buildRuleMap(ruleRows) {
    const ruleMap = new Map();
    ruleRows.forEach((row) => {
      if (!normalizeText(row["项目名称"])) return;
      const normalized = normalizeRule(row);
      ruleMap.set(normalized.canonical, normalized);
    });
    return ruleMap;
  }

  function readRuleWorkbook(workbook) {
    const ruleInfo = findSheetInfo(workbook, "规则表", RULE_REQUIRED_HEADERS);
    const headers = ruleInfo.headers;
    const rows = ruleInfo.rows;
    const ruleMap = buildRuleMap(rows);
    const enabledRules = sortRules(Array.from(ruleMap.values()).filter((item) => item.enabled));
    return { sheetName: ruleInfo.name, headers, rows, ruleMap, enabledRules };
  }

  function readTrainingWorkbook(workbook) {
    const ruleInfo = findSheetInfo(workbook, "规则表", RULE_REQUIRED_HEADERS);
    const trainingInfo = findSheetInfo(workbook, "培训表", TRAINING_REQUIRED_HEADERS);
    return {
      ruleInfo: { ...ruleInfo, ruleMap: buildRuleMap(ruleInfo.rows) },
      trainingInfo
    };
  }

  function readConflictWorkbook(workbook) {
    return findSheetInfo(workbook, "培训表", CONFLICT_REQUIRED_HEADERS);
  }

  function readValidityWorkbook(workbook) {
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    if (!firstSheet) throw new Error("有效期表文件至少需要一张工作表。");
    const matrix = sheetToMatrix(firstSheet);
    if (!matrix.length) throw new Error("有效期表第一张工作表是空的。");
    const headers = (matrix[0] || []).map((item) => normalizeText(item));
    ensureRequiredHeaders(headers, VALIDITY_REQUIRED_HEADERS, `${firstSheetName}（第一张工作表）`);
    return {
      sheetName: firstSheetName,
      headers,
      matrix,
      rows: matrix.slice(1).filter((row) => row.some((value) => value !== undefined && value !== null && normalizeText(value) !== ""))
    };
  }

  function buildRuleTemplateRows() {
    return [["项目名称", "规则类型", "有效期数值", "有效期单位", "基准月浮动月数", "到期取整方式", "是否启用"], ...DEFAULT_RULES.map((rule) => [rule.canonical, rule.ruleType, rule.validityValue, rule.validityUnit, rule.baseMonthFlex, rule.rounding, rule.enabled ? "是" : "否"])];
  }

  function buildTrainingTemplateRows() {
    return [["员工号", "姓名", "项目名称", "培训开始日期", "培训结束日期", "培训信息是否录入"], [123456, "这里填入姓名", "应急训练", "2026/01/08", "2026/01/10", "是"], [123456, "这里填入姓名", "危险品", "2026/03/13", "2026/03/15", "否"], ["", "", "", "", "", ""]];
  }

  function buildValidityTemplateRows() {
    return [["员工号", "姓名", "应急训练", "危险品", "航空安保", "疲劳管理", "飞行作风", "英语能力", "汉语能力"], [123456, "这里填入姓名", "2028/02/29", "2027/05/05", "2027/07/31", "2027/07/31", "2027/07/31", "2028/09/15", "不适用"], ["", "", "", "", "", "", "", "", ""]];
  }

  function exportTrainingTemplate() {
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, buildSheet(buildRuleTemplateRows()), "规则表");
    window.XLSX.utils.book_append_sheet(workbook, buildSheet(buildTrainingTemplateRows(), { dateHeaders: ["培训开始日期", "培训结束日期"] }), "培训表");
    window.XLSX.utils.book_append_sheet(workbook, buildSheet([["工作簿", "工作表", "字段", "建议格式", "说明"], ["培训表模板", "规则表", "项目名称 / 规则类型 / 有效期数值 / 有效期单位 / 基准月浮动月数 / 到期取整方式 / 是否启用", "必填字段", "规则表至少保留这 7 列，列名建议直接沿用模板"], ["培训表模板", "规则表", "有效期数值 / 基准月浮动月数", "数值", "例如 24、3、6、1，不要设成日期格式"], ["培训表模板", "培训表", "员工号 / 姓名 / 项目名称 / 培训开始日期 / 培训结束日期 / 培训信息是否录入", "必填字段", "培训表至少保留这 6 列，其他业务列可自行加在后面"], ["培训表模板", "培训表", "培训开始日期 / 培训结束日期", "Excel 日期或文本 yyyy/mm/dd、yyyy-mm-dd", "有效期更新按培训开始日期计算；导出结果会写成 Excel 日期单元格，默认显示 yyyy/mm/dd"], ["培训表模板", "培训表", "培训信息是否录入", "文本", "只有精确为“是”的记录才参与有效期更新"], ["培训表模板", "培训表", "项目名称", "文本", "建议直接复用规则表里的项目名称"]]), "填写说明");
    window.XLSX.writeFile(workbook, "培训表模板_含规则表.xlsx");
  }

  function exportValidityTemplate() {
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, buildSheet([["工作簿", "工作表", "字段", "建议格式", "说明"], ["有效期表模板", "有效期表", "员工号 / 姓名", "必填字段", "用于人员识别，建议和培训表保持一致"], ["有效期表模板", "有效期表", "7 个项目列中的对应列", "至少保留需要更新或核对的项目列", "项目列名建议直接沿用模板中的标准名称"], ["有效期表模板", "有效期表", "项目列日期", "Excel 日期或文本 yyyy/mm/dd、yyyy-mm-dd", "导入时按日期解析，导出结果会写成 Excel 日期单元格，默认显示 yyyy/mm/dd"], ["有效期表模板", "有效期表", "空值", "空白", "没有旧有效期时直接留空"], ["有效期表模板", "有效期表", "不适用", "文本", "确实不适用时统一写“不适用”"]]), "填写说明");
    window.XLSX.utils.book_append_sheet(workbook, buildSheet(buildValidityTemplateRows(), { dateHeaders: PROJECT_ORDER }), "有效期表");
    window.XLSX.writeFile(workbook, "有效期表模板.xlsx");
  }

  function getDefaultRuleMap() {
    return new Map(DEFAULT_RULES.map((item) => [item.canonical, { ...item, aliases: [...item.aliases] }]));
  }

  window.TrainingTools = {
    DEFAULT_RULES,
    CONFLICT_REQUIRED_HEADERS,
    TRAINING_REQUIRED_HEADERS,
    RULE_REQUIRED_HEADERS,
    VALIDITY_REQUIRED_HEADERS,
    buildRuleMap,
    buildSheet,
    buildOutputFileName,
    cloneDate,
    computeExpiry,
    daysBetween,
    deepClone,
    escapeHtml,
    exportTrainingTemplate,
    exportValidityTemplate,
    findSheetInfo,
    formatDate,
    formatRuleDuration,
    formatWindowText,
    getDefaultRuleMap,
    isThreeMonthWindowRule,
    getWindowInfo,
    isNullLikeText,
    makeDate,
    mergeStyle,
    normalizeYes,
    normalizeProjectName,
    normalizeText,
    parseDate,
    readConflictWorkbook,
    readRuleWorkbook,
    readTrainingWorkbook,
    readValidityWorkbook,
    readWorkbookFile,
    rangesOverlap,
    sortRules
  };
})();
