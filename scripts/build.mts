import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const staticRoot = path.join(projectRoot, "public");
const distRoot = path.join(projectRoot, "dist");
const skillsRoot = path.join(projectRoot, ".agents", "skills");
const userManualsRoot = path.join(projectRoot, "spec", "user");
const execFileAsync = promisify(execFile);

const manualSkillEntries = [
  {
    directory: "read-flight-operations-manual",
    name: "运行手册"
  },
  {
    directory: "read-flight-training-program",
    name: "训练大纲"
  },
  {
    directory: "read-flight-technical-management-manual",
    name: "技术管理手册"
  }
] as const;

async function walkTypeScriptFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];

  async function visit(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        results.push(fullPath);
      }
    }
  }

  await visit(rootDir);
  return results.sort();
}

async function walkSourceAssetFiles(rootDir: string): Promise<string[]> {
  const results: string[] = [];
  const assetExtensions = new Set([".py"]);

  async function visit(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }

      if (entry.isFile() && assetExtensions.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  await visit(rootDir);
  return results.sort();
}

function toOutputPath(sourceFilePath: string): string {
  const relativePath = path.relative(sourceRoot, sourceFilePath);
  return path.join(distRoot, relativePath.replace(/\.ts$/i, ".js"));
}

function toAssetOutputPath(sourceFilePath: string): string {
  const relativePath = path.relative(sourceRoot, sourceFilePath);
  return path.join(distRoot, relativePath);
}

async function prepareDist() {
  await fs.rm(distRoot, { recursive: true, force: true });
  await fs.mkdir(distRoot, { recursive: true });
}

async function copyStaticFiles() {
  await fs.cp(staticRoot, distRoot, {
    recursive: true,
    force: true
  });

  const historyPath = path.join(projectRoot, "history.md");
  try {
    await fs.copyFile(historyPath, path.join(distRoot, "history.md"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function readGitText(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: projectRoot,
      encoding: "utf8"
    });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function generateVersionFile() {
  const commit = await readGitText(["rev-parse", "--short", "HEAD"]);
  const branch = await readGitText(["branch", "--show-current"]);
  const rawLog = await readGitText(["log", "--pretty=format:%h%x09%cI%x09%s"]);
  const commits = rawLog
    ? rawLog.split(/\r?\n/).map((line) => {
        const [hash = "", date = "", ...messageParts] = line.split("\t");
        return {
          hash,
          date,
          message: messageParts.join("\t")
        };
      }).filter((item) => item.hash || item.message)
    : [];

  const version = {
    commit,
    branch,
    builtAt: new Date().toISOString(),
    commits
  };

  await fs.writeFile(
    path.join(distRoot, "version.json"),
    `${JSON.stringify(version, null, 2)}\n`,
    "utf8"
  );
}

function readFrontmatterValue(frontmatter: string, key: string): string {
  const prefix = `${key}:`;
  const line = frontmatter
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(prefix));
  return line ? line.trim().slice(prefix.length).trim() : "";
}

async function generateSkillsDataFile() {
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  const skills: Array<{ name: string; description: string; source: string; path: string }> = [];
  const pinnedSkillNames = new Map([
    ["read-flight-operations-manual", 0],
    ["read-flight-training-program", 1],
    ["read-flight-technical-management-manual", 2]
  ]);
  const manualSkillNames = new Set(manualSkillEntries.map((item) => item.directory));

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    if (!entry.isDirectory()) continue;
    if (manualSkillNames.has(entry.name as typeof manualSkillEntries[number]["directory"])) continue;
    const skillPath = path.join(skillsRoot, entry.name, "SKILL.md");

    try {
      const source = await fs.readFile(skillPath, "utf8");
      const frontmatterMatch = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
      const frontmatter = frontmatterMatch?.[1] || "";
      skills.push({
        name: readFrontmatterValue(frontmatter, "name") || entry.name,
        description: readFrontmatterValue(frontmatter, "description"),
        source,
        path: `.agents/skills/${entry.name}/SKILL.md`
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  skills.sort((left, right) => {
    const leftPriority = pinnedSkillNames.get(left.name) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = pinnedSkillNames.get(right.name) ?? Number.MAX_SAFE_INTEGER;
    return leftPriority - rightPriority || left.name.localeCompare(right.name, "en");
  });

  const outputPath = path.join(distRoot, "tool", "skills-data.js");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `window.skills = ${JSON.stringify(skills)};\n`, "utf8");
}

function readObjectStringProperty(node: ts.ObjectLiteralExpression, propertyName: string): string {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? property.name.text
      : "";
    if (name !== propertyName || !ts.isStringLiteralLike(property.initializer)) continue;
    return property.initializer.text;
  }
  return "";
}

async function readToolCatalog(): Promise<Array<{ name: string; description: string; entry: string }>> {
  const sourcePath = path.join(sourceRoot, "tool", "tools-data.ts");
  const sourceText = await fs.readFile(sourcePath, "utf8");
  const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true);
  let catalog: Array<{ name: string; description: string; entry: string }> = [];

  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "tools") continue;
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) continue;
      catalog = declaration.initializer.elements.flatMap((element) => {
        if (!ts.isObjectLiteralExpression(element)) return [];
        const name = readObjectStringProperty(element, "name");
        const description = readObjectStringProperty(element, "desc");
        const entry = readObjectStringProperty(element, "entry");
        return name && entry ? [{ name, description, entry }] : [];
      });
    }
  });

  if (!catalog.length) {
    throw new Error("无法从 src/tool/tools-data.ts 读取工具清单。");
  }
  return catalog;
}

function stripFrontmatter(source: string): string {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

async function generateManualsDataFile() {
  const manuals: Array<{ name: string; description: string; source: string; path: string }> = [];

  for (const item of manualSkillEntries) {
    const relativePath = `.agents/skills/${item.directory}/SKILL.md`;
    const source = await fs.readFile(path.join(projectRoot, relativePath), "utf8");
    const frontmatterMatch = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    manuals.push({
      name: item.name,
      description: readFrontmatterValue(frontmatterMatch?.[1] || "", "description"),
      source: stripFrontmatter(source).trim(),
      path: relativePath
    });
  }

  for (const tool of await readToolCatalog()) {
    const relativePath = `spec/user/${tool.entry}/manual.md`;
    const source = await fs.readFile(path.join(projectRoot, relativePath), "utf8");
    manuals.push({
      name: tool.name,
      description: tool.description,
      source: source.trim(),
      path: relativePath
    });
  }

  const outputPath = path.join(distRoot, "tool", "manuals-data.js");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `window.manuals = ${JSON.stringify(manuals)};\n`, "utf8");
}

async function emitSourceFile(sourceFilePath: string): Promise<string> {
  const outputFilePath = toOutputPath(sourceFilePath);
  const sourceText = await fs.readFile(sourceFilePath, "utf8");
  const result = ts.transpileModule(sourceText, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false
    },
    fileName: sourceFilePath
  });

  await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
  await fs.writeFile(outputFilePath, result.outputText, "utf8");
  return path.relative(projectRoot, outputFilePath);
}

async function copySourceAsset(sourceFilePath: string): Promise<string> {
  const outputFilePath = toAssetOutputPath(sourceFilePath);
  await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
  await fs.copyFile(sourceFilePath, outputFilePath);
  return path.relative(projectRoot, outputFilePath);
}

async function main() {
  await prepareDist();
  await copyStaticFiles();

  const sourceFiles = await walkTypeScriptFiles(sourceRoot);

  if (!sourceFiles.length) {
    throw new Error("src/ 下没有可构建的 TypeScript 文件。");
  }

  const emittedFiles: string[] = [];
  for (const sourceFilePath of sourceFiles) {
    emittedFiles.push(await emitSourceFile(sourceFilePath));
  }

  const assetFiles = await walkSourceAssetFiles(sourceRoot);
  for (const sourceFilePath of assetFiles) {
    emittedFiles.push(await copySourceAsset(sourceFilePath));
  }

  await generateSkillsDataFile();
  await generateManualsDataFile();
  await generateVersionFile();

  process.stdout.write(`Built ${emittedFiles.length} scripts into dist/\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
