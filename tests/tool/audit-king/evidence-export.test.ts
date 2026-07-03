import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king evidence export", () => {
  let exportApi: any;

    beforeAll(() => {
        const context = loadBrowserScripts(["tool/app/audit-king/export.js"], { XLSX });
        exportApi = (context.AuditKing as any).Export;
    });

  it("builds an evidence workbook with one row per evidence entry", () => {
    const workbook = exportApi.buildEvidenceWorkbook([
      {
        id: "evidence-group-1",
        title: "1.1 进入条件",
        items: [
          {
            content: "机长转机型训练进入条件",
            note: "可作为 1.1 候选依据"
          },
          {
            content: "进入训练前应满足资格要求",
            note: ""
          }
        ]
      }
    ]);

    expect(workbook.SheetNames).toEqual(["审计篮子"]);
    const sheet = workbook.Sheets["审计篮子"];
    expect(sheet.A1?.v).toBe("条款名称");
    expect(sheet.B1?.v).toBe("依据序号");
    expect(sheet.C1?.v).toBe("依据内容");
    expect(sheet.D1?.v).toBe("备注");
    expect(sheet.A2?.v).toBe("1.1 进入条件");
    expect(sheet.B2?.v).toBe(1);
    expect(sheet.C2?.v).toBe("机长转机型训练进入条件");
    expect(sheet.D2?.v).toBe("可作为 1.1 候选依据");
    expect(sheet.A3?.v).toBe("1.1 进入条件");
    expect(sheet.B3?.v).toBe(2);
    expect(sheet.C3?.v).toBe("进入训练前应满足资格要求");
  });

  it("keeps empty audit basket groups when exporting", () => {
    const workbook = exportApi.buildEvidenceWorkbook([
      {
        id: "evidence-group-1",
        title: "1.1 进入条件",
        items: []
      }
    ]);

    const sheet = workbook.Sheets["审计篮子"];
    expect(sheet.A2?.v).toBe("1.1 进入条件");
    expect(sheet.B2?.v).toBe(0);
    expect(sheet.C2?.v).toBe("");
  });

  it("reads evidence rows back into audit basket groups by header names", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["备注", "依据内容", "条款名称", "依据序号"],
      ["可用", "训练进入条件", "1.1 进入条件", 1],
      ["", "资格要求", "1.1 进入条件", 2],
      ["", "检查要求", "1.2 检查要求", 1]
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "审计篮子");

    const groups = exportApi.parseEvidenceWorkbook(workbook);

    expect(groups).toEqual([
      {
        id: "evidence-group-1",
        title: "1.1 进入条件",
        items: [
          {
            content: "训练进入条件",
            note: "可用"
          },
          {
            content: "资格要求",
            note: ""
          }
        ]
      },
      {
        id: "evidence-group-2",
        title: "1.2 检查要求",
        items: [
          {
            content: "检查要求",
            note: ""
          }
        ]
      }
    ]);
  });
});
