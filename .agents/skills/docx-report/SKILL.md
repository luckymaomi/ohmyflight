---
name: docx-report
description: 使用 python-docx 读取、分析和修改 Word .docx 文件的通用工作流程，适用于读取段落、表格、单元格、样式，填写现有 Word 表格报告，或从 Excel/JSON 等数据源生成新的 docx。
---

# Docx Report

处理 Word `.docx` 文件时使用本 skill。

## 核心原则

优先用事实读取结果驱动操作。不要凭文件名、肉眼印象或用户口头描述猜表格结构。

库选择：

- `python-docx`：读取和修改现有 `.docx` 的段落、表格、单元格、样式。默认优先使用。
- `docxtemplater`：用于已有 `{占位符}` 的模板渲染，不作为直接修改现有表格报告的默认方案。
- 直接读取 docx 内部 XML：仅在 `python-docx` 无法处理页眉页脚、复杂字段、特殊结构时使用。

## 工作流程

1. 确认输入 `.docx` 存在，先只读不改。
2. 用 `python-docx` 输出结构：
   - 段落数量和非空段落文本
   - 表格数量
   - 每个表格的行数、列数
   - 每个表格前几行的单元格文本
3. 根据读取结果给表格编号、行号、列号，不要使用模糊定位。
4. 如果要从外部数据源填 Word，先读取数据源结构并说明字段映射。
5. 写回前默认生成新文件，不覆盖原始 docx；用户明确要求覆盖时才覆盖。
6. 写回后重新读取目标文件，核对目标段落或单元格内容已经写入。

## 常用读取脚本

```python
from pathlib import Path
from docx import Document

path = Path("input.docx")
doc = Document(path)

print("paragraphs", len(doc.paragraphs))
print("tables", len(doc.tables))

for i, paragraph in enumerate(doc.paragraphs, 1):
    text = paragraph.text.strip()
    if text:
        print(f"{i}: {text}")

for table_index, table in enumerate(doc.tables, 1):
    print(f"TABLE {table_index}: rows={len(table.rows)} cols={len(table.columns)}")
    for row_index, row in enumerate(table.rows[:10], 1):
        values = [cell.text.strip().replace("\n", " / ") for cell in row.cells]
        print(f"  {row_index}: {values}")
```

## 写回注意

- 修改表格时优先按表格编号、行号、列号定位。
- 如果表格有合并单元格，读取时同一文本可能重复出现；写入前要确认目标单元格。
- 涉及计算结果时，先说明计算口径，再写入。
- 写入后必须重新读取目标文件验证，不要只凭保存成功判断完成。
- 不要把未经核对的数据写进文档。

## 禁止事项

- 不要在没读取表格结构前直接写单元格。
- 不要直接覆盖原始文件，除非用户明确要求。
- 不要把 `docxtemplater` 当成修改现有表格文档的默认处理方式。
- 不要根据文件名或用户口头描述猜表格编号、行列位置。
