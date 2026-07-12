import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../helpers/browser-context";
import { resolveFromDist } from "../helpers/paths";

type PublishedJobskillItem = readonly [name: string, relativePath: string];

function loadPublishedItems(): PublishedJobskillItem[] {
  const context = loadBrowserScripts(["jobskill/skills-data.js"]);
  const windowObject = context.window as Record<string, unknown> | undefined;
  const items = windowObject?.JOBSKILL_ITEMS;
  return Array.isArray(items) ? items as PublishedJobskillItem[] : [];
}

function localMarkdownImages(markdown: string): string[] {
  return [...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().replace(/^<|>$/g, ""))
    .filter((target) => !/^(?:https?:)?\/\//i.test(target) && !target.startsWith("data:"))
    .map((target) => target.split("#")[0].split("?")[0]);
}

describe("jobskill subsite", () => {
  it("publishes the six indexed business skills", () => {
    const items = loadPublishedItems();
    const names = items.map(([name]) => name);
    const relativePaths = items.map(([, relativePath]) => relativePath);

    expect(items).toHaveLength(6);
    expect(new Set(names).size).toBe(items.length);
    expect(new Set(relativePaths).size).toBe(items.length);

    const spec = fs.readFileSync(resolveFromDist("jobskill", "SPEC.md"), "utf8");
    const index = fs.readFileSync(resolveFromDist("jobskill", "SKILL_INDEX.md"), "utf8");

    items.forEach(([name, relativePath]) => {
      const markdownPath = resolveFromDist("jobskill", relativePath);
      expect(fs.existsSync(markdownPath), `missing Jobskill Markdown: ${relativePath}`).toBe(true);

      const markdown = fs.readFileSync(markdownPath, "utf8");
      expect(markdown).toMatch(/^---\r?\nname:\s*.+\r?\ndescription:\s*.+\r?\n---/);
      expect(spec).toContain(`./${relativePath}`);
      expect(index).toContain(`./${relativePath}`);
      expect(markdown).toContain(`# ${name}`);
    });
  });

  it("ships every locally referenced Markdown image", () => {
    let imageCount = 0;
    loadPublishedItems().forEach(([, relativePath]) => {
      const markdownPath = resolveFromDist("jobskill", relativePath);
      const markdown = fs.readFileSync(markdownPath, "utf8");

      localMarkdownImages(markdown).forEach((target) => {
        imageCount += 1;
        const assetPath = path.resolve(path.dirname(markdownPath), target);
        expect(fs.existsSync(assetPath), `${relativePath} references missing image: ${target}`).toBe(true);
      });
    });
    expect(imageCount).toBeGreaterThan(0);
  });

  it("does not publish a nested repository or duplicate libraries", () => {
    expect(fs.existsSync(resolveFromDist("jobskill", ".git"))).toBe(false);
    expect(fs.existsSync(resolveFromDist("jobskill", "libs"))).toBe(false);
  });

  it("searches business text and returns a readable context", () => {
    const context = loadBrowserScripts(["jobskill/search.js"]);
    const engine = (context.window as { JobskillSearch?: {
      markdownToText(markdown: string): string;
      search(sources: Array<{ name: string; path: string; markdown: string }>, value: string): Array<{ name: string; snippet: string }>;
    } } | undefined)?.JobskillSearch;
    expect(engine).toBeDefined();

    const item = loadPublishedItems().find(([name]) => name === "资质录入、统计与发布");
    expect(item).toBeDefined();
    const [name, relativePath] = item!;
    const markdown = fs.readFileSync(resolveFromDist("jobskill", relativePath), "utf8");
    const searchableText = engine!.markdownToText(markdown);
    const results = engine!.search([{ name, path: relativePath, markdown }], "重航");

    expect(searchableText).not.toContain("description:");
    expect(searchableText).toContain("资质录入、统计与发布");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe(name);
    expect(results[0].snippet).toContain("重航划转");
  });
});
