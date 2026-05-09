import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function buildWorkbook() {
  const workbook = XLSX.utils.book_new();

  const peopleSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "危险品"],
    ["3001", "必须排", makeDate(2026, 5, 31)],
    ["3002", "推荐排", makeDate(2026, 6, 30)],
    ["3003", "已排未录入", makeDate(2026, 5, 31)],
    ["3004", "已录入待更新", makeDate(2026, 5, 31)]
  ], { cellDates: true });

  const projectSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "项目名称", "培训信息是否录入", "培训开始日期", "培训结束日期", "有效期", "备注", "训练类型"],
    ["", "", "危险品", "否", makeDate(2026, 5, 20), makeDate(2026, 5, 20), "", "", "复训"],
    ["3003", "已排未录入", "危险品", "否", makeDate(2026, 5, 10), makeDate(2026, 5, 10), "", "", ""],
    ["3004", "已录入待更新", "危险品", "是", makeDate(2026, 5, 10), makeDate(2026, 5, 10), "", "", ""]
  ], { cellDates: true });

  XLSX.utils.book_append_sheet(workbook, peopleSheet, "人员信息表");
  XLSX.utils.book_append_sheet(workbook, projectSheet, "危险品");
  return workbook;
}

describe("schedule plan", () => {
  let Scanner: any;
  let Schedule: any;

  beforeAll(() => {
    const context = loadBrowserScripts([
      "tool/app/super-training-test/scripts/config.js",
      "tool/app/super-training-test/scripts/utils.js",
      "tool/app/super-training-test/scripts/training-ignore-list.js",
      "tool/app/super-training-test/scripts/training-record-policy.js",
      "tool/app/super-training-test/scripts/scanner.js",
      "tool/app/super-training-test/scripts/rule-engine.js",
      "tool/app/super-training-test/scripts/schedule-assessment.js",
      "tool/app/super-training-test/scripts/schedule.js"
    ], {
      XLSX
    });

    const superTraining = context.SuperTraining as {
      Scanner: any;
      Schedule: any;
    };

    Scanner = superTraining.Scanner;
    Schedule = superTraining.Schedule;
  });

  it("uses the unified assessment result and does not pre-schedule covered people again", () => {
    const workbook = buildWorkbook();
    const analysis = Scanner.analyzeWorkbook(workbook);
    const result = Schedule.buildSchedulePlan(
      analysis,
      ["危险品"],
      makeDate(2026, 5, 8),
      makeDate(2026, 5, 31)
    );

    expect(result.detailRows.map((row: any) => row.name)).toEqual(["必须排", "推荐排"]);
    expect(result.detailRows.map((row: any) => row.status)).toEqual(["必须排", "推荐排"]);
    expect(result.skippedRows.map((row: any) => `${row.name}/${row.status}`)).toContain("已排未录入/已排未录入");
    expect(result.skippedRows.map((row: any) => `${row.name}/${row.status}`)).toContain("已录入待更新/已录入待更新");
    expect(result.statsCards).toContainEqual({ label: "必须排", value: 1 });
    expect(result.statsCards).toContainEqual({ label: "推荐排", value: 1 });
  });
});
