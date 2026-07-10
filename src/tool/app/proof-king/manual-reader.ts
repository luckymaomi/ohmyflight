(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    function manualId(role: ManualRole, file: File): string {
        const safeName = (file.name || "manual").replace(/[^\w\u4e00-\u9fa5-]+/g, "-");
        return `${role}-${Date.now()}-${safeName}`;
    }

    function detectTitle(line: string, currentTitle: string): string {
        const text = String(line || "").trim();
        if (/^\d+(?:\.\d+){1,6}\s*\S{0,60}$/.test(text)) return text;
        if (/^[第附]?[一二三四五六七八九十百\d]+[章节条]\s*\S{0,60}$/.test(text)) return text;
        return currentTitle;
    }

    function splitWordUnits(text: string, id: string): ManualTextUnit[] {
        let title = "";
        const units: ManualTextUnit[] = [];
        String(text || "")
            .replace(/\r\n/g, "\n")
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => {
                title = detectTitle(line, title);
                units.push({
                    id: `${id}-unit-${units.length + 1}`,
                    manualId: id,
                    unitIndex: units.length + 1,
                    title,
                    text: line
                });
            });
        return units;
    }

    function normalizePdfRange(startPage: number | "", endPage: number | "", pageCount: number): { start: number; end: number } {
        const startValue = Number(startPage);
        const endValue = Number(endPage);
        const first = Number.isFinite(startValue) && startValue > 0 ? Math.trunc(startValue) : 1;
        const last = Number.isFinite(endValue) && endValue > 0 ? Math.trunc(endValue) : pageCount;
        const start = Math.max(1, Math.min(first, last));
        const end = Math.min(pageCount, Math.max(first, last));
        if (start > end) throw new Error("PDF 页码范围无效。");
        return { start, end };
    }

    async function readManual(file: File, role: ManualRole, range: { startPage: number | ""; endPage: number | "" }): Promise<LocalManual> {
        if (/\.docx$/i.test(file.name)) return readWord(file, role);
        if (/\.pdf$/i.test(file.name)) return readPdf(file, role, range);
        throw new Error("当前只支持 .docx 和文字型 .pdf。");
    }

    async function readWord(file: File, role: ManualRole): Promise<LocalManual> {
        if (!window.mammoth?.extractRawText) throw new Error("页面缺少 Word 读取组件。");
        const id = manualId(role, file);
        const wordPreviewData = await file.arrayBuffer();
        const extracted = await window.mammoth.extractRawText({ arrayBuffer: wordPreviewData.slice(0) });
        const units = splitWordUnits(extracted.value || "", id);
        if (!units.length) throw new Error(`${file.name} 未提取到可比对文字。`);
        return {
            id,
            role,
            name: file.name,
            format: "docx",
            units,
            wordPreviewData
        };
    }

    async function readPdf(file: File, role: ManualRole, requestedRange: { startPage: number | ""; endPage: number | "" }): Promise<LocalManual> {
        if (!window.pdfjsLib) throw new Error("页面缺少 PDF 读取组件。");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "../../../libs/pdf.worker.min.js";
        const id = manualId(role, file);
        const data = await file.arrayBuffer();
        const pdfDocument = await window.pdfjsLib.getDocument({ data: data.slice(0) }).promise;
        const range = normalizePdfRange(requestedRange.startPage, requestedRange.endPage, pdfDocument.numPages);
        const units: ManualTextUnit[] = [];
        for (let pageNumber = range.start; pageNumber <= range.end; pageNumber += 1) {
            const page = await pdfDocument.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const text = (textContent.items || [])
                .map((item: any) => String(item?.str || ""))
                .filter(Boolean)
                .join("\n");
            units.push({
                id: `${id}-page-${pageNumber}`,
                manualId: id,
                unitIndex: units.length + 1,
                title: `第 ${pageNumber} 页`,
                pageNumber,
                text
            });
        }
        if (!units.some((unit) => unit.text.trim())) {
            throw new Error(`${file.name} 没有可读取文字层，暂不支持扫描件或图片 PDF。`);
        }
        return {
            id,
            role,
            name: file.name,
            format: "pdf",
            units,
            pageCount: pdfDocument.numPages,
            pdfDocument
        };
    }

    function toWorkerManual(manual: LocalManual): WorkerManual {
        return {
            id: manual.id,
            name: manual.name,
            units: manual.units.map((unit) => ({
                id: unit.id,
                manualId: unit.manualId,
                unitIndex: unit.unitIndex,
                title: unit.title,
                pageNumber: unit.pageNumber,
                text: unit.text
            }))
        };
    }

    runtime.ManualReader = {
        readManual,
        splitWordUnits,
        normalizePdfRange,
        toWorkerManual
    };
})();
