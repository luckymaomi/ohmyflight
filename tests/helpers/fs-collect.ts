import fs from "node:fs";
import path from "node:path";

export function walkFiles(rootDir: string, extensions: string[] = []): string[] {
  const results: string[] = [];
  const normalizedExtensions = new Set(extensions.map((item: string) => item.toLowerCase()));

  function visit(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        return;
      }

      if (!normalizedExtensions.size || normalizedExtensions.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    });
  }

  visit(rootDir);
  return results.sort();
}

