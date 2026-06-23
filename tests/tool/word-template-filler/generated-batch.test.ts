import vm from "node:vm";

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx-js-style";

import { createBrowserContext, runBrowserScript } from "../../helpers/browser-context";

function loadGeneratedHtml(config: unknown) {
  const context = createBrowserContext();
  runBrowserScript("tool/app/word-template-filler/generated-app-styles.js", context);
  runBrowserScript("tool/app/word-template-filler/generated-app-script.js", context);
  runBrowserScript("tool/app/word-template-filler/generated-app-shell.js", context);
  runBrowserScript(
    "tool/app/word-template-filler/html-generator.js",
    context,
    `globalThis.__generatedHtml = HtmlGenerator.generate(${JSON.stringify(config)}, "测试应用", "template.docx");`
  );
  return context.__generatedHtml as string;
}

function loadInstructions() {
  const context = createBrowserContext();
  runBrowserScript(
    "tool/app/word-template-filler/app-packager.js",
    context,
    `globalThis.__instructions = AppPackager.generateInstructions("测试应用", "测试应用", "template.docx");`
  );
  return context.__instructions as string;
}

function buildPackagedBatchTemplate(config: unknown) {
  const context = createBrowserContext({ XLSX });
  runBrowserScript(
    "tool/app/word-template-filler/app-packager.js",
    context,
    `globalThis.__workbook = AppPackager.generateBatchTemplateWorkbook(${JSON.stringify(config)});`
  );
  return context.__workbook as XLSX.WorkBook;
}

function loadGeneratedRuntime(config: unknown) {
  const generatorContext = createBrowserContext();
  runBrowserScript(
    "tool/app/word-template-filler/generated-app-script.js",
    generatorContext,
    `globalThis.__runtimeCode = GeneratedAppScript.generate(${JSON.stringify(config)}, "template.docx");`
  );

  const elements = new Map<string, any>();
  const getElement = (id: string) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        style: {},
        textContent: "",
        className: "",
        disabled: false,
        value: "",
        addEventListener() {}
      });
    }
    return elements.get(id);
  };
  const document = {
    title: "批量应用",
    getElementById: getElement,
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return { href: "", download: "", click() {} };
    }
  };
  const runtimeContext = createBrowserContext({
    document,
    alert() {},
    confirm() {
      return false;
    },
    fetch: async () => ({ ok: false })
  });

  vm.runInContext(
    `${generatorContext.__runtimeCode}
globalThis.__runtime = { buildBatchRow, formatDate, sanitizeFileName };`,
    runtimeContext
  );

  return runtimeContext.__runtime as any;
}

describe("word template filler generated batch app", () => {
  it("generates batch import controls without a template download entry", () => {
    const html = loadGeneratedHtml({
      fields: [
        { name: "name", label: "姓名", type: "text", required: true },
        { name: "date", label: "日期", type: "date", format: "YYYY年MM月DD日" },
        { name: "level", label: "等级", type: "radio", options: "优秀,合格" }
      ],
      loopFields: {}
    });

    expect(html).toContain("批量生成");
    expect(html).toContain("随包提供的批量导入模板");
    expect(html).not.toContain("下载批量导入模板");
    expect(html).not.toContain("downloadBatchTemplateBtn");
    expect(html).not.toContain("downloadBatchTemplate");
    expect(html).toContain("const BATCH_TITLE_COLUMN = '文件标题'");
    expect(html).toContain("downloadBlob(blob, document.title + '_批量导出_' + timestamp + '.zip')");
    expect(html).toContain('<script src="libs/xlsx.full.min.js">');
    expect(html).toContain('<script src="libs/jszip.min.js">');
  });

  it("builds the packaged batch Excel template with file title as the first column", () => {
    const workbook = buildPackagedBatchTemplate({
      fields: [
        { name: "name", label: "姓名", type: "text", required: true },
        { name: "date", label: "日期", type: "date", format: "YYYY年MM月DD日" },
        { name: "level", label: "等级", type: "radio", options: "优秀,合格" }
      ],
      loopFields: {}
    });
    const dataSheet = workbook.Sheets["批量数据"];
    const helpSheet = workbook.Sheets["填写说明"];

    expect(workbook.SheetNames).toEqual(["批量数据", "填写说明"]);
    expect(dataSheet.A1.v).toBe("文件标题");
    expect(dataSheet.B1.v).toBe("姓名");
    expect(dataSheet.C1.v).toBe("日期");
    expect(dataSheet.D1.v).toBe("等级");
    expect(helpSheet.A8.v).toBe("Excel列名");
    expect(helpSheet.B9.v).toBe("name");
  });

  it("shows that batch import does not support loop fields in the first version", () => {
    const html = loadGeneratedHtml({
      fields: [
        { name: "name", label: "姓名", type: "text" },
        { name: "items", label: "明细", type: "loop" }
      ],
      loopFields: {
        items: [{ name: "itemName", label: "项目", type: "text" }]
      }
    });

    expect(html).toContain("当前配置包含列表/循环字段，批量导入第一版暂不支持");
    expect(html).toContain("const HAS_LOOP_FIELDS = CONFIG.fields.some(field => field.type === 'loop')");
  });

  it("documents xlsx and jszip dependencies in the packaged app instructions", () => {
    const instructions = loadInstructions();

    expect(instructions).toContain("批量生成");
    expect(instructions).toContain("测试应用_批量导入模板.xlsx");
    expect(instructions).toContain("批量导入模板由生成器随压缩包同步导出");
    expect(instructions).toContain("xlsx.full.min.js");
    expect(instructions).toContain("jszip.min.js");
  });

  it("maps one imported Excel row into render data and validates option fields", () => {
    const runtime = loadGeneratedRuntime({
      fields: [
        { name: "name", label: "姓名", type: "text", required: true },
        { name: "date", label: "日期", type: "date", format: "YYYY年MM月DD日" },
        { name: "passed", label: "是否通过", type: "boolean" },
        { name: "level", label: "等级", type: "radio", options: "优秀,合格" },
        { name: "tags", label: "标签", type: "checkbox", options: "A,B,C" }
      ],
      loopFields: {}
    });

    const row = runtime.buildBatchRow({
      文件标题: "张/三:报告",
      姓名: "张三",
      日期: "2026/6/23",
      是否通过: "是",
      等级: "优秀",
      标签: "A、C"
    }, 2, 0);

    expect(row.title).toBe("张_三_报告");
    expect(row.fileName).toBe("张_三_报告.docx");
    expect(row.errors).toEqual([]);
    expect(row.data.name).toBe("张三");
    expect(row.data.date).toBe("2026年06月23日");
    expect(row.data.passedPass).toBe("☑");
    expect(row.data.passedFail).toBe("□");
    expect(row.data.level_优秀).toBe("☑");
    expect(row.data.level_合格).toBe("□");
    expect(row.data.tags).toBe("A、C");
    expect(row.data.tags_A).toBe("☑");
    expect(row.data.tags_B).toBe("□");
    expect(row.data.tags_C).toBe("☑");

    const invalid = runtime.buildBatchRow({
      文件标题: "",
      姓名: "",
      等级: "不合格",
      标签: "A、D"
    }, 3, 1);

    expect(invalid.title).toBe("批量应用_002");
    expect(invalid.errors).toContain("姓名不能为空");
    expect(invalid.errors).toContain("等级选项无效：不合格");
    expect(invalid.errors).toContain("标签包含无效选项：D");
  });
});
