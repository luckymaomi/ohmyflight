import fs from "node:fs";
import path from "node:path";

export function readHtmlFile(htmlFilePath) {
  return fs.readFileSync(htmlFilePath, "utf8");
}

export function collectLocalAssetPaths(htmlFilePath) {
  const html = readHtmlFile(htmlFilePath);
  const matches = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)];

  return matches
    .map((match) => match[1])
    .filter((value) => value && !value.startsWith("#"))
    .filter((value) => !/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value))
    .map((value) => value.split("?")[0].split("#")[0])
    .filter(Boolean)
    .map((value) => path.resolve(path.dirname(htmlFilePath), value));
}

export function collectScriptReferences(htmlFilePath) {
  const html = readHtmlFile(htmlFilePath);
  const matches = [...html.matchAll(/<script\b([^>]*)\bsrc=["']([^"']+)["'][^>]*>/gi)];

  return matches
    .map((match) => {
      const attrs = match[1] || "";
      const source = match[2];
      return {
        src: source,
        type: /type=["']module["']/i.test(attrs) ? "module" : "script"
      };
    })
    .filter((item) => !/^(?:https?:|data:|javascript:)/i.test(item.src))
    .map((item) => ({
      ...item,
      path: path.resolve(path.dirname(htmlFilePath), item.src.split("?")[0].split("#")[0])
    }));
}

