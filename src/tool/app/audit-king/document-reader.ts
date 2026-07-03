(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function stripExtension(fileName: string): string {
        return fileName.replace(/\.[^.]+$/i, "");
    }

    function makeDocumentId(file: File, index: number): string {
        return `doc-${index + 1}-${file.name.replace(/[^\w\u4e00-\u9fa5-]+/g, "-")}`;
    }

    function guessTitle(line: string, currentTitle: string): string {
        const text = line.trim();
        if (/^\d+(?:\.\d+){1,5}\s*\S{0,40}$/.test(text)) {
            return text;
        }
        if (/^[第附]?[一二三四五六七八九十百\d]+[章节条]\s*\S{0,40}$/.test(text)) {
            return text;
        }
        return currentTitle;
    }

    function splitTextBlocks(text: string, documentId: string, documentName: string): AuditKingTextBlock[] {
        const lines = text
            .replace(/\r\n/g, "\n")
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean);
        const blocks: AuditKingTextBlock[] = [];
        let currentTitle = "";

        lines.forEach((line) => {
            currentTitle = guessTitle(line, currentTitle);
            blocks.push({
                id: `${documentId}-b${blocks.length + 1}`,
                documentId,
                documentName,
                blockIndex: blocks.length + 1,
                title: currentTitle,
                text: line
            });
        });

        return blocks;
    }

    async function readDocxFile(file: File, index = 0): Promise<AuditKingDocument> {
        if (!/\.docx$/i.test(file.name)) {
            throw new Error(`${file.name} 不是 docx 文件。`);
        }
        if (!window.mammoth?.extractRawText) {
            throw new Error("未加载 mammoth，无法读取 Word 文件。");
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        const documentId = makeDocumentId(file, index);
        const documentName = file.name || `${stripExtension(file.name)}.docx`;
        return {
            id: documentId,
            name: documentName,
            blocks: splitTextBlocks(result.value || "", documentId, documentName)
        };
    }

    runtime.DocumentReader = {
        readDocxFile,
        splitTextBlocks
    };
})();
