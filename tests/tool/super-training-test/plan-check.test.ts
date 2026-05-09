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
    ["1001", "张三", makeDate(2026, 5, 20)],
    ["1002", "李四", makeDate(2026, 5, 31)],
    ["1003", "王五", makeDate(2026, 5, 28)],
    ["1004", "赵六", makeDate(2026, 6, 15)],
    ["1005", "孙七", "无效日期"],
    ["1006", "周八", makeDate(2026, 5, 30)],
    ["1007", "吴九", makeDate(2026, 5, 29)]
  ], { cellDates: true });

  const projectSheet = XLSX.utils.aoa_to_sheet([
    ["员工号", "姓名", "项目名称", "培训信息是否录入", "培训开始日期", "培训结束日期", "有效期", "备注"],
    ["1001", "张三", "危险品", "是", makeDate(2026, 4, 15), makeDate(2026, 4, 15), "", ""],
    ["1002", "李四", "危险品", "否", makeDate(2026, 5, 10), makeDate(2026, 5, 10), "", ""],
    ["1003", "王五", "危险品", "是", makeDate(2026, 5, 28), makeDate(2026, 5, 28), "", ""],
    ["9001", "无关人员", "危险品", "否", makeDate(2026, 4, 15), makeDate(2026, 4, 15), "", ""],
    ["1006", "周八", "危险品", "否", makeDate(2026, 5, 20), makeDate(2026, 5, 20), "", "取消"],
    ["1007", "吴九", "危险品", "是", makeDate(2026, 5, 20), makeDate(2026, 5, 20), "", "取消"]
  ], { cellDates: true });

  XLSX.utils.book_append_sheet(workbook, peopleSheet, "人员信息表");
  XLSX.utils.book_append_sheet(workbook, projectSheet, "危险品");
  return workbook;
}

function collectColumnValues(sheet: XLSX.WorkSheet, columnIndex: number) {
  const bounds = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const values: unknown[] = [];
  for (let rowIndex = bounds.s.r + 1; rowIndex <= bounds.e.r; rowIndex += 1) {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    values.push(sheet[address]?.v);
  }
  return values;
}

describe("super-training-test monthly plan check", () => {
  let context: ReturnType<typeof loadBrowserScripts>;
  let Scanner: any;
  let PlanCheck: any;
  let Utils: any;

  beforeAll(() => {
    context = loadBrowserScripts([
      "tool/app/super-training-test/scripts/config.js",
      "tool/app/super-training-test/scripts/utils.js",
      "tool/app/super-training-test/scripts/training-ignore-list.js",
      "tool/app/super-training-test/scripts/training-record-policy.js",
      "tool/app/super-training-test/scripts/scanner.js",
      "tool/app/super-training-test/scripts/rule-engine.js",
      "tool/app/super-training-test/scripts/plan-check.js"
    ], {
      XLSX
    });

    const superTraining = context.SuperTraining as {
      Scanner: any;
      PlanCheck: any;
      Utils: any;
    };

    Scanner = superTraining.Scanner;
    PlanCheck = superTraining.PlanCheck;
    Utils = superTraining.Utils;
  });

  it("treats valid prior scheduling as covered, notes missing recorded info, and still appends rows when existing records cannot cover the expiry", () => {
    const workbook = buildWorkbook();
    const analysis = Scanner.analyzeWorkbook(workbook);
    const result = PlanCheck.buildMonthlyPlanCheck(workbook, analysis, ["危险品"], "2026-05");

    expect(result.detailRows).toHaveLength(5);

    const zhangSan = result.detailRows.find((row: any) => row.name === "张三");
    const liSi = result.detailRows.find((row: any) => row.name === "李四");
    const wangWu = result.detailRows.find((row: any) => row.name === "王五");
    const zhouBa = result.detailRows.find((row: any) => row.name === "周八");
    const wuJiu = result.detailRows.find((row: any) => row.name === "吴九");

    expect(zhangSan.status).toBe("已排覆盖");
    expect(zhangSan.result).toBe("已标绿");
    expect(zhangSan.reason).toContain("2026-04-15");

    expect(liSi.status).toBe("已排覆盖");
    expect(liSi.result).toBe("已标绿");
    expect(liSi.reason).toContain("未发现已录入信息");

    expect(wangWu.status).toBe("未覆盖");
    expect(wangWu.result).toBe("已补加");
    expect(liSi.expiry).toBe("2026-05-31");
    expect(wangWu.reason).toContain("不能覆盖本轮到期");

    expect(zhouBa.status).toBe("未覆盖");
    expect(zhouBa.result).toBe("已补加");
    expect(zhouBa.reason).toContain("备注包含“取消”");

    expect(wuJiu.status).toBe("未覆盖");
    expect(wuJiu.result).toBe("已补加");

    expect(result.skippedRows).toHaveLength(2);
    expect(result.skippedRows[0].name).toBe("孙七");
    expect(result.skippedRows[0].status).toBe("有效期异常");
    expect(result.skippedRows[1].name).toBe("吴九");
    expect(result.skippedRows[1].status).toBe("记录异常");

    const projectSheet = workbook.Sheets["危险品"];
    expect(projectSheet.B2?.s?.fill?.fgColor?.rgb).toBe("D9F2D9");
    expect(projectSheet.B3?.s?.fill?.fgColor?.rgb).toBe("D9F2D9");
    expect(projectSheet.B4?.s?.fill?.fgColor?.rgb).not.toBe("D9F2D9");

    const bounds = XLSX.utils.decode_range(projectSheet["!ref"] || "A1");
    expect(bounds.e.r).toBe(9);
    expect(collectColumnValues(projectSheet, 1)).toEqual([
      "张三",
      "李四",
      "王五",
      "无关人员",
      "周八",
      "吴九",
      "王五",
      "周八",
      "吴九"
    ]);
    expect(projectSheet.B8?.s?.fill?.fgColor?.rgb).toBe("FDE2E1");
    expect(projectSheet.G8?.t).toBe("d");
    expect(Utils.formatDate(projectSheet.G8?.v)).toBe("2026-05-28");
  });
});
