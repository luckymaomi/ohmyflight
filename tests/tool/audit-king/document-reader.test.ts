import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king document reader", () => {
  let reader: any;

  beforeAll(() => {
    const context = loadBrowserScripts(["tool/app/audit-king/document-reader.js"], {
      mammoth: {
        async extractRawText() {
          return { value: "第一段\n\n第二段" };
        }
      }
    });
    reader = (context.AuditKing as any).DocumentReader;
  });

  it("builds stable document and block ids without timestamps", async () => {
    const file = {
      name: "中国南方航空货运有限公司-机组资格【2024】.docx",
      async arrayBuffer() {
        return new ArrayBuffer(0);
      }
    };

    const documentItem = await reader.readDocxFile(file, 0);

    expect(documentItem.id).toBe("doc-1-中国南方航空货运有限公司-机组资格-2024-docx");
    expect(documentItem.blocks.map((block: any) => block.id)).toEqual([
      "doc-1-中国南方航空货运有限公司-机组资格-2024-docx-b1",
      "doc-1-中国南方航空货运有限公司-机组资格-2024-docx-b2"
    ]);
  });
});
