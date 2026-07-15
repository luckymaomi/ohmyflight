import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { loadAnnouncementData, loadManualsData, loadSkillsData, loadToolsData } from "../helpers/browser-context";
import { resolveFromDist, resolveFromRoot } from "../helpers/paths";

describe("tool index data", () => {
  it("uses a single explicit tool list", () => {
    const tools = loadToolsData();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools?.length).toBeGreaterThan(0);

    tools?.forEach((tool) => {
      expect(tool.entry).toMatch(/^[a-z0-9-]+$/);
      expect(tool.status === "done" || tool.status === "wip").toBe(true);
      expect(["heavy", "light", "automation"]).toContain(tool.category);
    });
  });

  it("has no work-in-progress tools", () => {
    const tools = loadToolsData() || [];
    const wipNames = tools
      .filter((tool) => tool.status === "wip")
      .map((tool) => tool.name)
      .sort();

    expect(wipNames).toEqual([]);
  });

  it("publishes a valid homepage announcement", () => {
    const announcement = loadAnnouncementData();

    expect(announcement?.message.trim().length).toBeGreaterThan(0);
    expect(typeof announcement?.enabled).toBe("boolean");
    expect(announcement?.href).toBe("../sponsor/index.html");
  });

  it("ships the sponsor page and demo assets", () => {
    const toolIndex = fs.readFileSync(resolveFromDist("tool", "index.html"), "utf8");
    expect(toolIndex).toContain('href="../sponsor/index.html" target="_blank"');
    expect(fs.existsSync(resolveFromDist("sponsor", "index.html"))).toBe(true);
    expect(fs.existsSync(resolveFromDist("sponsor", "site.css"))).toBe(true);
    ["oa-read-helper.gif", "lock-entry-helper.gif", "training-workbench.gif", "local-agent.gif"].forEach((filename) => {
      expect(fs.statSync(resolveFromDist("sponsor", "assets", filename)).size).toBeGreaterThan(1000);
    });
  });

  it("ships the done status image used by the tool index", () => {
    expect(fs.existsSync(resolveFromDist("tool", "assets", "status-done.png"))).toBe(true);
  });

  it("publishes the current repository skills", () => {
    const skills = loadSkillsData() || [];
    const manuals = loadManualsData() || [];
    const manualSkillDirectories = new Set([
      "read-flight-operations-manual",
      "read-flight-training-program",
      "read-flight-technical-management-manual"
    ]);
    const skillDirectories = fs.readdirSync(resolveFromRoot(".agents", "skills"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => fs.existsSync(resolveFromRoot(".agents", "skills", entry.name, "SKILL.md")));
    const developerSkillDirectories = skillDirectories.filter((entry) => !manualSkillDirectories.has(entry.name));

    expect(skills).toHaveLength(developerSkillDirectories.length);
    expect(new Set(skills.map((skill) => skill.name)).size).toBe(skills.length);
    skills.forEach((skill) => {
      expect(skill.name.trim().length).toBeGreaterThan(0);
      expect(skill.description.trim().length).toBeGreaterThan(0);
      expect(skill.source).toContain(`# `);
      expect(skill.path).toMatch(/^\.agents\/skills\/[a-z0-9-]+\/SKILL\.md$/);
    });
    expect(skills.map((skill) => skill.name)).not.toEqual(expect.arrayContaining([...manualSkillDirectories]));
    expect(manuals.slice(0, 3).map((manual) => manual.path)).toEqual(
      [...manualSkillDirectories].map((directory) => `.agents/skills/${directory}/SKILL.md`)
    );
  });

});
