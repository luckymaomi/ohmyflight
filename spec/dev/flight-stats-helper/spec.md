# 飞行经历与左座经历统计开发规格

## 产品边界

`flight-stats-helper` 是可独立下载运行的 Python + Playwright APP，人工登录飞行门户后，按人员和日期区间批量查询飞行经历或左座经历及起落数，并写入本地 Excel。静态网页只负责说明和分发 `app.py` 与查询模板。

## 输入契约

- 查询模式为飞行经历或左座经历。
- 数据可由 Excel 模板导入或直接粘贴；每条记录必须包含员工号、姓名、开始日期、结束日期。
- 员工号和日期无效的记录不得进入页面查询。
- 可用白名单限制实际处理人员；过滤后的结果必须能追溯到原输入。

## 自动化链路

- 启动 Chromium 后由用户完成人工登录并进入目标页面。
- APP 按输入顺序逐人设置查询对象和日期范围，分别读取经历值与起落总数。
- 页面操作必须触发目标系统实际依赖的输入或选择事件，不能只改 DOM 显示文本。
- 单人查询失败时记录错误并继续处理后续人员；脚本定位为静默批处理，不因普通单条错误长期暂停。
- 内网页面结构、选择器或登录流程变化时应明确失败，不能把空值写成成功结果。

## 输出契约

- 新建结果 Excel，不覆盖输入文件。
- 每条结果至少保留员工号、姓名、起始时间、截止时间、所选经历值和起落总数。
- 错误记录进入最终报告，成功与失败数量可核对。

## 运行与维护

- 页面：`public/tool/app/flight-stats-helper/index.html`
- 分发 APP：`public/tool/app/flight-stats-helper/app.py`
- 构建源 APP：`src/tool/app/flight-stats-helper/app.py`
- 页面壳逻辑：`src/tool/app/flight-stats-helper/shell.ts`
- 依赖为 Python 3.7+、Playwright、openpyxl、colorama，并需安装 Chromium。
- 当前没有独立自动化测试；门户不可访问时以脚本、用户日志和本地输入输出为验证证据。

