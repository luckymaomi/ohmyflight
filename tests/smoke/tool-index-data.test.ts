import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { loadManualsData, loadSiteVisibility, loadSkillsData, loadToolsData, loadWorkflowsData } from "../helpers/browser-context";
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

  it("publishes the default homepage workflows from existing tool entries", () => {
    const tools = loadToolsData() || [];
    const workflows = loadWorkflowsData() || [];
    const toolEntries = new Set(tools.map((tool) => tool.entry));
    const homepage = fs.readFileSync(resolveFromRoot("public", "tool", "index.html"), "utf8");

    expect(workflows).toEqual([
      { id: "lock-entry", name: "锁班", entries: ["text-joiner", "crew-match-name-id", "lock-entry-helper"] },
      { id: "manual-review", name: "手册", entries: ["pdf-stamp", "proof-king", "audit-king"] },
      {
        id: "qualification-operations",
        name: "资质运行",
        entries: [
          "hotel-bill-check",
          "focus-crew",
          "crew-flight-stats",
          "flight-stats-helper",
          "qualification-query-helper"
        ]
      }
    ]);
    workflows.flatMap((workflow) => workflow.entries).forEach((entry) => {
      expect(toolEntries.has(entry), `workflow references missing tool: ${entry}`).toBe(true);
    });
    expect(new Set(workflows.map((workflow) => workflow.id)).size).toBe(workflows.length);
    expect(homepage).toContain('data-default-category="workflow"');
    expect(homepage).toContain('data-category="workflow"');
  });

  it("centralizes every public visibility switch", () => {
    const tools = loadToolsData() || [];
    const workflows = loadWorkflowsData() || [];
    const visibility = loadSiteVisibility();

    expect(Object.keys(visibility.tools).sort()).toEqual(tools.map((tool) => tool.entry).sort());
    expect(Object.keys(visibility.workflows).sort()).toEqual(workflows.map((workflow) => workflow.id).sort());
    expect(Object.values(visibility.tools).every((value) => typeof value === "boolean")).toBe(true);
    expect(Object.values(visibility.workflows).every((value) => typeof value === "boolean")).toBe(true);
    expect(visibility.homepage).toMatchObject({
      patternGate: expect.any(Boolean),
      announcement: expect.any(Boolean),
      sponsorEntry: expect.any(Boolean)
    });
    expect(visibility.sponsorPage).toMatchObject({ contributors: expect.any(Boolean) });
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
