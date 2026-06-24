import fs from "node:fs";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

import { projectRoot, resolveFromDist, resolveFromRoot } from "./paths";

type BrowserSandbox = Record<string, unknown> & {
  window?: BrowserSandbox;
  globalThis?: BrowserSandbox;
  __tools?: ToolItem[];
};

let distFreshChecked = false;

function latestMtimeMs(root: string) {
  if (!fs.existsSync(root)) return 0;
  const stat = fs.statSync(root);
  if (stat.isFile()) return stat.mtimeMs;

  return fs.readdirSync(root, { withFileTypes: true }).reduce((latest, entry) => {
    const fullPath = `${root}/${entry.name}`;
    if (entry.isDirectory()) return Math.max(latest, latestMtimeMs(fullPath));
    if (entry.isFile()) return Math.max(latest, fs.statSync(fullPath).mtimeMs);
    return latest;
  }, stat.mtimeMs);
}

function runBuildForDist() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", "build"], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32"
  });

  if (result.error) throw result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${npmCommand} run build exited with code ${result.status ?? "unknown"}`);
  }
}

function ensureDistFresh() {
  if (distFreshChecked) return;
  distFreshChecked = true;

  const distRoot = resolveFromRoot("dist");
  const distMtime = latestMtimeMs(distRoot);
  const sourceMtime = Math.max(
    latestMtimeMs(resolveFromRoot("src")),
    latestMtimeMs(resolveFromRoot("public"))
  );

  if (!distMtime || distMtime < sourceMtime) {
    runBuildForDist();
  }
}

function createBaseSandbox(overrides: Record<string, unknown> = {}): BrowserSandbox {
  const sandbox: BrowserSandbox = {
    console,
    structuredClone,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Map,
    Set,
    Date,
    Math,
    JSON,
    RegExp,
    Array,
    Object,
    Number,
    String,
    Boolean,
    URLSearchParams,
    ...overrides
  };

  sandbox.window = sandbox.window || sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

export function createBrowserContext(overrides: Record<string, unknown> = {}) {
  const sandbox = createBaseSandbox(overrides);
  vm.createContext(sandbox);
  return sandbox;
}

export function runBrowserScript(relativePath: string, context: BrowserSandbox, trailer = "") {
  ensureDistFresh();
  const filename = resolveFromDist(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  return vm.runInContext(`${source}\n${trailer}`, context, { filename });
}

export function loadBrowserScripts(relativePaths: string[], overrides: Record<string, unknown> = {}) {
  const context = createBrowserContext(overrides);
  relativePaths.forEach((relativePath) => {
    runBrowserScript(relativePath, context);
  });
  return context;
}

export function loadToolsData() {
  const context = createBrowserContext();
  runBrowserScript("tool/tools-data.js", context, "globalThis.__tools = tools;");
  return context.__tools;
}
