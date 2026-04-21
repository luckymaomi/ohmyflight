type CrewRosterEntry = {
    id: string;
    name: string;
    techInfo: string;
    techLevel: string;
};

type CrewMatchNameIdLogicApi = {
    parseRosterRows: (rows: unknown[][]) => CrewRosterEntry[];
    extractTechLevel: (techInfo: unknown) => string;
};

function normalizeText(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function normalizeHeader(value: unknown): string {
    return normalizeText(value).replace(/\s+/g, "");
}

function findHeaderIndex(headers: unknown[], keyword: string, fallbackIndex: number): number {
    const hitIndex = headers.findIndex((header) => {
        const normalized = normalizeHeader(header);
        return normalized === keyword || normalized.includes(keyword);
    });
    return hitIndex >= 0 ? hitIndex : fallbackIndex;
}

function extractTechLevel(techInfo: unknown): string {
    const raw = normalizeText(techInfo);
    if (!raw) return "";

    const compact = raw.toUpperCase().replace(/\s+/g, "");
    const afterColon = compact.split(/[:：]/).slice(1).join(":");
    const content = afterColon || compact;

    const classTypeMatch = content.match(/([A-Z]\d{0,2})类/);
    if (classTypeMatch && classTypeMatch[1]) {
        return classTypeMatch[1];
    }

    const instructorMatch = content.match(/飞行教员([A-Z]\d{0,2})/);
    if (instructorMatch && instructorMatch[1]) {
        return instructorMatch[1];
    }

    const suffixMatch = content.match(/([A-Z]\d{0,2})$/);
    if (suffixMatch && suffixMatch[1]) {
        return suffixMatch[1];
    }

    return "";
}

function parseRosterRows(rows: unknown[][]): CrewRosterEntry[] {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
    const hasNamedHeader = headerRow.some((cell) => normalizeHeader(cell).includes("员工号"))
        && headerRow.some((cell) => normalizeHeader(cell).includes("姓名"));

    const idIndex = hasNamedHeader ? findHeaderIndex(headerRow, "员工号", 0) : 0;
    const nameIndex = hasNamedHeader ? findHeaderIndex(headerRow, "姓名", 1) : 1;
    const techInfoIndex = hasNamedHeader ? findHeaderIndex(headerRow, "技术信息", -1) : 2;
    const startRowIndex = hasNamedHeader ? 1 : 0;

    const parsed: CrewRosterEntry[] = [];

    for (let i = startRowIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;

        const id = normalizeText(row[idIndex]);
        const name = normalizeText(row[nameIndex]);
        if (!id || !name) continue;

        const techInfo = techInfoIndex >= 0 ? normalizeText(row[techInfoIndex]) : "";
        parsed.push({
            id,
            name,
            techInfo,
            techLevel: extractTechLevel(techInfo)
        });
    }

    return parsed;
}

const CrewMatchNameIdLogic: CrewMatchNameIdLogicApi = {
    parseRosterRows,
    extractTechLevel
};

const runtime = globalThis as typeof globalThis & {
    CrewMatchNameIdLogic?: CrewMatchNameIdLogicApi;
};

runtime.CrewMatchNameIdLogic = CrewMatchNameIdLogic;
