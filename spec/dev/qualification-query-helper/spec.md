# 技术等级运行资格查询助手开发规格

## 产品边界

`qualification-query-helper` 是 IEB 飞行门户只读查询 APP。用户扫码登录并进入技术资料页面后，脚本按 Excel 员工号逐人抓取技术等级和运行资格两张表，实时写入本地结果。它不修改门户资格数据。

## 输入契约

- 只接受 Excel；必需表头为 `员工号` 或 `工号`，可选表头为 `姓名`。
- 员工号必须规范为六位数字。
- 重复员工号只查询第一条，其余输入行写入处理报告，不静默丢弃。
- 姓名不作为查询键，只用于与页面姓名做一致性核对。
- 页面提供 `template.xlsx`；命令 `python app.py --create-template` 可生成同结构模板。

## 查询链路

- 先打开 IEB，由用户扫码登录并进入“资质管理 / 飞行训练 / 技术资料 / 资料管理”。
- 页面确认就绪后，才询问 Excel 路径、读取名单并创建结果文件。
- 员工定位必须使用精确员工号链接，不能按姓名猜测。
- 每人分别读取技术等级、运行资格标签内的表格，保留页面表头和值。
- 单个标签加载异常时重试一次；仍失败则写失败状态并继续下一人。
- 跨 frame、合并单元格和表格结构解析以当前已验证门户页面为边界，结构变化时输出失败证据。

## 输出契约

- `技术资料明细`：一条技术等级或运行资格记录一行，保留类别、页面字段与抓取状态。
- `处理报告`：每个输入人员一行，记录页面姓名、姓名一致性、两类记录数量、状态和说明。
- `汇总`：记录输入文件、结果文件、成功、失败、输入错误人数与中断状态。
- 每完成一人立即保存结果 Excel，并生成同名文本报告，确保中断时保留已完成结果。

## 代码与验证

- 页面：`public/tool/app/qualification-query-helper/index.html`
- APP：`public/tool/app/qualification-query-helper/app.py`
- 依赖：`public/tool/app/qualification-query-helper/requirements.txt`
- 输入模板：`public/tool/app/qualification-query-helper/template.xlsx`
- 当前没有自动化测试；探测与维护遵循 `.agents/skills/flight-portal-probe/SKILL.md`。
