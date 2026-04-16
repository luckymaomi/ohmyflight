import fs from "node:fs";
import vm from "node:vm";

import { resolveFromDist } from "./paths";

type BrowserSandbox = Record<string, unknown> & {
  window?: BrowserSandbox;
  globalThis?: BrowserSandbox;
  __tools?: ToolSection[];
};

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
