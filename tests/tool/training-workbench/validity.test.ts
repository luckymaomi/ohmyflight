import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function buildWorkbook() {
  const workbook = XLSX.utils.book_new();
  const peopleSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "航空安保", "TSA"],
    ["3001", "安保人员", makeDate(2026, 5, 31), makeDate(2026, 5, 31)],
    ["3002", "TSA人员", makeDate(2027, 12, 31), makeDate(2026, 5, 31)]
  ], { cellDates: true });
  const securitySheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "项目名称", "培训信息是否录入", "培训开始日期", "培训结束日期", "有效期", "备注"],
    ["3001", "安保人员", "航空安保", "是", makeDate(2026, 5, 6), makeDate(2026, 5, 6), "", ""]
  ], { cellDates: true });
  const tsaSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "项目名称", "培训信息是否录入", "培训开始日期", "培训结束日期", "有效期", "备注"],
    ["3002", "TSA人员", "TSA", "是", makeDate(2026, 5, 6), makeDate(2026, 5, 6), "", ""]
  ], { cellDates: true });

  XLSX.utils.book_append_sheet(workbook, peopleSheet, "人员信息表");
  XLSX.utils.book_append_sheet(workbook, securitySheet, "航空安保");
  XLSX.utils.book_append_sheet(workbook, tsaSheet, "TSA");
  return workbook;
}

describe("validity update", () => {
  let Scanner: any;
  let Validity: any;
  let Utils: any;

  beforeAll(() => {
    const context = loadBrowserScripts([
      "tool/app/training-workbench/scripts/config.js",
      "tool/app/training-workbench/scripts/utils.js",
      "tool/app/training-workbench/scripts/training-record-policy.js",
      "tool/app/training-workbench/scripts/scanner.js",
      "tool/app/training-workbench/scripts/rule-engine.js",
      "tool/app/training-workbench/scripts/validity.js"
    ], {
      XLSX
    });

    const trainingTool = context.TrainingTool as {
      Scanner: any;
      Validity: any;
      Utils: any;
    };

    Scanner = trainingTool.Scanner;
    Validity = trainingTool.Validity;
    Utils = trainingTool.Utils;
  });

  it("updates TSA as an independent project and does not let security rows update TSA", () => {
    const workbook = buildWorkbook();
    const analysis = Scanner.analyzeWorkbook(workbook);
    const tsaProject = analysis.projectMap.get("TSA");
    expect(tsaProject.peopleHeader).toBe("TSA");
    expect(tsaProject.sheetName).toBe("TSA");

    const securityResult = Validity.buildValidityUpdate(workbook, analysis, ["航空安保"], "2026-05");
    expect(securityResult.updatedRecords.map((row: any) => `${row.projectName}/${row.name}/${row.newExpiry}`)).toEqual([
      "航空安保/安保人员/2028-05-31"
    ]);

    const peopleSheet = workbook.Sheets["人员信息表"];
    expect(Utils.formatDate(peopleSheet.C2.v)).toBe("2028-05-31");
    expect(Utils.formatDate(peopleSheet.D2.v)).toBe("2026-05-31");

    const tsaResult = Validity.buildValidityUpdate(workbook, analysis, ["TSA"], "2026-05");
    expect(tsaResult.updatedRecords.map((row: any) => `${row.projectName}/${row.name}/${row.newExpiry}`)).toEqual([
      "TSA/TSA人员/2027-05-31"
    ]);
    expect(Utils.formatDate(peopleSheet.D3.v)).toBe("2027-05-31");
  });
});
