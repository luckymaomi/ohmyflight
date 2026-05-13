import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function buildWorkbook() {
  const workbook = XLSX.utils.book_new();
  const peopleSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "分部", "技术信息", "应急训练", "危险品", "航空安保", "TSA安保", "疲劳管理", "飞行作风", "英语能力", "汉语能力", "是否运行", "备注"],
    ["1001", "张三", "一分部", "777:C类机长", makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), "是", ""],
    ["1001", "重复员工号", "一分部", "转入待定", makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), makeDate(2026, 5, 31), "是", ""]
  ], { cellDates: true });
  const projectHeaders = ["员工号", "姓名", "项目名称", "培训信息是否录入", "培训开始日期", "培训结束日期", "有效期", "备注"];
  const normalProjectSheet = XLSX.utils.aoa_to_sheet([
    projectHeaders,
    ["1001", "张三", "应急训练", "是", makeDate(2026, 5, 10), makeDate(2026, 5, 10), "", "取消"],
    ["1002", "李四", "应急训练", "否", "不是日期", "", "", ""]
  ], { cellDates: true });
  const crmOldSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "培训开始日期", "培训结束日期", "培训信息是否录入", "教员", "备注"],
    ["1001", "张三", makeDate(2025, 1, 1), makeDate(2025, 1, 1), "是", "张雨", ""]
  ], { cellDates: true });
  const crmSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "培训开始日期", "培训结束日期", "培训信息是否录入", "教员", "备注"],
    ["1001", "张三", makeDate(2026, 3, 1), makeDate(2026, 3, 1), "否", "张雨", ""]
  ], { cellDates: true });
  const ignoredSheet = XLSX.utils.aoa_to_sheet([
    ["随便写"],
    ["不参与监控"]
  ]);

  XLSX.utils.book_append_sheet(workbook, peopleSheet, "人员信息表");
  XLSX.utils.book_append_sheet(workbook, normalProjectSheet, "应急训练");
  XLSX.utils.book_append_sheet(workbook, normalProjectSheet, "危险品");
  XLSX.utils.book_append_sheet(workbook, normalProjectSheet, "航空安保");
  XLSX.utils.book_append_sheet(workbook, normalProjectSheet, "TSA安保");
  XLSX.utils.book_append_sheet(workbook, normalProjectSheet, "疲劳管理");
  XLSX.utils.book_append_sheet(workbook, normalProjectSheet, "飞行作风");
  XLSX.utils.book_append_sheet(workbook, normalProjectSheet, "英语能力");
  XLSX.utils.book_append_sheet(workbook, normalProjectSheet, "汉语能力");
  XLSX.utils.book_append_sheet(workbook, crmOldSheet, "CRM2025(不参与统计)");
  XLSX.utils.book_append_sheet(workbook, crmSheet, "CRM");
  XLSX.utils.book_append_sheet(workbook, ignoredSheet, "新雇员培训");
  return workbook;
}

describe("workbook health", () => {
  let Scanner: any;
  let WorkbookHealth: any;

  beforeAll(() => {
    const context = loadBrowserScripts([
      "tool/app/training-workbench/scripts/config.js",
      "tool/app/training-workbench/scripts/utils.js",
      "tool/app/training-workbench/scripts/crm-instructors.js",
      "tool/app/training-workbench/scripts/training-record-policy.js",
      "tool/app/training-workbench/scripts/scanner.js",
      "tool/app/training-workbench/scripts/crm-annual.js",
      "tool/app/training-workbench/scripts/workbook-health.js"
    ], {
      XLSX
    });

    const trainingTool = context.TrainingTool as {
      Scanner: any;
      WorkbookHealth: any;
    };

    Scanner = trainingTool.Scanner;
    WorkbookHealth = trainingTool.WorkbookHealth;
  });

  it("reports current workbook structure and data health without duplicating business rules", () => {
    const workbook = buildWorkbook();
    const analysis = Scanner.analyzeWorkbook(workbook);
    const result = WorkbookHealth.buildWorkbookHealth(workbook, analysis, Scanner, { crmYear: 2026 });
    const messages = result.items.map((item: any) => `${item.area}|${item.message}|${item.detail}`);

    expect(result.summary.warning).toBeGreaterThan(0);
    expect(messages).toContain("人员信息表|员工号 1001 重复出现。|行号：2、3");
    expect(messages.some((message: string) => message.includes("培训信息是否录入为“是”，但备注包含“取消”"))).toBe(true);
    expect(messages.some((message: string) => message.includes("培训日期无法解析"))).toBe(true);
    expect(messages.some((message: string) => message.includes("发现工作表“CRM2025(不参与统计)”，系统不会作为当年 CRM 核对来源。"))).toBe(true);
    expect(messages.some((message: string) => message.includes("2026 年 CRM 核对可生成。"))).toBe(true);
    expect(messages.some((message: string) => message.includes("工作表“新雇员培训”当前不参与培训皇帝监控。"))).toBe(true);
  });
});
