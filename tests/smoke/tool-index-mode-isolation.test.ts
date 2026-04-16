import { describe, expect, it } from "vitest";

import { createBrowserContext, runBrowserScript } from "../helpers/browser-context";
import { readHtmlFile } from "../helpers/html";
import { resolveFromDist } from "../helpers/paths";

class FakeClassList {
  private readonly classes = new Set<string>();

  constructor(initialClasses: string[] = []) {
    initialClasses.forEach((className) => this.classes.add(className));
  }

  toggle(className: string, force?: boolean) {
    if (typeof force === "boolean") {
      if (force) {
        this.classes.add(className);
      } else {
        this.classes.delete(className);
      }
      return force;
    }

    if (this.classes.has(className)) {
      this.classes.delete(className);
      return false;
    }

    this.classes.add(className);
    return true;
  }

  contains(className: string) {
    return this.classes.has(className);
  }
}

class FakeElement {
  id = "";
  hidden = false;
  innerHTML = "";
  value = "";
  placeholder = "";
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  classList = new FakeClassList();
  listeners = new Map<string, Array<() => void>>();

  constructor(id = "", dataset: Record<string, string> = {}, initialClasses: string[] = []) {
    this.id = id;
    this.dataset = { ...dataset };
    this.classList = new FakeClassList(initialClasses);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name);
  }

  addEventListener(type: string, listener: () => void) {
    const current = this.listeners.get(type) || [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  dispatch(type: string) {
    (this.listeners.get(type) || []).forEach((listener) => listener());
  }
}

function createToolIndexContext() {
  const cardsRoot = new FakeElement("toolCards");
  const toolsView = new FakeElement("toolsView");
  const workflowPlaceholder = new FakeElement("workflowPlaceholder");
  const searchInput = new FakeElement("searchInput");
  const categoryCommon = new FakeElement("", { category: "common" }, ["active"]);
  const categoryOther = new FakeElement("", { category: "other" });
  const toggleButton = new FakeElement("toggleButton");
  const toolLabel = new FakeElement("toolLabel");
  const workflowLabel = new FakeElement("workflowLabel");
  const skyLayer = new FakeElement("skyLayer");
  const starBox = new FakeElement("starBox");
  const cloudNear = new FakeElement("cloudNear");
  const cloudFar = new FakeElement("cloudFar");
  const haloInner = new FakeElement("haloInner");
  const haloMiddle = new FakeElement("haloMiddle");
  const haloOuter = new FakeElement("haloOuter");
  const ball = new FakeElement("ball");
  const moon = new FakeElement("moon");
  const moonBody = new FakeElement("moonBody");

  const elements = new Map<string, FakeElement>([
    ["toolCards", cardsRoot],
    ["toolsView", toolsView],
    ["workflowPlaceholder", workflowPlaceholder],
    ["searchInput", searchInput],
    ["toggleButton", toggleButton],
    ["toolLabel", toolLabel],
    ["workflowLabel", workflowLabel],
    ["skyLayer", skyLayer],
    ["starBox", starBox],
    ["cloudNear", cloudNear],
    ["cloudFar", cloudFar],
    ["haloInner", haloInner],
    ["haloMiddle", haloMiddle],
    ["haloOuter", haloOuter],
    ["ball", ball],
    ["moon", moon],
    ["moonBody", moonBody]
  ]);

  let onToggleChange: ((mode: "tool" | "workflow") => void) | undefined;

  const context = createBrowserContext({
    HTMLElement: FakeElement,
    HTMLInputElement: FakeElement,
    document: {
      body: new FakeElement("body"),
      getElementById(id: string) {
        return elements.get(id) || null;
      },
      querySelectorAll(selector: string) {
        if (selector === ".category-link") {
          return [categoryCommon, categoryOther];
        }

        return [];
      }
    },
    history: {
      replaceState() {
        return undefined;
      }
    },
    location: {
      search: "",
      pathname: "/tool/index.html"
    },
    ToolModeToggle: class {
      constructor(_elements: unknown, options?: { onChange?: (mode: "tool" | "workflow") => void }) {
        onToggleChange = options?.onChange;
      }
    }
  });

  context.window = context;
  context.window.ToolModeToggle = context.ToolModeToggle;

  return {
    context,
    cardsRoot,
    toolsView,
    workflowPlaceholder,
    searchInput,
    categoryCommon,
    categoryOther,
    toggle(mode: "tool" | "workflow") {
      onToggleChange?.(mode);
    }
  };
}

describe("tool index mode isolation", () => {
  it("keeps tool content and workflow placeholder fully separated", () => {
    const harness = createToolIndexContext();

    runBrowserScript("tool/tools-data.js", harness.context);
    runBrowserScript("tool/workflows-data.js", harness.context);
    runBrowserScript("tool/tools-render.js", harness.context);

    expect(harness.toolsView.hidden).toBe(false);
    expect(harness.workflowPlaceholder.hidden).toBe(true);
    expect(harness.searchInput.placeholder).toBe("搜索工具");
    expect(harness.cardsRoot.innerHTML).toContain("姓名匹配员工号");
    expect(harness.cardsRoot.innerHTML).not.toContain("尚未接入");

    harness.searchInput.value = "PDF";
    harness.searchInput.dispatch("input");

    expect(harness.cardsRoot.innerHTML).toContain("PDF");

    harness.toggle("workflow");

    expect(harness.toolsView.hidden).toBe(true);
    expect(harness.workflowPlaceholder.hidden).toBe(false);
    expect(harness.searchInput.placeholder).toBe("搜索工作流");
    expect(harness.searchInput.value).toBe("");
    expect(harness.cardsRoot.innerHTML).toBe("");
    expect(harness.workflowPlaceholder.innerHTML).toContain("尚未接入");

    harness.searchInput.value = "PDF";
    harness.searchInput.dispatch("input");

    expect(harness.cardsRoot.innerHTML).toBe("");
    expect(harness.workflowPlaceholder.innerHTML).toContain("尚未接入");

    harness.toggle("tool");

    expect(harness.toolsView.hidden).toBe(false);
    expect(harness.workflowPlaceholder.hidden).toBe(true);
    expect(harness.searchInput.placeholder).toBe("搜索工具");
    expect(harness.searchInput.value).toBe("PDF");
    expect(harness.cardsRoot.innerHTML).toContain("PDF");
  });

  it("delivers a standalone workflow placeholder in tool/index.html", () => {
    const html = readHtmlFile(resolveFromDist("tool", "index.html"));

    expect(html).toContain('id="searchInput"');
    expect(html).toContain('id="toolsView"');
    expect(html).toContain('id="workflowPlaceholder"');
    expect(html).toContain("尚未接入");
    expect(html).toContain("../downloads/ohmyflight-source.zip");
    expect(html).toContain("./workflows-data.js");
    expect(html).toContain("下载本站源码");
  });
});
