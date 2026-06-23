import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx-js-style";

import { resolveFromRoot } from "../../helpers/paths";

const appPath = resolveFromRoot("src", "tool", "app", "personnel-structure-stats", "app.py");

function runPython(script: string) {
  return execFileSync("python", ["-c", script], {
    cwd: resolveFromRoot(),
    encoding: "utf8"
  });
}

function createSampleWorkbook(filePath: string) {
  const rows = [
    ["姓名", "员工号", "技术信息", "原单位", "检查员资格", "行政职务", "RAMA", "REUO", "RWAS", "EAMA", "EEUO", "EWAS"],
    ["教员甲", "100001", "777:飞行教员A", "总队777", "公司检查员", "M", 1, 1, 1, 1, 1, 1],
    ["机长乙", "100002", "777:B类机长", "777返聘", "", "", "", "", "", 1, "", 1],
    ["机长丙", "100003", "777:Z类机长", "河南分公司", "", "", "", "", "", "", "", ""],
    ["在训丁", "100004", "划转机长", "湖北分公司", "", "", "", "", "", "", "", ""],
    ["副驾戊", "100005", "777:A2类副驾驶", "总队777", "", "", "", "", "", 1, 1, ""],
    ["转机己", "100006", "划转副驾驶", "新疆分公司（借）", "", "", "", "", "", "", "", ""],
    ["机长庚", "100007", "777:D类机长", "火星分公司", "", "", "", "", "", "", "", ""]
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "人员信息");
  XLSX.writeFile(workbook, filePath);
}

describe("personnel structure docx app", () => {
  it("calculates the same core counts as the browser logic", () => {
    const output = runPython(`
import importlib.util
import json
from pathlib import Path

path = Path(r"${appPath.replace(/\\/g, "\\\\")}")
spec = importlib.util.spec_from_file_location("personnel_app", path)
module = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = module
spec.loader.exec_module(module)

rows = [
    ["姓名", "员工号", "技术信息", "原单位", "检查员资格", "行政职务", "RAMA", "REUO", "RWAS", "EAMA", "EEUO", "EWAS"],
    ["教员甲", "100001", "777:飞行教员A", "总队777", "公司检查员", "M", 1, 1, 1, 1, 1, 1],
    ["机长乙", "100002", "777:B类机长", "777返聘", "", "", "", "", "", 1, "", 1],
    ["机长丙", "100003", "777:Z类机长", "河南分公司", "", "", "", "", "", "", "", ""],
    ["在训丁", "100004", "划转机长", "湖北分公司", "", "", "", "", "", "", "", ""],
    ["副驾戊", "100005", "777:A2类副驾驶", "总队777", "", "", "", "", "", 1, 1, ""],
    ["转机己", "100006", "划转副驾驶", "新疆分公司（借）", "", "", "", "", "", "", "", ""],
    ["机长庚", "100007", "777:D类机长", "火星分公司", "", "", "", "", "", "", "", ""],
]
records = []
header = rows[0]
for row in rows[1:]:
    values = dict(zip(header, row))
    records.append(module.PersonnelRecord(
        employee_id=values["员工号"],
        name=values["姓名"],
        tech_info=values["技术信息"],
        origin=values["原单位"],
        inspector_qualification=values["检查员资格"],
        management_role=values["行政职务"],
        qualifications={code: bool(values.get(code)) for code in module.QUALIFICATION_CODES},
    ))
result = module.calculate(records)
sections = {section.title: {item.label: item.count for item in section.items} for section in result.sections}
print(json.dumps({
    "total": result.total_people,
    "registered": result.registered_crew_count,
    "management_denominator": result.sections[1].items[0].denominator,
    "route_other": sections["机长航线资格占比"]["其他"],
    "origin_other": sections["空勤人员原单位情况"]["其他"],
}, ensure_ascii=False))
`);
    const result = JSON.parse(output);
    expect(result).toEqual({
      total: 34,
      registered: 5,
      management_denominator: 7,
      route_other: 1,
      origin_other: 1
    });
  });

  it("fills the first flight department docx tables and keeps output separate", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "personnel-docx-"));
    const excelPath = path.join(tempDir, "personnel.xlsx");
    const outputPath = path.join(tempDir, "filled.docx");
    createSampleWorkbook(excelPath);

    const templatePath = resolveFromRoot("1111.docx");
    if (!fs.existsSync(templatePath)) return;

    execFileSync("python", [
      appPath,
      "--excel",
      excelPath,
      "--docx",
      templatePath,
      "--month",
      "5",
      "--output",
      outputPath
    ], {
      cwd: resolveFromRoot(),
      stdio: "pipe"
    });

    expect(fs.existsSync(outputPath)).toBe(true);
    const output = runPython(`
from docx import Document
doc = Document(r"${outputPath.replace(/\\/g, "\\\\")}")
values = [
    doc.tables[0].rows[1].cells[5].text,
    doc.tables[2].rows[2].cells[0].text,
    doc.tables[3].rows[-1].cells[5].text,
]
print("\\n".join(value.encode("unicode_escape").decode("ascii") for value in values))
`);
    expect(output).toContain("1");
    expect(output).toContain("\\u6559\\u5458 / \\uff081\\uff09");
  });

  it("clears month, change and percent cells before writing new docx values", () => {
    const templatePath = resolveFromRoot("1111.docx");
    if (!fs.existsSync(templatePath)) return;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "personnel-docx-clear-"));
    const excelPath = path.join(tempDir, "personnel.xlsx");
    const dirtyTemplatePath = path.join(tempDir, "dirty.docx");
    const outputPath = path.join(tempDir, "filled.docx");
    createSampleWorkbook(excelPath);

    runPython(`
from docx import Document
doc = Document(r"${templatePath.replace(/\\/g, "\\\\")}")
row = doc.tables[0].rows[1]
row.cells[5].text = "old-month"
row.cells[6].text = "old-change"
row.cells[7].text = "old-percent"
doc.save(r"${dirtyTemplatePath.replace(/\\/g, "\\\\")}")
`);

    execFileSync("python", [
      appPath,
      "--excel",
      excelPath,
      "--docx",
      dirtyTemplatePath,
      "--month",
      "5",
      "--output",
      outputPath
    ], {
      cwd: resolveFromRoot(),
      stdio: "pipe"
    });

    const output = runPython(`
from docx import Document
doc = Document(r"${outputPath.replace(/\\/g, "\\\\")}")
row = doc.tables[0].rows[1]
print(row.cells[5].text)
print(row.cells[6].text.encode("unicode_escape").decode("ascii"))
print(row.cells[7].text)
`);
    expect(output).not.toContain("old-month");
    expect(output).not.toContain("old-change");
    expect(output).not.toContain("old-percent");
    expect(output).toContain("1");
    expect(output).toContain("14%");
  });

  it("opens the tkinter gui when app.py runs without arguments", () => {
    const output = runPython(`
import importlib.util
from pathlib import Path

path = Path(r"${appPath.replace(/\\/g, "\\\\")}")
spec = importlib.util.spec_from_file_location("personnel_app", path)
module = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = module
spec.loader.exec_module(module)

called = {}
def fake_gui():
    called["ok"] = True
    return 0

module.run_gui = fake_gui
code = module.main([])
print(code)
print(called.get("ok"))
`);
    expect(output).toContain("0");
    expect(output).toContain("True");
  });

});
