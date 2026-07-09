import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("proof-king pdf preview routing", () => {
    let preview: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/preview.js"
        ]);
        preview = (context.ProofKing as any).Preview;
    });

    it("uses the target match page for normal A-to-B rows", () => {
        const result = makeResult();
        const row = {
            source: { documentId: "source", pageNumber: undefined },
            target: { segment: { documentId: "target", pageNumber: 8 } }
        };

        expect(preview.resolvePreviewPage(row, result)).toBe(8);
    });

    it("uses the B source page for added target rows", () => {
        const result = makeResult();
        const row = {
            source: { documentId: "target", pageNumber: 12 }
        };

        expect(preview.resolvePreviewPage(row, result)).toBe(12);
    });
});

function makeResult() {
    return {
        targetDocument: {
            id: "target",
            type: "pdf",
            pdf: {}
        }
    };
}
