import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function buildWorkbook() {
  const workbook = XLSX.utils.book_new();

  const peopleSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "危险品", "TSA安保"],
    ["1001", "张三", makeDate(2026, 5, 31), makeDate(2026, 5, 31)]
  ], { cellDates: true });

  const dangerousGoodsSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "项目名称", "培训信息是否录入", "培训开始日期", "培训结束日期", "有效期", "备注"],
    ["1001", "张三", "危险品", "是", makeDate(2026, 1, 10), makeDate(2026, 1, 10), "", ""],
    ["1002", "李四", "危险品", "否", makeDate(2026, 1, 12), makeDate(2026, 1, 12), "", ""],
    ["1003", "王五", "危险品", "是", makeDate(2026, 2, 10), makeDate(2026, 2, 10), "", "取消"],
    ["1004", "赵六", "危险品", "是", makeDate(2025, 12, 20), makeDate(2025, 12, 20), "", ""]
  ], { cellDates: true });

  const tsaSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "项目名称", "培训信息是否录入", "培训开始日期", "培训结束日期", "有效期", "备注"],
    ["1005", "钱七", "TSA安保", "是", makeDate(2026, 1, 15), makeDate(2026, 1, 15), "", ""],
    ["1006", "孙八", "TSA安保", "是", "", makeDate(2026, 3, 3), "", ""]
  ], { cellDates: true });

  XLSX.utils.book_append_sheet(workbook, peopleSheet, "人员信息表");
  XLSX.utils.book_append_sheet(workbook, dangerousGoodsSheet, "危险品");
  XLSX.utils.book_append_sheet(workbook, tsaSheet, "TSA安保");
  return workbook;
}

describe("annual training stats", () => {
  let Scanner: any;
  let AnnualTrainingStats: any;

  beforeAll(() => {
    const context = loadBrowserScripts([
      "tool/app/training-workbench/scripts/config.js",
      "tool/app/training-workbench/scripts/utils.js",
      "tool/app/training-workbench/scripts/training-record-policy.js",
      "tool/app/training-workbench/scripts/scanner.js",
      "tool/app/training-workbench/scripts/annual-training-stats.js"
    ], {
      XLSX
    });

    const trainingTool = context.TrainingTool as {
      Scanner: any;
      AnnualTrainingStats: any;
    };

    Scanner = trainingTool.Scanner;
    AnnualTrainingStats = trainingTool.AnnualTrainingStats;
  });

  it("counts recorded and non-cancelled project rows by project, year, and month", () => {
    const workbook = buildWorkbook();
    const analysis = Scanner.analyzeWorkbook(workbook);

    const annual = AnnualTrainingStats.buildDistribution(analysis, { year: 2026 });
    expect(annual.summary.total).toBe(3);
    expect(annual.summary.projectCount).toBe(2);
    expect(annual.summary.projectRows).toEqual([
      { projectName: "TSA安保", total: 2 },
      { projectName: "危险品", total: 1 }
    ]);
    expect(annual.summary.monthRows.filter((row: any) => row.total > 0)).toEqual([
      { label: "2026-01", total: 2 },
      { label: "2026-03", total: 1 }
    ]);
    expect(annual.filterOptions.years).toEqual(["2026", "2025"]);
    expect(annual.filterOptions.months).toEqual(["2026-01", "2026-03"]);

    const januaryTsa = AnnualTrainingStats.buildDistribution(analysis, {
      projectName: "TSA安保",
      year: 2026,
      monthKey: "2026-01"
    });
    expect(januaryTsa.summary.total).toBe(1);
    expect(januaryTsa.rows.map((row: any) => `${row.projectName}/${row.name}/${row.trainingDate}`)).toEqual([
      "TSA安保/钱七/2026-01-15"
    ]);
  });
});
