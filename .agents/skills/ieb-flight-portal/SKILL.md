---
name: ieb-flight-portal
description: IEB/飞行门户 Playwright 自动化经验，适用于资质管理、飞行训练、技术资料、资料管理、个人技术等级、运行资格等页面的探测、批量抓取、Excel 逐行写回和样例核对；当任务涉及 https://ieb.csair.com、飞行门户、员工号查询、技术等级/运行资格表格、区域航线资格、单飞资质、内网页面录制脚本稳定化时使用。
---

# IEB Flight Portal

本 skill 记录 IEB 飞行门户“技术资料/资料管理”自动化的已验证页面事实和工作方式。使用前仍要先按 `.agents/skills/playwright-probe/SKILL.md` 做探针验证；本 skill 只提供该门户的领域路径、稳定选择器、表格结构和常见坑。

## 组合使用

- 先读 `AGENTS.md`。
- 同时使用 `playwright-probe`：录制脚本是第一事实来源，先小样本验证，再批量。
- 涉及 Excel 读写时同时使用 `excel-dev`：日期按业务日期处理，员工号按文本处理，逐人写回保存。
- 如果用户给了对照 Excel，先跑 1 到 3 人样例，把页面抽取结果和用户对照表逐字段比对。

## 已验证入口

常用路径：

```python
page.goto("https://ieb.csair.com/login")
page.locator("#scanLogin").click()
# 登录后进入首页；失败时允许人工扫码后回车继续。
page.get_by_text("资质管理").nth(1).click()
page.get_by_text("飞行训练").nth(1).click()
page.get_by_role("link", name="技术资料").click()
page.get_by_role("link", name="资料管理").click()
```

有些录制脚本会直接点击 `飞行训练` 两次而不点 `资质管理`；以用户当次录制路径为第一事实，但稳定脚本中要在失败时允许人工进入资料管理页继续。

## 资料管理查询模式

推荐批量模式：

1. 登录后只进入一次“资料管理”。
2. 每个人在列表页清空“员工号或姓名简拼”输入框，填员工号，点“查询”。
3. 点员工号链接打开个人信息弹窗。
4. 在弹窗内读取“技术等级”和“运行资格”。
5. 点击 `.pilotInfo-dialog-close` 关闭弹窗，回到同一个资料管理列表页查下一个。

不要每个人都 `goto` 首页重新进菜单；这慢且更容易触发页面状态问题。

稳定输入示例：

```python
textbox = page.get_by_role("textbox", name="员工号或姓名简拼")
textbox.wait_for(state="visible", timeout=12000)
textbox.click()
textbox.fill("")
textbox.type(emp_id, delay=20)
page.get_by_role("button", name="查询").click()
page.get_by_role("link", name=emp_id).wait_for(timeout=10000)
page.get_by_role("link", name=emp_id).click()
```

关闭弹窗：

```python
page.locator(".pilotInfo-dialog-close").first.click(timeout=5000)
page.wait_for_timeout(600)
```

## 页面结构

技术等级：

- 标签：`page.get_by_role("link", name="技术等级")`
- 容器：`#qualList`
- 表头：`#`、`技术等级代码`、`技术等级`、`水平等级`、`机型`、`生效时间`、`失效时间`、`对应检查记录`、`数据来源`
- 示例代码：`CAPT`、`CAPB`、`CAPZ`、`CAPC`、`FOD2`、`FOD1`、`S/T`

运行资格：

- 标签：`page.get_by_role("link", name="运行资格")`
- 容器：`#showSingleEmpOperQualList`
- 表头：`类型`、`运行资格代码`、`运行资格`、`水平等级`、`机型`、`生效时间`、`失效时间`、`备注`
- `类型` 列常用 `rowspan` 跨行；Excel 导出常把延续行留空。解析时应按 HTML 表格语义填充跨行值，不能按可见文本切词。

如果点击标签后容器未出现，不要立刻判失败；最多等待 8 秒并重试一次标签点击。曾出现过标签短暂 hidden、容器慢加载的问题。

## 表格解析

优先解析容器内的两个 table：

- 第一个 table 通常是表头。
- 第二个 table 通常是 `tbody.list` 数据。
- 必须支持 `rowspan`、`colspan`。

通用规则：

- 按表头映射单元格，不靠列号写业务逻辑。
- 读取日期后统一成 `YYYY-MM-DD` 或 Python `date`。
- “添加 查看”这类按钮列可保留为文本，不用于核心业务判断。
- 如果表格为空或容器不存在，保存 HTML、截图、可见文本后再判断，不要凭截图猜。

## Excel 批量写回

批量抓取时：

- 输出一张明细表即可：每条技术等级/运行资格一行。
- 每处理完一个员工立刻打开 workbook、追加行、保存、关闭。
- 失败也写一行，包含员工号、姓名、失败状态、错误说明、抓取时间。
- 不要最后一次性保存；浏览器或登录中断时会丢数据。
- 用户中断后如果浏览器已关闭，不要让循环继续给剩余人员批量写 `Target page closed` 失败；应停止或覆盖重跑。

## 业务口径示例

责任名单场景已验证过这些口径：

- `Z类机长日期`：优先取技术等级中最早的 `CAPZ` 生效时间；没有 `CAPZ` 时，`FOD2 / D2类副驾驶` 可按用户确认等同使用，取最早 `FOD2` 生效时间。
- `获取区域`：在运行资格中找“区域航线资格”且名称含“单飞”的资质。
- `实际日期`：填命中的单飞资质生效时间。
- “最近单飞资质”口径：不设固定窗口，按与源表发布日期的绝对天数差排序，取最近的一条；若同一最近日期有多条资质，全部用 `；` 连接。
- `获取周期`：从 `Z类机长日期` 到源表 `发布日期` 计算，格式可用 `X年Y个月Z天（N天）`。

业务口径必须以用户当次确认优先。上述规则是已确认案例，不代表所有飞行门户任务默认都这样算。

## 常见坑

- PowerShell here-string 或管道里的中文路径、中文表头、中文分类名可能被编码污染成问号；验证中文字段时优先写 UTF-8 脚本文件，或用列位置/英文代码辅助核对。
- 输出 Excel 被 WPS/Excel 打开时，`openpyxl.save()` 会 `PermissionError`；让用户关闭文件后重跑，或临时输出带时间戳的新文件。
- 运行资格 `类型` 列 `rowspan` 会导致直接按 `td` 数量读取时错列。
- 录制脚本里的固定示例值（如 `CAPT`、`CAPB`）只能作为页面路径证据，不能硬编码成业务全集。
- 内网页面自动化要用 `headless=False`，登录失败时保留人工接管。

更多页面结构细节见 [references/technical-materials.md](references/technical-materials.md)。
