import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("health-poster logic", () => {
  let context: ReturnType<typeof loadBrowserScripts>;
  let logic: any;
  let templates: any[];

  beforeAll(() => {
    context = loadBrowserScripts([
      "tool/app/health-poster/templates.js",
      "tool/app/health-poster/logic.js"
    ]);
    logic = context.HealthPosterLogic;
    templates = context.HealthPosterTemplates as any[];
  });

  it("keeps the poster size fixed at 1080 x 1920", () => {
    expect(logic.posterWidth).toBe(1080);
    expect(logic.posterHeight).toBe(1920);
  });

  it("provides six maintainable templates with unique ids", () => {
    expect(templates).toHaveLength(6);
    expect(new Set(templates.map((template) => template.id)).size).toBe(6);
    templates.forEach((template) => {
      expect(template.name).toBeTruthy();
      expect(template.className).toMatch(/^template-/);
    });
  });

  it("normalizes a dynamic number of knowledge points without enforcing a fixed count", () => {
    const normalized = logic.normalizePosterData({
      title: "  睡眠提醒  ",
      subtitle: "  值勤前健康宣教  ",
      points: [
        { title: "提前准备", body: "避免临睡前大量饮水" },
        { title: "减少刺激", body: "睡前减少咖啡因摄入" },
        { title: "保持节律", body: "尽量固定入睡时间" },
        { title: "午休控制", body: "午休不宜过长" },
        { title: "光线管理", body: "睡前减少强光刺激" },
        { title: "放松训练", body: "可做呼吸放松" },
        { title: "异常处理", body: "持续失眠应及时咨询" }
      ]
    });

    expect(normalized.title).toBe("睡眠提醒");
    expect(normalized.subtitle).toBe("值勤前健康宣教");
    expect(normalized.points).toHaveLength(7);
    expect(logic.normalizePosterData({ points: [] }).points).toHaveLength(0);
  });

  it("formats knowledge labels and export filenames", () => {
    expect(logic.formatKnowledgeLabel(0)).toBe("知识点一");
    expect(logic.formatKnowledgeLabel(9)).toBe("知识点十");
    expect(logic.formatKnowledgeLabel(10)).toBe("知识点11");
    expect(logic.createExportFilename("新手/健身:指南", "webp")).toBe("健康宣教-新手健身指南.webp");
    expect(logic.getMimeType("jpg")).toBe("image/jpeg");
  });
});
