import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function buildWorkbook() {
  const workbook = XLSX.utils.book_new();
  const peopleSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "分部", "技术信息", "是否运行", "备注"],
    ["1001", "张三", "一分部", "机长", "是", ""],
    ["1002", "李四", "二分部", "副驾驶", "是", ""],
    ["1003", "王五", "三分部", "机长", "是", ""],
    ["1004", "张雨", "教员组", "教员", "是", "CRM教员"],
    ["1006", "王军锋", "教员组", "教员", "是", "CRM教员"],
    ["1005", "赵六", "三分部", "副驾驶", "否", "不运行"]
  ], { cellDates: true });
  const oldCrmSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "培训开始日期", "培训结束日期", "培训信息是否录入", "教员", "备注"],
    ["1002", "李四", makeDate(2026, 1, 1), makeDate(2026, 1, 1), "是", "田鹏", ""]
  ], { cellDates: true });
  const crmSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "培训开始日期", "培训结束日期", "培训信息是否录入", "教员", "备注"],
    ["1001", "张三", makeDate(2026, 12, 31), makeDate(2026, 12, 31), "否", "张雨", ""],
    ["1002", "李四", makeDate(2027, 1, 1), makeDate(2027, 1, 1), "否", "田鹏", ""],
    ["", "李四", makeDate(2026, 2, 1), makeDate(2026, 2, 1), "否", "田鹏", ""],
    ["1003", "王五", makeDate(2026, 6, 1), makeDate(2026, 6, 1), "是", "张雨", "取消"]
  ], { cellDates: true });

  XLSX.utils.book_append_sheet(workbook, peopleSheet, "人员信息表");
  XLSX.utils.book_append_sheet(workbook, oldCrmSheet, "CRM2025(不参与统计)");
  XLSX.utils.book_append_sheet(workbook, crmSheet, "CRM");
  return workbook;
}

describe("crm annual check", () => {
  let Scanner: any;
  let CrmAnnual: any;

  beforeAll(() => {
    const context = loadBrowserScripts([
      "tool/app/super-training-test/scripts/config.js",
      "tool/app/super-training-test/scripts/utils.js",
      "tool/app/super-training-test/scripts/crm-instructors.js",
      "tool/app/super-training-test/scripts/training-record-policy.js",
      "tool/app/super-training-test/scripts/scanner.js",
      "tool/app/super-training-test/scripts/crm-annual.js"
    ], {
      XLSX
    });

    const superTraining = context.SuperTraining as {
      Scanner: any;
      CrmAnnual: any;
    };

    Scanner = superTraining.Scanner;
    CrmAnnual = superTraining.CrmAnnual;
  });

  it("checks CRM by calendar year from the exact CRM sheet only", () => {
    const workbook = buildWorkbook();
    const analysis = Scanner.analyzeWorkbook(workbook);
    const result = CrmAnnual.buildAnnualCheck(workbook, analysis, Scanner, 2026);

    expect(result.hasCrmSheet).toBe(true);
    expect(result.requiredPeople.map((person: any) => person.name)).toEqual(["张三", "李四", "王五"]);
    expect(result.attendedPeople.map((person: any) => person.name)).toEqual(["张三", "李四"]);
    expect(result.missingPeople.map((person: any) => person.name)).toEqual(["王五"]);
    expect(result.stats).toMatchObject({
      required: 3,
      attended: 2,
      missing: 1
    });
    expect(result.participationRows).toEqual([
      { name: "已参加", value: 2, kind: "attended" },
      { name: "未参加", value: 1, kind: "missing" }
    ]);
    expect(result.monthlyRows[1]).toEqual({ label: "2月", count: 1, kind: "attended" });
    expect(result.monthlyRows[11]).toEqual({ label: "12月", count: 1, kind: "attended" });
    expect(result.monthlyRows[12]).toEqual({ label: "未参加", count: 1, kind: "missing" });
  });
});
