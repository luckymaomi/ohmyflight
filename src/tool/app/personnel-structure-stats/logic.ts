type PersonnelRawRow = Record<string, unknown>;

type PersonnelRecord = {
    employeeId: string;
    name: string;
    techInfo: string;
    origin: string;
    inspectorQualification: string;
    managementRole: string;
    qualifications: Record<string, boolean>;
};

type PersonnelStatItem = {
    label: string;
    count: number;
    denominator: number;
    percent: string;
    rule: string;
};

type PersonnelStatSection = {
    title: string;
    denominatorLabel: string;
    items: PersonnelStatItem[];
};

type PersonnelStructureResult = {
    totalPeople: number;
    registeredCrewCount: number;
    groundCount: number;
    sections: PersonnelStatSection[];
    warnings: string[];
    unrecognized: {
        techInfo: string[];
        origin: string[];
    };
};

type PersonnelStructureStatsApi = {
    parseRows: (rows: unknown[][]) => PersonnelRecord[];
    calculate: (records: PersonnelRecord[]) => PersonnelStructureResult;
    REQUIRED_HEADERS: string[];
};

const REQUIRED_HEADERS = [
    "姓名",
    "技术信息",
    "RAMA",
    "REUO",
    "RWAS",
    "EAMA",
    "EEUO",
    "EWAS",
    "原单位",
    "检查员资格",
    "行政职务"
];

const QUALIFICATION_CODES = [
    "RAMA",
    "REUO",
    "RWAS",
    "RSEA",
    "EAMA",
    "EEUO",
    "EWAS",
    "ESEA",
    "RANC",
    "RORD",
    "RJFK",
    "RLAX",
    "RNLU"
];

const ORIGIN_LABELS = [
    "飞行/总队 777",
    "飞行/总队 737",
    "飞行/总队 320",
    "飞行/总队 909",
    "湖南",
    "湖北",
    "新疆",
    "河南",
    "西安",
    "重庆",
    "汕头",
    "珠海",
    "广西",
    "海南",
    "上海"
];

const FIXED_GROUND_COUNT = 29;

function normalizeText(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function normalizeHeader(value: unknown): string {
    return normalizeText(value).replace(/\s+/g, "");
}

function hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && normalizeText(value) !== "";
}

function findHeaderRowIndex(rows: unknown[][]): number {
    return rows.findIndex((row) => {
        if (!Array.isArray(row)) return false;
        const headers = row.map(normalizeHeader);
        return REQUIRED_HEADERS.filter((header) => headers.includes(header)).length >= 5;
    });
}

function buildHeaderMap(headerRow: unknown[]): Map<string, number> {
    const map = new Map<string, number>();
    headerRow.forEach((header, index) => {
        const normalized = normalizeHeader(header);
        if (normalized && !map.has(normalized)) {
            map.set(normalized, index);
        }
    });
    return map;
}

function valueByHeader(row: unknown[], headerMap: Map<string, number>, header: string): unknown {
    const index = headerMap.get(header);
    return index === undefined ? undefined : row[index];
}

function parseRows(rows: unknown[][]): PersonnelRecord[] {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const headerRowIndex = findHeaderRowIndex(rows);
    if (headerRowIndex < 0) {
        throw new Error(`未识别到人员信息表表头，至少需要包含：${REQUIRED_HEADERS.join("、")}`);
    }

    const headerMap = buildHeaderMap(rows[headerRowIndex]);
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerMap.has(header));
    if (missingHeaders.length) {
        throw new Error(`人员信息表缺少必要表头：${missingHeaders.join("、")}`);
    }

    const records: PersonnelRecord[] = [];
    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!Array.isArray(row)) continue;

        const name = normalizeText(valueByHeader(row, headerMap, "姓名"));
        const techInfo = normalizeText(valueByHeader(row, headerMap, "技术信息"));
        const employeeId = normalizeText(valueByHeader(row, headerMap, "员工号"));
        if (!name && !techInfo && !employeeId) continue;

        const qualifications: Record<string, boolean> = {};
        QUALIFICATION_CODES.forEach((code) => {
            qualifications[code] = hasValue(valueByHeader(row, headerMap, code));
        });

        records.push({
            employeeId,
            name,
            techInfo,
            origin: normalizeText(valueByHeader(row, headerMap, "原单位")),
            inspectorQualification: normalizeText(valueByHeader(row, headerMap, "检查员资格")),
            managementRole: normalizeText(valueByHeader(row, headerMap, "行政职务")),
            qualifications
        });
    }

    return records;
}

function techLabel(record: PersonnelRecord): string {
    const parts = record.techInfo.split(/[:：]/);
    return normalizeText(parts.length > 1 ? parts.slice(1).join(":") : record.techInfo);
}

function isTeacher(record: PersonnelRecord): boolean {
    return techLabel(record).includes("飞行教员");
}

function isTransferCaptain(record: PersonnelRecord): boolean {
    return techLabel(record) === "划转机长";
}

function isTransferFirstOfficer(record: PersonnelRecord): boolean {
    return techLabel(record) === "划转副驾驶";
}

function isCaptain(record: PersonnelRecord): boolean {
    const label = techLabel(record);
    return label.includes("机长") && !label.includes("飞行教员") && !label.includes("划转");
}

function isRegularFirstOfficer(record: PersonnelRecord): boolean {
    const label = techLabel(record);
    return label.includes("副驾驶") && !label.includes("划转");
}

function isRegisteredCrew(record: PersonnelRecord): boolean {
    return isTeacher(record) || isCaptain(record) || isRegularFirstOfficer(record);
}

function isCaptainOrAbove(record: PersonnelRecord): boolean {
    return isTeacher(record) || isCaptain(record) || isTransferCaptain(record);
}

function isFirstOfficerGroup(record: PersonnelRecord): boolean {
    return isRegularFirstOfficer(record) || isTransferFirstOfficer(record);
}

function hasQualification(record: PersonnelRecord, code: string): boolean {
    return Boolean(record.qualifications[code]);
}

function isLocal(record: PersonnelRecord): boolean {
    return record.origin.startsWith("总队") || record.origin === "777返聘";
}

function isInspector(record: PersonnelRecord): boolean {
    return record.inspectorQualification === "公司检查员" || record.inspectorQualification === "委任代表";
}

function isLineCaptain(record: PersonnelRecord): boolean {
    const label = techLabel(record);
    const isCaptainLevelForLine = label.includes("飞行教员")
        || label.includes("A类机长")
        || label.includes("B类机长")
        || label.includes("C类机长");
    return isCaptainLevelForLine
        && !label.includes("Z类机长")
        && !hasQualification(record, "RAMA")
        && !hasQualification(record, "REUO")
        && !hasQualification(record, "RWAS");
}

function percent(count: number, denominator: number): string {
    if (!denominator) return "0%";
    return `${Math.round((count / denominator) * 100)}%`;
}

function makeItem(label: string, count: number, denominator: number, rule: string): PersonnelStatItem {
    return {
        label,
        count,
        denominator,
        percent: percent(count, denominator),
        rule
    };
}

function count(records: PersonnelRecord[], predicate: (record: PersonnelRecord) => boolean): number {
    return records.filter(predicate).length;
}

function makeComboItems(
    records: PersonnelRecord[],
    denominator: number,
    prefix: "R" | "E",
    labels: {
        northOnly: string;
        europeOnly: string;
        westOnly: string;
        none: string;
    },
    rulePrefix: string
): PersonnelStatItem[] {
    const north = `${prefix}AMA`;
    const europe = `${prefix}EUO`;
    const west = `${prefix}WAS`;

    const comboCount = (expectedNorth: boolean, expectedEurope: boolean, expectedWest: boolean) => count(records, (record) =>
        hasQualification(record, north) === expectedNorth
        && hasQualification(record, europe) === expectedEurope
        && hasQualification(record, west) === expectedWest
    );

    return [
        makeItem("美+欧+西亚", comboCount(true, true, true), denominator, `${rulePrefix}：同时具备北美、欧洲、西亚。`),
        makeItem("美+欧", comboCount(true, true, false), denominator, `${rulePrefix}：具备北美、欧洲，不具备西亚。`),
        makeItem("美+西亚", comboCount(true, false, true), denominator, `${rulePrefix}：具备北美、西亚，不具备欧洲。`),
        makeItem("欧+西亚", comboCount(false, true, true), denominator, `${rulePrefix}：具备欧洲、西亚，不具备北美。`),
        makeItem(labels.northOnly, comboCount(true, false, false), denominator, `${rulePrefix}：只具备北美。`),
        makeItem(labels.europeOnly, comboCount(false, true, false), denominator, `${rulePrefix}：只具备欧洲。`),
        makeItem(labels.westOnly, comboCount(false, false, true), denominator, `${rulePrefix}：只具备西亚。`),
        makeItem(labels.none, comboCount(false, false, false), denominator, `${rulePrefix}：北美、欧洲、西亚均不具备。`)
    ];
}

function mapOrigin(origin: string): string {
    const normalized = normalizeText(origin);
    if (normalized === "总队777" || normalized === "777返聘") return "飞行/总队 777";
    if (normalized === "总队737") return "飞行/总队 737";
    if (normalized === "总队320") return "飞行/总队 320";
    if (normalized === "总队909") return "飞行/总队 909";
    if (normalized === "湖南分公司") return "湖南";
    if (normalized === "湖北分公司") return "湖北";
    if (normalized === "新疆分公司" || normalized === "新疆分公司（借）") return "新疆";
    if (normalized === "河南分公司") return "河南";
    if (normalized === "西安分公司") return "西安";
    if (normalized === "重庆航空") return "重庆";
    if (normalized === "汕头分公司") return "汕头";
    if (normalized === "珠海分公司") return "珠海";
    if (normalized === "广西分公司") return "广西";
    if (normalized === "海南分公司") return "海南";
    if (normalized === "上海分公司（借）") return "上海";
    return normalized || "未识别";
}

function uniqueSorted(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function calculate(records: PersonnelRecord[]): PersonnelStructureResult {
    const registeredCrew = records.filter(isRegisteredCrew);
    const captainBase = records.filter((record) => isTeacher(record) || isCaptain(record));
    const captainWithTraining = records.filter(isCaptainOrAbove);
    const firstOfficerBase = records.filter(isRegularFirstOfficer);
    const firstOfficerWithTransfer = records.filter(isFirstOfficerGroup);

    const registeredCrewCount = registeredCrew.length;
    const groundCount = FIXED_GROUND_COUNT;
    const totalPeople = registeredCrewCount + groundCount;
    const captainBaseDenominator = captainBase.length;
    const captainWithTrainingDenominator = captainWithTraining.length;
    const firstOfficerBaseDenominator = firstOfficerBase.length;
    const firstOfficerWithTransferDenominator = firstOfficerWithTransfer.length;

    const sections: PersonnelStatSection[] = [
        {
            title: "总人数及空地人员占比",
            denominatorLabel: `${totalPeople}人`,
            items: [
                makeItem("总人数", totalPeople, totalPeople, "已注册空勤人员加固定地面人员29人。"),
                makeItem("空勤人员（已注册人员）", registeredCrewCount, totalPeople, "飞行教员、非划转机长、非划转副驾驶。"),
                makeItem("地面人员", groundCount, totalPeople, "固定按29人统计。")
            ]
        },
        {
            title: "飞行管理人员占比",
            denominatorLabel: `${registeredCrewCount}人`,
            items: [
                makeItem("管理人员", count(registeredCrew, (record) => Boolean(record.managementRole)), registeredCrewCount, "行政职务非空。"),
                makeItem("非管理人员", count(registeredCrew, (record) => !record.managementRole), registeredCrewCount, "行政职务为空。")
            ]
        },
        {
            title: "教员、机长、副驾驶占比",
            denominatorLabel: `${totalPeople}人`,
            items: [
                makeItem("教员", count(records, isTeacher), totalPeople, "技术信息包含飞行教员。"),
                makeItem("机长", count(records, (record) => isCaptain(record) || isTransferCaptain(record)), totalPeople, "非教员机长，含划转机长。"),
                makeItem("副驾驶", count(records, (record) => isRegularFirstOfficer(record) || isTransferFirstOfficer(record)), totalPeople, "副驾驶，含划转副驾驶。")
            ]
        },
        {
            title: "机长含以上各级别占比",
            denominatorLabel: `${captainWithTrainingDenominator}人`,
            items: [
                makeItem("检查员", count(captainWithTraining, isInspector), captainWithTrainingDenominator, "检查员资格为公司检查员或委任代表。"),
                makeItem("C类教员", count(captainWithTraining, (record) => techLabel(record) === "飞行教员C"), captainWithTrainingDenominator, "技术信息为飞行教员C。"),
                makeItem("B类教员", count(captainWithTraining, (record) => techLabel(record) === "飞行教员B"), captainWithTrainingDenominator, "技术信息为飞行教员B。"),
                makeItem("A类教员", count(captainWithTraining, (record) => techLabel(record) === "飞行教员A"), captainWithTrainingDenominator, "技术信息为飞行教员A。"),
                makeItem("D类机长", count(captainWithTraining, (record) => techLabel(record) === "D类机长"), captainWithTrainingDenominator, "技术信息为D类机长。"),
                makeItem("C类机长", count(captainWithTraining, (record) => techLabel(record) === "C类机长"), captainWithTrainingDenominator, "技术信息为C类机长。"),
                makeItem("B类机长", count(captainWithTraining, (record) => techLabel(record) === "B类机长"), captainWithTrainingDenominator, "技术信息为B类机长。"),
                makeItem("Z类机长", count(captainWithTraining, (record) => techLabel(record) === "Z类机长"), captainWithTrainingDenominator, "技术信息为Z类机长。"),
                makeItem("在训机长", count(captainWithTraining, isTransferCaptain), captainWithTrainingDenominator, "划转机长。")
            ]
        },
        {
            title: "机长航线资格占比",
            denominatorLabel: `${captainBaseDenominator}人`,
            items: [
                ...makeComboItems(captainBase, captainBaseDenominator, "R", {
                    northOnly: "仅北美带队",
                    europeOnly: "仅欧洲带队",
                    westOnly: "仅西亚带队",
                    none: "无美欧西亚单飞"
                }, "RAMA/REUO/RWAS 单飞资格").filter((item) => item.label !== "无美欧西亚单飞"),
                makeItem("航线机长", count(captainBase, isLineCaptain), captainBaseDenominator, "B类及以上、无RAMA/REUO/RWAS单飞资格、且不是Z类机长。"),
                makeItem("左座带飞", count(captainBase, (record) => techLabel(record) === "Z类机长"), captainBaseDenominator, "Z类机长。")
            ]
        },
        {
            title: "机长报务占比",
            denominatorLabel: `${captainBaseDenominator}人`,
            items: makeComboItems(captainBase, captainBaseDenominator, "E", {
                northOnly: "单美洲报务",
                europeOnly: "单欧洲报务",
                westOnly: "单西亚报务",
                none: "无报务"
            }, "EAMA/EEUO/EWAS 英语通信资格")
        },
        {
            title: "副驾驶级别占比",
            denominatorLabel: `${firstOfficerWithTransferDenominator}人`,
            items: [
                makeItem("D类副驾驶", count(firstOfficerWithTransfer, (record) => techLabel(record) === "D类副驾驶"), firstOfficerWithTransferDenominator, "技术信息为D类副驾驶。"),
                makeItem("C类副驾驶", count(firstOfficerWithTransfer, (record) => techLabel(record) === "C类副驾驶"), firstOfficerWithTransferDenominator, "技术信息为C类副驾驶。"),
                makeItem("B类副驾驶", count(firstOfficerWithTransfer, (record) => techLabel(record) === "B类副驾驶"), firstOfficerWithTransferDenominator, "技术信息为B类副驾驶。"),
                makeItem("A类副驾驶", count(firstOfficerWithTransfer, (record) => techLabel(record) === "A1类副驾驶" || techLabel(record) === "A2类副驾驶"), firstOfficerWithTransferDenominator, "技术信息为A1类副驾驶或A2类副驾驶。"),
                makeItem("转机型副驾驶", count(firstOfficerWithTransfer, isTransferFirstOfficer), firstOfficerWithTransferDenominator, "划转副驾驶。")
            ]
        },
        {
            title: "副驾驶报务占比",
            denominatorLabel: `${firstOfficerBaseDenominator}人`,
            items: makeComboItems(firstOfficerBase, firstOfficerBaseDenominator, "E", {
                northOnly: "单美洲报务",
                europeOnly: "单欧洲报务",
                westOnly: "单西亚报务",
                none: "无报务"
            }, "EAMA/EEUO/EWAS 英语通信资格")
        },
        {
            title: "人员居住情况",
            denominatorLabel: `${captainBaseDenominator}人 / ${firstOfficerBaseDenominator}人`,
            items: [
                makeItem("机长本地居住", count(captainBase, isLocal), captainBaseDenominator, "原单位以总队开头或等于777返聘。"),
                makeItem("机长异地居住", count(captainBase, (record) => !isLocal(record)), captainBaseDenominator, "除本地外均为异地。"),
                makeItem("副驾驶本地居住", count(firstOfficerBase, isLocal), firstOfficerBaseDenominator, "原单位以总队开头或等于777返聘。"),
                makeItem("副驾驶异地居住", count(firstOfficerBase, (record) => !isLocal(record)), firstOfficerBaseDenominator, "除本地外均为异地。")
            ]
        }
    ];

    const originCounts = new Map<string, number>();
    registeredCrew.forEach((record) => {
        const label = mapOrigin(record.origin);
        originCounts.set(label, (originCounts.get(label) || 0) + 1);
    });

    sections.push({
        title: "空勤人员原单位情况",
        denominatorLabel: `${registeredCrewCount}人`,
        items: ORIGIN_LABELS.map((label) => makeItem(label, originCounts.get(label) || 0, registeredCrewCount, "按原单位映射汇总；总队777与777返聘合并到飞行/总队777。"))
    });

    const recognizedTech = records.filter((record) =>
        isTeacher(record)
        || isCaptain(record)
        || isRegularFirstOfficer(record)
        || isTransferCaptain(record)
        || isTransferFirstOfficer(record)
    );
    const unrecognizedTech = uniqueSorted(records
        .filter((record) => record.techInfo && !recognizedTech.includes(record))
        .map((record) => record.techInfo));

    const unrecognizedOrigin = uniqueSorted(registeredCrew
        .map((record) => record.origin)
        .filter((origin) => origin && !ORIGIN_LABELS.includes(mapOrigin(origin))));

    const warnings: string[] = [];
    if (unrecognizedTech.length) warnings.push(`有 ${unrecognizedTech.length} 类技术信息未识别。`);
    if (unrecognizedOrigin.length) warnings.push(`有 ${unrecognizedOrigin.length} 类原单位未映射。`);

    return {
        totalPeople,
        registeredCrewCount,
        groundCount,
        sections,
        warnings,
        unrecognized: {
            techInfo: unrecognizedTech,
            origin: unrecognizedOrigin
        }
    };
}

const PersonnelStructureStats: PersonnelStructureStatsApi = {
    parseRows,
    calculate,
    REQUIRED_HEADERS
};

const runtime = globalThis as typeof globalThis & {
    PersonnelStructureStats?: PersonnelStructureStatsApi;
};

runtime.PersonnelStructureStats = PersonnelStructureStats;
