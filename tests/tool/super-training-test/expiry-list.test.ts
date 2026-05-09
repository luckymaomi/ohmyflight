import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function makeDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function buildWorkbook() {
  const workbook = XLSX.utils.book_new();

  const peopleSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "危险品", "航空安保"],
    ["1001", "张三", makeDate(2026, 4, 30), makeDate(2026, 6, 30)],
    ["1002", "李四", makeDate(2026, 5, 31), ""],
    ["1003", "王五", makeDate(2026, 6, 15), ""],
    ["1004", "赵六", "无效日期", ""],
    ["1005", "孙七", "", makeDate(2026, 5, 20)],
    ["1006", "程春林", "", makeDate(2026, 5, 20)],
    ["1007", "宋云龙", "", makeDate(2026, 5, 20)]
  ], { cellDates: true });

  const projectSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "项目名称", "培训信息是否录入", "培训开始日期", "培训结束日期", "有效期", "备注"]
  ], { cellDates: true });

  XLSX.utils.book_append_sheet(workbook, peopleSheet, "人员信息表");
  XLSX.utils.book_append_sheet(workbook, projectSheet, "危险品");
  XLSX.utils.book_append_sheet(workbook, projectSheet, "航空安保");
  return workbook;
}

describe("super-training-test expiry list", () => {
  let Scanner: any;
  let ExpiryList: any;
  let ExpiryListExport: any;

  beforeAll(() => {
    const context = loadBrowserScripts([
      "tool/app/super-training-test/scripts/config.js",
      "tool/app/super-training-test/scripts/utils.js",
      "tool/app/super-training-test/scripts/training-ignore-list.js",
      "tool/app/super-training-test/scripts/scanner.js",
      "tool/app/super-training-test/scripts/expiry-list.js",
      "tool/app/super-training-test/scripts/expiry-list-export.js"
    ], {
      XLSX
    });

    const superTraining = context.SuperTraining as {
      Scanner: any;
      ExpiryList: any;
      ExpiryListExport: any;
    };

    Scanner = superTraining.Scanner;
    ExpiryList = superTraining.ExpiryList;
    ExpiryListExport = superTraining.ExpiryListExport;
  });

  it("lists people whose current expiry falls in the selected month range without plan coverage logic", () => {
    const workbook = buildWorkbook();
    const analysis = Scanner.analyzeWorkbook(workbook);

    const aprilOnly = ExpiryList.buildExpiryList(analysis, ["危险品"], "2026-04", "2026-04");
    expect(aprilOnly.detailRows.map((row: any) => row.name)).toEqual(["张三"]);
    expect(aprilOnly.detailRows[0].expiry).toBe("2026-04-30");
    expect(aprilOnly.skippedRows).toHaveLength(1);
    expect(aprilOnly.skippedRows[0].name).toBe("赵六");
    expect(aprilOnly.skippedRows[0].status).toBe("有效期异常");

    const aprilToMay = ExpiryList.buildExpiryList(analysis, ["危险品", "航空安保"], "2026-04", "2026-05");
    expect(aprilToMay.detailRows.map((row: any) => `${row.name}/${row.projectName}/${row.dueMonth}`)).toEqual([
      "张三/危险品/2026-04",
      "孙七/航空安保/2026-05",
      "李四/危险品/2026-05"
    ]);
    expect(aprilToMay.statsCards).toEqual([
      { label: "培训类型", value: 2 },
      { label: "到期人次", value: 3 },
      { label: "异常", value: 1 }
    ]);

    const exported = ExpiryListExport.buildWorkbook(aprilToMay);
    expect(exported.SheetNames).toEqual(["到期清单"]);
    const sheet = exported.Sheets["到期清单"];
    expect(sheet.A1?.v).toBe("项目");
    expect(sheet.D1?.v).toBe("有效期");
    expect(sheet.C2?.v).toBe("张三");
  });
});
