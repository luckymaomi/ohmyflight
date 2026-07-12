import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { loadSkillsData, loadToolsData } from "../helpers/browser-context";
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

  it("ships the done status image used by the tool index", () => {
    expect(fs.existsSync(resolveFromDist("tool", "assets", "status-done.png"))).toBe(true);
  });

  it("publishes the current repository skills", () => {
    const skills = loadSkillsData() || [];
    const skillDirectories = fs.readdirSync(resolveFromRoot(".agents", "skills"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => fs.existsSync(resolveFromRoot(".agents", "skills", entry.name, "SKILL.md")));

    expect(skills).toHaveLength(skillDirectories.length);
    expect(new Set(skills.map((skill) => skill.name)).size).toBe(skills.length);
    skills.forEach((skill) => {
      expect(skill.name.trim().length).toBeGreaterThan(0);
      expect(skill.description.trim().length).toBeGreaterThan(0);
      expect(skill.source).toContain(`# `);
    });
  });

  it("uses ground duty as the current interview lock default", () => {
    const skills = loadSkillsData() || [];
    const interviewSkill = skills.find((skill) => skill.name === "interview-lock-list");

    expect(interviewSkill?.source).toContain("当前面试锁班默认类型使用 `GRD-地面班`");
    expect(interviewSkill?.source).not.toContain("默认锁班类型使用 `GDO-地面休息`");
  });
});
