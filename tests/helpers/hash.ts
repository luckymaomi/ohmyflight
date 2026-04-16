import crypto from "node:crypto";
import fs from "node:fs";

export function hashBytes(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function hashFile(filePath: string) {
  return hashBytes(fs.readFileSync(filePath));
}

export function hashNormalizedTextFile(filePath: string) {
  const normalized = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  return hashBytes(Buffer.from(normalized, "utf8"));
}
