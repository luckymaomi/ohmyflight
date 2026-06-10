import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { resolveFromRoot } from "../helpers/paths";

function runPythonCheck(script: string) {
  expect(() =>
    execFileSync("python", ["-c", script], {
      cwd: resolveFromRoot(),
      stdio: "pipe"
    })
  ).not.toThrow();
}

describe("lock entry helper app.py original helper", () => {
  it("parses pasted lock records with employee, leave type and date range", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

path = Path("public/tool/app/lock-entry-helper/app.py")
spec = importlib.util.spec_from_file_location("lock_app", path)
module = importlib.util.module_from_spec(spec)
sys.modules["lock_app"] = module
spec.loader.exec_module(module)

record = module.parse_single_record("282119 陈坤淋 PARENT_LVE 2026-06-13 2026-06-20")

assert record["员工号"] == "282119", record
assert record["姓名"] == "陈坤淋", record
assert record["请假类型"] == "PARENT_LVE", record
assert record["开始日期"] == "2026-06-13", record
assert record["结束日期"] == "2026-06-20", record
`);
  });

  it("filters batch records by whitelist", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

path = Path("public/tool/app/lock-entry-helper/app.py")
spec = importlib.util.spec_from_file_location("lock_app", path)
module = importlib.util.module_from_spec(spec)
sys.modules["lock_app"] = module
spec.loader.exec_module(module)

text = "\n".join([
    "282119 陈坤淋 PARENT_LVE 2026-06-13 2026-06-20",
    "186640 郭岛 RECU_LVE 2026-06-21 2026-06-30",
])
records, errors = module.parse_batch_input(text, {"282119"})

assert len(records) == 1, records
assert records[0]["员工号"] == "282119", records
assert errors == [], errors
`);
  });

  it("matches portal results by current record and writes result Excel", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path
from openpyxl import load_workbook

path = Path("public/tool/app/lock-entry-helper/app.py")
spec = importlib.util.spec_from_file_location("lock_app", path)
module = importlib.util.module_from_spec(spec)
sys.modules["lock_app"] = module
spec.loader.exec_module(module)

record = module.parse_single_record("282119 陈坤淋 PARENT_LVE 2026-06-13 2026-06-20")
good = {
    "锁班结果": "待审批",
    "员工号": "282119",
    "姓名": "陈坤淋",
    "开始日期": "2026-06-13 08:59:00",
    "结束日期": "2026-06-20 19:59:00",
    "锁班类型": "探亲假-探父母",
    "_text": "待审批 | 282119 | 陈坤淋 | 2026-06-13 08:59:00 | 2026-06-20 19:59:00 | 探亲假-探父母",
}
wrong = dict(good, 员工号="186640", 姓名="郭岛")

assert module.result_row_matches_record(good, record)
assert not module.result_row_matches_record(wrong, record)

output_file = module.create_result_excel("app_test")
try:
    module.append_result_excel(output_file, 1, record, "冲突", good, "已有锁班")
    workbook = load_workbook(output_file)
    sheet = workbook.active
    headers = [cell.value for cell in sheet[1]]
    row = [cell.value for cell in sheet[2]]
    workbook.close()
finally:
    Path(output_file).unlink(missing_ok=True)

assert headers == module.RESULT_HEADERS, headers
assert row[0] == 1, row
assert row[1] == "282119", row
assert row[6] == "冲突", row
assert row[12] == "已有锁班", row
assert row[14:18] == ["是", "是", "是", "是"], row
`);
  });

  it("accepts portal medical check display suffix and trimmed name notes", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

path = Path("public/tool/app/lock-entry-helper/app.py")
spec = importlib.util.spec_from_file_location("lock_app", path)
module = importlib.util.module_from_spec(spec)
sys.modules["lock_app"] = module
spec.loader.exec_module(module)

record = module.parse_single_record("901785 张宇强(09.16转入) MEDL_CHK 2026-07-06 2026-07-06")
row = {
    "锁班结果": "待审批",
    "员工号": "901785",
    "姓名": "张宇强",
    "部门": "(CAN)飞行部",
    "开始日期": "2026-07-06 08:59:00",
    "结束日期": "2026-07-06 19:59:00",
    "锁班天数": "1",
    "锁班类型": "体检_临床(占值勤期类别)",
    "锁班原因": "张峻哲(295494):体检_临床(占值勤期类别)",
    "_text": "待审批 | 901785 | 张宇强 | (CAN)飞行部 | 2026-07-06 08:59:00 | 2026-07-06 19:59:00 | 1 | 体检_临床(占值勤期类别)",
}

assert module.result_row_matches_record(row, record)
assert module.names_match("张宇强(09.16转入)", "张宇强")
assert module.leave_types_match("MEDL_CHK", "体检_临床(占值勤期类别)")
`);
  });
});

describe("lock entry helper superapp.py concurrent helper", () => {
  it("filters Excel records by whitelist before concurrent processing", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
import tempfile
from pathlib import Path
from openpyxl import Workbook

path = Path("public/tool/app/lock-entry-helper/superapp.py")
spec = importlib.util.spec_from_file_location("superapp", path)
module = importlib.util.module_from_spec(spec)
sys.modules["superapp"] = module
spec.loader.exec_module(module)

workbook = Workbook()
sheet = workbook.active
sheet.append(["员工号", "姓名", "锁班类型", "开始日期", "结束日期"])
sheet.append(["282119", "陈坤淋", "PARENT_LVE", "2026-06-13", "2026-06-20"])
sheet.append(["186640", "郭岛", "RECU_LVE", "2026-06-21", "2026-06-30"])
with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as file:
    temp_path = file.name
workbook.save(temp_path)
workbook.close()

records, errors = module.read_excel_records(temp_path, {"282119"})
Path(temp_path).unlink()

assert errors == [], errors
assert len(records) == 1, records
assert records[0].sequence == 1, records
assert records[0].employee_id == "282119", records
`);
  });

  it("aligns portal rows that include a visible sequence cell", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

path = Path("public/tool/app/lock-entry-helper/superapp.py")
spec = importlib.util.spec_from_file_location("superapp", path)
module = importlib.util.module_from_spec(spec)
sys.modules["superapp"] = module
spec.loader.exec_module(module)

headers = ["锁班结果", "员工号", "姓名", "部门", "开始日期", "结束日期", "锁班天数", "锁班类型", "锁班原因"]
values = ["1", "待审批", "282119", "陈坤淋", "(CAN)飞行部", "2026-06-13 08:59:00", "2026-06-20 19:59:00", "8", "探亲假-探父母", "super test"]
aligned = module.align_table_values(headers, values)

assert aligned[0] == "待审批", aligned
assert aligned[1] == "282119", aligned
assert aligned[2] == "陈坤淋", aligned
`);
  });

  it("matches only the current person, leave type and date range", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

path = Path("public/tool/app/lock-entry-helper/superapp.py")
spec = importlib.util.spec_from_file_location("superapp", path)
module = importlib.util.module_from_spec(spec)
sys.modules["superapp"] = module
spec.loader.exec_module(module)
record = module.LockRecord(1, "282119", "陈坤淋", "PARENT_LVE", "2026-06-13", "2026-06-20")

good = {
    "锁班结果": "待审批",
    "员工号": "282119",
    "姓名": "陈坤淋",
    "部门": "(CAN)飞行部",
    "开始日期": "2026-06-13 08:59:00",
    "结束日期": "2026-06-20 19:59:00",
    "锁班天数": "8",
    "锁班类型": "探亲假-探父母",
    "锁班原因": "super test",
    "_text": "待审批 | 282119 | 陈坤淋 | (CAN)飞行部 | 2026-06-13 08:59:00 | 2026-06-20 19:59:00 | 8 | 探亲假-探父母 | super test",
}
wrong_name = dict(good, 姓名="别人", _text=good["_text"].replace("陈坤淋", "别人"))
wrong_type = dict(good, 锁班类型="健康疗养", _text=good["_text"].replace("探亲假-探父母", "健康疗养"))
wrong_date = dict(good, 开始日期="2026-06-14 08:59:00", _text=good["_text"].replace("2026-06-13", "2026-06-14"))

assert module.result_row_matches_record(good, record)
assert not module.result_row_matches_record(wrong_name, record)
assert not module.result_row_matches_record(wrong_type, record)
assert not module.result_row_matches_record(wrong_date, record)
`);
  });

  it("accepts portal medical check display suffix and trimmed name notes", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

path = Path("public/tool/app/lock-entry-helper/superapp.py")
spec = importlib.util.spec_from_file_location("superapp", path)
module = importlib.util.module_from_spec(spec)
sys.modules["superapp"] = module
spec.loader.exec_module(module)

record = module.LockRecord(1, "901785", "张宇强(09.16转入)", "MEDL_CHK", "2026-07-06", "2026-07-06")
row = {
    "锁班结果": "待审批",
    "员工号": "901785",
    "姓名": "张宇强",
    "部门": "(CAN)飞行部",
    "开始日期": "2026-07-06 08:59:00",
    "结束日期": "2026-07-06 19:59:00",
    "锁班天数": "1",
    "锁班类型": "体检_临床(占值勤期类别)",
    "锁班原因": "张峻哲(295494):体检_临床(占值勤期类别)",
    "_text": "待审批 | 901785 | 张宇强 | (CAN)飞行部 | 2026-07-06 08:59:00 | 2026-07-06 19:59:00 | 1 | 体检_临床(占值勤期类别)",
}

assert module.result_row_matches_record(row, record)
assert module.result_identity_problem(record, row) == ""
assert module.names_match("张宇强(09.16转入)", "张宇强")
assert module.leave_types_match("MEDL_CHK", "体检_临床(占值勤期类别)")
`);
  });

  it("archives swapped concurrent portal results to the correct records", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

path = Path("public/tool/app/lock-entry-helper/superapp.py")
spec = importlib.util.spec_from_file_location("superapp", path)
module = importlib.util.module_from_spec(spec)
sys.modules["superapp"] = module
spec.loader.exec_module(module)

a = module.LockRecord(1, "282119", "陈坤淋", "PARENT_LVE", "2026-06-13", "2026-06-20")
b = module.LockRecord(2, "186640", "郭岛", "RECU_LVE", "2026-06-21", "2026-06-30")

row_a = {
    "锁班结果": "待审批",
    "员工号": "282119",
    "姓名": "陈坤淋",
    "部门": "(CAN)飞行部",
    "开始日期": "2026-06-13 08:59:00",
    "结束日期": "2026-06-20 19:59:00",
    "锁班天数": "8",
    "锁班类型": "探亲假-探父母",
    "锁班原因": "super test",
    "_text": "待审批 | 282119 | 陈坤淋 | 2026-06-13 08:59:00 | 2026-06-20 19:59:00 | 探亲假-探父母",
}
row_b = {
    "锁班结果": "待审批",
    "员工号": "186640",
    "姓名": "郭岛",
    "部门": "(CAN)飞行部",
    "开始日期": "2026-06-21 08:59:00",
    "结束日期": "2026-06-30 19:59:00",
    "锁班天数": "10",
    "锁班类型": "健康疗养",
    "锁班原因": "super test",
    "_text": "待审批 | 186640 | 郭岛 | 2026-06-21 08:59:00 | 2026-06-30 19:59:00 | 健康疗养",
}

portal_results = [
    module.PortalResult(1, a, "成功", row_b, "", "", 1, 6, 7),
    module.PortalResult(2, b, "成功", row_a, "", "", 1, 6, 7),
]
matched, pending, notes = module.match_portal_results([a, b], portal_results)

assert len(matched) == 2
assert pending == []
by_seq = {result.sequence: result for result in matched}
assert by_seq[1].row["员工号"] == "282119"
assert by_seq[2].row["员工号"] == "186640"
`);
  });

  it("keeps result Excel headers focused on human verification", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

expected = [
    "序号",
    "员工号",
    "姓名",
    "锁班类型",
    "开始日期",
    "结束日期",
    "处理状态",
    "锁班结果",
    "结果姓名",
    "结果锁班类型",
    "结果开始日期",
    "结果结束日期",
    "冲突",
    "备注",
    "员工号匹配",
    "姓名匹配",
    "日期匹配",
    "类型匹配",
    "处理时间",
]

path = Path("public/tool/app/lock-entry-helper/superapp.py")
spec = importlib.util.spec_from_file_location("superapp", path)
module = importlib.util.module_from_spec(spec)
sys.modules["superapp"] = module
spec.loader.exec_module(module)
assert module.RESULT_HEADERS == expected, module.RESULT_HEADERS
`);
  });

  it("archives non-retryable info dialog errors without retrying", () => {
    runPythonCheck(String.raw`
import importlib.util
import sys
from pathlib import Path

path = Path("public/tool/app/lock-entry-helper/superapp.py")
spec = importlib.util.spec_from_file_location("superapp", path)
module = importlib.util.module_from_spec(spec)
sys.modules["superapp"] = module
spec.loader.exec_module(module)

record = module.LockRecord(1, "184790", "郭春阳", "RECU_LVE", "20026年6月12日", "2026-06-16")
portal_results = [
    module.PortalResult(1, record, "异常", {}, "", "下一步保存出错", 1, 1, 2, "下一步保存出错", False)
]
matched, pending, notes = module.match_portal_results([record], portal_results)

assert len(matched) == 1
assert pending == []
assert matched[0].status == "异常"
assert matched[0].remark == "下一步保存出错"
`);
  });
});
