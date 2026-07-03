import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king text normalizer", () => {
  let normalizer: any;

    beforeAll(() => {
        const context = loadBrowserScripts(["tool/app/audit-king/text-normalizer.js"]);
        normalizer = (context.AuditKing as any).TextNormalizer;
    });

  it("normalizes text for loose search without changing exact text", () => {
    const raw = "121.417（a）\n航线 运输驾驶员　执照，进入 条件";

    expect(normalizer.normalizeLoose(raw)).toBe("121.417(a)航线运输驾驶员执照,进入条件");
    expect(normalizer.normalizeExact(raw)).toBe(raw);
  });

  it("builds a loose index that maps normalized offsets back to original offsets", () => {
    const index = normalizer.buildLooseIndex("A B\nＣ（D）");

    expect(index.normalized).toBe("ABC(D)");
    expect(index.offsetMap.map((item: any) => item.originalStart)).toEqual([0, 2, 4, 5, 6, 7]);
  });
});
