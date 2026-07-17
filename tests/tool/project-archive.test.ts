import { webcrypto } from "node:crypto";

import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../helpers/browser-context";

describe("项目归档底层", () => {
    let archive: any;

    beforeAll(() => {
        const context = loadBrowserScripts(["tool/project-archive.js"], {
            JSZip,
            Blob,
            File,
            Uint8Array,
            ArrayBuffer,
            crypto: webcrypto,
            TextEncoder,
            TextDecoder
        });
        archive = (context as any).OhMyFlightProjectArchive;
    });

    it("写入并校验工具类型、状态和原始文件哈希", async () => {
        const bytes = await archive.build({
            tool: "proof-king",
            schemaVersion: 1,
            metadata: { title: "测试项目" },
            entries: [
                { path: "state/project.json", data: JSON.stringify({ selected: ["revision-2"] }), role: "state" },
                { path: "sources/my/manual.pdf", data: new File(["manual-a"], "manual.pdf", { type: "application/pdf" }), role: "my-manual" }
            ]
        });
        const restored = await archive.read(bytes, "proof-king", 1);

        expect(restored.manifest).toMatchObject({ format: "ohmyflight-project", tool: "proof-king", schemaVersion: 1 });
        expect(await restored.json("state/project.json")).toEqual({ selected: ["revision-2"] });
        const file = await restored.file("sources/my/manual.pdf", "manual.pdf", "application/pdf");
        expect(await file.text()).toBe("manual-a");
        await expect(archive.read(bytes, "audit-king", 1)).rejects.toThrow("项目类型");
    });

    it("拒绝清单声明后被篡改的文件", async () => {
        const bytes = await archive.build({
            tool: "audit-king",
            schemaVersion: 1,
            entries: [{ path: "state/audit.json", data: "original", role: "state" }]
        });
        const zip = await JSZip.loadAsync(bytes);
        zip.file("state/audit.json", "tampered");
        const tampered = await zip.generateAsync({ type: "uint8array" });

        await expect(archive.read(tampered, "audit-king", 1)).rejects.toThrow("校验失败");
    });
});
