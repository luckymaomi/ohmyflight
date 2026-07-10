# 技术资料页面参考

本参考只记录已验证的 IEB 技术资料页面事实。页面仍可能变更；每次正式批量前必须小样本验证。

## 查询与弹窗

资料管理页搜索框：

- Role：`textbox`
- Name：`员工号或姓名简拼`

查询按钮：

- Role：`button`
- Name：`查询`

员工链接：

- Role：`link`
- Name：员工号，例如 `181558`

个人信息弹窗关闭：

- Selector：`.pilotInfo-dialog-close`

推荐批量循环：

```python
open_material_management(page)
for record in records:
    search_employee(page, record["员工号"])
    tech_rows = read_table(page, "技术等级", "#qualList")
    oper_rows = read_table(page, "运行资格", "#showSingleEmpOperQualList")
    append_rows_and_save(output_xlsx, record, tech_rows, oper_rows)
    page.locator(".pilotInfo-dialog-close").first.click()
```

## 已验证表格

技术等级容器 `#qualList`：

| 字段 | 说明 |
|---|---|
| # | 页面序号 |
| 技术等级代码 | 如 `CAPT`、`CAPB`、`CAPZ`、`CAPC`、`FOD2` |
| 技术等级 | 如 `飞行教员`、`Z类机长`、`D2类副驾驶` |
| 水平等级 | A/B 等，可为空 |
| 机型 | 777/330/320 等，可为空 |
| 生效时间 | 业务日期 |
| 失效时间 | 业务日期，可为空 |
| 对应检查记录 | 通常为按钮文本 `添加 查看` |
| 数据来源 | 如 `南航` |

运行资格容器 `#showSingleEmpOperQualList`：

| 字段 | 说明 |
|---|---|
| 类型 | 常见为 `英语通信资格`、`区域航线资格`、`其他`；页面用 `rowspan` |
| 运行资格代码 | 如 `REUO`、`RSEA`、`RMAR`、`RWAS`、`RNP` |
| 运行资格 | 如 `除俄罗斯外的欧洲区域单飞资格` |
| 水平等级 | 可为空 |
| 机型 | 可为空 |
| 生效时间 | 业务日期 |
| 失效时间 | 业务日期，可为空 |
| 备注 | 可为空或 `PL` |

## HTML 表格解析要点

门户表格经常把表头和数据拆成两个 table：

```text
container
  .hDiv table thead tr th
  .bDiv table tbody.list tr td
```

解析时要构造网格并处理 `rowspan`：

```python
active = {}
for tr in table.find_all("tr"):
    values = []
    col = 0
    for cell in tr.find_all(["th", "td"], recursive=False):
        while col in active:
            values.append(active[col].text)
            active[col].rows_left -= 1
            if active[col].rows_left == 0:
                del active[col]
            col += 1
        text = clean(cell.get_text(" ", strip=True))
        rowspan = int(cell.get("rowspan") or 1)
        colspan = int(cell.get("colspan") or 1)
        for offset in range(colspan):
            values.append(text)
            if rowspan > 1:
                active[col + offset] = Rowspan(text, rowspan - 1)
        col += colspan
```

## 责任名单匹配口径

当用户要求基于 `zeren.xlsx` 和抓取明细生成同格式表时，已验证输出列为：

```text
员工号, 姓名, 原单位, Z类机长日期, 发布日期, 实际日期, 获取区域, 获取周期
```

当前已确认口径：

- `Z类机长日期`：只看 `机型=777` 的技术等级；优先取最早 `CAPZ` 生效时间；没有 777 `CAPZ` 时取最早 777 `FOD2` 生效时间。
- `获取区域`：运行资格中 `机型=777`、`类型=区域航线资格` 且 `运行资格` 含 `单飞`。
- `实际日期`：命中的单飞资质生效时间。
- 最近匹配：按 `abs(单飞资质生效时间 - 发布日期)` 排序，取最近日期；同一最近日期有多条时全部输出。
- `获取周期`：用源表发布日期减 `Z类机长日期`，按年月日和总天数展示。

不要把这些口径写死到通用门户抓取脚本中；只在责任名单任务或用户明确确认时使用。
