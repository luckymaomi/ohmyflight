(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    function stripExtension(fileName: string): string {
        return String(fileName || "").replace(/\.[^.]+$/i, "");
    }

    function makeDocumentId(file: File, role: string): string {
        return `${role}-${file.name.replace(/[^\w\u4e00-\u9fa5-]+/g, "-")}`;
    }

    function guessTitle(line: string, currentTitle: string): string {
        const text = String(line || "").trim();
        if (/^\d+(?:\.\d+){1,6}\s*\S{0,60}$/.test(text)) return text;
        if (/^[第附]?[一二三四五六七八九十百\d]+[章节条]\s*\S{0,60}$/.test(text)) return text;
        return currentTitle;
    }

    function splitDocxUnits(text: string, documentId: string, documentName: string): ProofKingDocumentUnit[] {
        const lines = String(text || "")
            .replace(/\r\n/g, "\n")
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean);
        const units: ProofKingDocumentUnit[] = [];
        let currentTitle = "";
        lines.forEach((line) => {
            currentTitle = guessTitle(line, currentTitle);
            units.push({
                id: `${documentId}-u${units.length + 1}`,
                documentId,
                documentName,
                unitIndex: units.length + 1,
                title: currentTitle,
                text: line
            });
        });
        return units;
    }

    async function readDocxFile(file: File, role: string): Promise<ProofKingDocument> {
        if (!/\.docx$/i.test(file.name)) {
            throw new Error(`${file.name} 不是 docx 文件。`);
        }
        if (!window.mammoth?.extractRawText) {
            throw new Error("页面缺少 mammoth，无法读取 Word 文件。");
        }
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        const id = makeDocumentId(file, role);
        const name = file.name || `${stripExtension(file.name)}.docx`;
        return {
            id,
            name,
            type: "docx",
            units: splitDocxUnits(result.value || "", id, name)
        };
    }

    function getPdfJs() {
        if (!window.pdfjsLib) {
            throw new Error("页面缺少 PDF.js，无法读取 PDF。");
        }
        if (window.pdfjsLib.GlobalWorkerOptions) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "../../../libs/pdf.worker.min.js";
        }
        return window.pdfjsLib;
    }

    function normalizePageRange(startPage: number | "", endPage: number | "", pageCount: number): { start: number; end: number } {
        const start = Number(startPage);
        const end = Number(endPage);
        const normalizedStart = Number.isFinite(start) && start > 0 ? Math.trunc(start) : 1;
        const normalizedEnd = Number.isFinite(end) && end > 0 ? Math.trunc(end) : pageCount;
        const min = Math.max(1, Math.min(normalizedStart, normalizedEnd));
        const max = Math.min(pageCount, Math.max(normalizedStart, normalizedEnd));
        if (min > max) {
            throw new Error("PDF 页码范围无效。");
        }
        return { start: min, end: max };
    }

    async function readPdfFile(file: File, role: string, pageRange: { startPage: number | ""; endPage: number | "" }): Promise<ProofKingDocument> {
        if (!/\.pdf$/i.test(file.name)) {
            throw new Error(`${file.name} 不是 PDF 文件。`);
        }
        const pdfjs = getPdfJs();
        const id = makeDocumentId(file, role);
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buffer.slice(0) }).promise;
        const range = normalizePageRange(pageRange.startPage, pageRange.endPage, pdf.numPages);
        const units: ProofKingDocumentUnit[] = [];
        for (let pageNumber = range.start; pageNumber <= range.end; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const text = (textContent.items || [])
                .map((item: any) => String(item?.str || ""))
                .filter(Boolean)
                .join("\n");
            units.push({
                id: `${id}-p${pageNumber}`,
                documentId: id,
                documentName: file.name,
                unitIndex: units.length + 1,
                title: `第 ${pageNumber} 页`,
                pageNumber,
                text
            });
        }
        if (!units.some((unit) => unit.text.trim())) {
            throw new Error(`${file.name} 在指定页码范围内没有可读取文字层，暂不支持扫描件或图片 PDF。`);
        }
        return {
            id,
            name: file.name,
            type: "pdf",
            pageCount: pdf.numPages,
            pdf,
            units
        };
    }

    async function readManualFile(file: File, role: string, pageRange: { startPage: number | ""; endPage: number | "" }): Promise<ProofKingDocument> {
        if (/\.docx$/i.test(file.name)) return readDocxFile(file, role);
        if (/\.pdf$/i.test(file.name)) return readPdfFile(file, role, pageRange);
        throw new Error(`${file.name} 不是支持的文件类型，当前只支持 docx 和文字型 PDF。`);
    }

    runtime.Reader = {
        readManualFile,
        splitDocxUnits,
        normalizePageRange
    };
})();
