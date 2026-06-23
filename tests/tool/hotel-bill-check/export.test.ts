import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { createBrowserContext, runBrowserScript } from "../../helpers/browser-context";

let logic: any;

function localDateKey(date: Date | null) {
  if (!date) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function exportHotelBillWorkbook() {
  let exportedWorkbook: any = null;
  let exportedFileName = "";
  const runtimeXlsx = Object.create(XLSX);
  runtimeXlsx.writeFile = (workbook: any, fileName: string) => {
    exportedWorkbook = workbook;
    exportedFileName = fileName;
  };
  const document = {
    addEventListener() {},
    querySelectorAll() {
      return [];
    }
  };
  const context = createBrowserContext({ document, XLSX: runtimeXlsx });

  runBrowserScript("tool/app/hotel-bill-check/logic.js", context);
  runBrowserScript(
    "tool/app/hotel-bill-check/main.js",
    context,
    `
checkinColumns = ["姓名", "入住证明", "补充文件", "备注"];
checkinHyperlinks = {
  0: {
    1: { url: "https://example.test/proof-a", display: "证明A" },
    2: { url: "https://example.test/proof-b", display: "证明B" }
  },
  1: {
    1: { url: "https://example.test/proof-c", display: "证明C" }
  }
};
matchResults = [
  { status: "matched", billRow: [], billIdx: 0, checkinRow: ["张三"], checkinIdx: 0 },
  { status: "matched", billRow: [], billIdx: 1, checkinRow: ["李四"], checkinIdx: 1 }
];
exportExcel();
`
  );

  return { workbook: exportedWorkbook, fileName: exportedFileName };
}

describe("hotel bill check export", () => {
  beforeAll(() => {
    const context = createBrowserContext();
    runBrowserScript("tool/app/hotel-bill-check/logic.js", context);
    logic = context.HotelBillLogic;
  });

  it("parses common hotel date formats to day precision", () => {
    expect(localDateKey(logic.parseDate("20260102"))).toBe("2026-01-02");
    expect(localDateKey(logic.parseDate("01/02/26 12:30"))).toBe("2026-01-02");
    expect(localDateKey(logic.parseDate("2026-01-02 23:59"))).toBe("2026-01-02");
    expect(logic.parseDate("")).toBeNull();
  });

  it("matches by same name and nearest date and marks duplicate reused checkin rows", () => {
    const output = logic.matchRows({
      billData: [
        ["张三", "2026-01-02"],
        ["张三", "2026-01-03"],
        ["李四", "2026-01-10"]
      ],
      checkinData: [
        ["张三", "2026-01-02"],
        ["李四", "2026-01-13"]
      ],
      billNameCol: 0,
      billDateCol: 1,
      checkinNameCol: 0,
      checkinDateCol: 1,
      tolerance: 1
    });

    expect(output.results.map((row: any) => row.status)).toEqual(["matched", "duplicate", "unmatched"]);
    expect(output.results[0].checkinIdx).toBe(0);
    expect(output.results[1].checkinIdx).toBe(0);
  });

  it("keeps every proof link clickable when one row has multiple proof files", () => {
    const { workbook, fileName } = exportHotelBillWorkbook();
    const sheet = workbook.Sheets["对比结果"];

    expect(fileName).toBe("账单对比结果.xlsx");
    expect(sheet.B1.v).toBe("入住证明1");
    expect(sheet.C1.v).toBe("入住证明2");
    expect(sheet.B2.f).toBe('=HYPERLINK("https://example.test/proof-a","证明A")');
    expect(sheet.C2.f).toBe('=HYPERLINK("https://example.test/proof-b","证明B")');
    expect(sheet.B3.f).toBe('=HYPERLINK("https://example.test/proof-c","证明C")');
    expect(sheet.C3.v).toBe("");
  });
});
