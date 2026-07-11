import { beforeEach, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("图片工具 Object URL 生命周期", () => {
  let shared: any;
  let created: string[];
  let revoked: string[];

  beforeEach(() => {
    created = [];
    revoked = [];
    const URL = {
      createObjectURL() {
        const value = `blob:${created.length + 1}`;
        created.push(value);
        return value;
      },
      revokeObjectURL(value: string) {
        revoked.push(value);
      }
    };
    const context = loadBrowserScripts(["tool/app/image-tool/shared.js"], { URL });
    shared = (context as any).ImageTool.shared;
  });

  it("删除或清空上传项时释放对应 URL", () => {
    const items = [
      { file: {}, url: "blob:a" },
      { file: {}, url: "blob:b" }
    ];

    shared.removeImageItem(items, 0);
    expect(revoked).toEqual(["blob:a"]);
    shared.clearImageItems(items);
    expect(revoked).toEqual(["blob:a", "blob:b"]);
    expect(items).toEqual([]);
  });

  it("替换预览时先释放旧 URL", () => {
    const element = {
      dataset: {} as Record<string, string>,
      src: "",
      removeAttribute(name: string) {
        if (name === "src") this.src = "";
      }
    };

    shared.setObjectUrl(element, {});
    shared.setObjectUrl(element, {});
    shared.setObjectUrl(element, null);

    expect(created).toEqual(["blob:1", "blob:2"]);
    expect(revoked).toEqual(["blob:1", "blob:2"]);
    expect(element.src).toBe("");
  });
});
