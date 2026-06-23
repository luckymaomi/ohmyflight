import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx-js-style";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("personnel structure stats", () => {
  let logic: any;

  beforeAll(() => {
    const context = loadBrowserScripts(["tool/app/personnel-structure-stats/logic.js"]);
    logic = context.PersonnelStructureStats;
  });

  function buildRows() {
    return [
      ["姓名", "员工号", "技术信息", "原单位", "检查员资格", "行政职务", "RAMA", "REUO", "RWAS", "EAMA", "EEUO", "EWAS"],
      ["教员甲", "100001", "777:飞行教员A", "总队777", "公司检查员", "M", 1, 1, 1, 1, 1, 1],
      ["机长乙", "100002", "777:B类机长", "777返聘", "", "", "", "", "", 1, "", 1],
      ["机长丙", "100003", "777:Z类机长", "河南分公司", "", "", "", "", "", "", "", ""],
      ["在训丁", "100004", "划转机长", "湖北分公司", "", "", "", "", "", "", "", ""],
      ["副驾戊", "100005", "777:A2类副驾驶", "总队777", "", "", "", "", "", 1, 1, ""],
      ["转机己", "100006", "划转副驾驶", "新疆分公司（借）", "", "", "", "", "", "", "", ""],
      ["机长庚", "100007", "777:D类机长", "火星分公司", "", "", "", "", "", "", "", ""]
    ];
  }

  function section(result: any, title: string) {
    const found = result.sections.find((item: any) => item.title === title);
    expect(found).toBeTruthy();
    return found;
  }

  function countOf(result: any, title: string, label: string) {
    const found = section(result, title).items.find((item: any) => item.label === label);
    expect(found).toBeTruthy();
    return found.count;
  }

  function sumOf(sectionValue: any, excludedLabels: string[] = []) {
    return sectionValue.items
      .filter((item: any) => !excludedLabels.includes(item.label))
      .reduce((total: number, item: any) => total + item.count, 0);
  }

  it("parses personnel rows by header names instead of fixed columns", () => {
    const records = logic.parseRows(buildRows());

    expect(records).toHaveLength(7);
    expect(records[0]).toMatchObject({
      employeeId: "100001",
      name: "教员甲",
      techInfo: "777:飞行教员A",
      origin: "总队777",
      managementRole: "M"
    });
    expect(records[0].qualifications.RAMA).toBe(true);
    expect(records[1].qualifications.RAMA).toBe(false);
  });

  it("calculates Word-structure personnel stats without mixing single-flight and communication codes", () => {
    const result = logic.calculate(logic.parseRows(buildRows()));

    expect(result.totalPeople).toBe(34);
    expect(result.registeredCrewCount).toBe(5);
    expect(result.groundCount).toBe(29);

    expect(section(result, "教员、机长、副驾驶占比").denominatorLabel).toBe("7人");
    expect(countOf(result, "教员、机长、副驾驶占比", "教员")).toBe(1);
    expect(countOf(result, "教员、机长、副驾驶占比", "机长")).toBe(4);
    expect(countOf(result, "教员、机长、副驾驶占比", "副驾驶")).toBe(2);

    expect(section(result, "机长含以上各级别占比").denominatorLabel).toBe("5人");
    expect(countOf(result, "机长含以上各级别占比", "A类教员")).toBe(1);
    expect(countOf(result, "机长含以上各级别占比", "B类机长")).toBe(1);
    expect(countOf(result, "机长含以上各级别占比", "D类机长")).toBe(1);
    expect(countOf(result, "机长含以上各级别占比", "Z类机长")).toBe(1);
    expect(countOf(result, "机长含以上各级别占比", "在训机长")).toBe(1);

    expect(countOf(result, "机长航线资格占比", "美+欧+西亚")).toBe(1);
    expect(countOf(result, "机长航线资格占比", "航线机长")).toBe(1);
    expect(countOf(result, "机长航线资格占比", "左座带飞")).toBe(1);
    expect(countOf(result, "机长航线资格占比", "其他")).toBe(1);
    expect(section(result, "机长航线资格占比").denominatorLabel).toBe("4人");

    expect(countOf(result, "机长报务占比", "美+欧+西亚")).toBe(1);
    expect(countOf(result, "机长报务占比", "美+西亚")).toBe(1);
    expect(countOf(result, "机长报务占比", "无报务")).toBe(2);

    expect(section(result, "副驾驶级别占比").denominatorLabel).toBe("2人");
    expect(countOf(result, "副驾驶级别占比", "A类副驾驶")).toBe(1);
    expect(countOf(result, "副驾驶级别占比", "转机型副驾驶")).toBe(1);
    expect(section(result, "副驾驶报务占比").denominatorLabel).toBe("1人");
    expect(countOf(result, "副驾驶报务占比", "美+欧")).toBe(1);
    expect(countOf(result, "副驾驶报务占比", "无报务")).toBe(0);

    expect(sumOf(section(result, "飞行管理人员占比"))).toBe(7);
    expect(sumOf(section(result, "教员、机长、副驾驶占比"))).toBe(7);
    expect(sumOf(section(result, "机长含以上各级别占比"), ["检查员"])).toBe(5);
    expect(sumOf(section(result, "机长航线资格占比"))).toBe(4);
    expect(sumOf(section(result, "机长报务占比"))).toBe(4);
    expect(sumOf(section(result, "副驾驶级别占比"))).toBe(2);
    expect(sumOf(section(result, "副驾驶报务占比"))).toBe(1);
    expect(sumOf(section(result, "人员居住情况"))).toBe(7);
    expect(sumOf(section(result, "空勤人员原单位情况"))).toBe(7);
  });

  it("classifies local residence and origin summaries by confirmed airline rules", () => {
    const result = logic.calculate(logic.parseRows(buildRows()));

    expect(countOf(result, "人员居住情况", "机长本地居住")).toBe(2);
    expect(countOf(result, "人员居住情况", "机长异地居住")).toBe(3);
    expect(countOf(result, "人员居住情况", "副驾驶本地居住")).toBe(1);
    expect(countOf(result, "人员居住情况", "副驾驶异地居住")).toBe(1);
    expect(countOf(result, "空勤人员原单位情况", "飞行/总队 777")).toBe(3);
    expect(countOf(result, "空勤人员原单位情况", "河南")).toBe(1);
    expect(countOf(result, "空勤人员原单位情况", "其他")).toBe(1);
  });

  it("replays the reviewed personnel sample without major data drift when available", () => {
    const samplePath = path.resolve(process.cwd(), "personnel.xlsx");
    if (!fs.existsSync(samplePath)) return;

    const workbook = XLSX.read(fs.readFileSync(samplePath), { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
    const result = logic.calculate(logic.parseRows(rows));

    expect(result.totalPeople).toBe(395);
    expect(result.registeredCrewCount).toBe(366);
    expect(result.groundCount).toBe(29);
    expect(countOf(result, "飞行管理人员占比", "管理人员")).toBe(23);
    expect(countOf(result, "教员、机长、副驾驶占比", "教员")).toBe(102);
    expect(countOf(result, "教员、机长、副驾驶占比", "机长")).toBe(106);
    expect(countOf(result, "教员、机长、副驾驶占比", "副驾驶")).toBe(180);
    expect(countOf(result, "机长含以上各级别占比", "在训机长")).toBe(1);
    expect(countOf(result, "机长航线资格占比", "航线机长")).toBe(79);
    expect(countOf(result, "机长航线资格占比", "左座带飞")).toBe(23);
    expect(countOf(result, "副驾驶级别占比", "转机型副驾驶")).toBe(21);
    expect(countOf(result, "人员居住情况", "机长异地居住")).toBe(90);
    expect(countOf(result, "人员居住情况", "副驾驶异地居住")).toBe(77);
    expect(countOf(result, "空勤人员原单位情况", "飞行/总队 777")).toBe(194);
  });
});
