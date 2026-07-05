# 第二轮工具职责拆分 Plan

## 1. 需求文档

用户要解决的实际问题：上一轮已经拆掉审计之王最重的入口文件，现在剩余几个前端工具仍存在 main 文件职责混杂。继续维护时，如果上传读取、状态管理、渲染、导出和页面事件都挤在一个文件里，后续改功能容易牵动无关代码。

谁会使用：项目 owner、后续维护者和 agent。

本轮目标体验：PDF 盖章、酒店皇帝、珠海皇帝、航线班次统计的关键业务逻辑先有测试保护，再把入口文件拆成清楚的小模块。拆分后页面行为、导出结构和业务口径不变。

当前范围包含：

- `src/tool/app/pdf-stamp`
- `src/tool/app/hotel-bill-check`
- `src/tool/app/session-bill-check`
- `src/tool/app/crew-flight-stats`
- 对应 `public/tool/app/*/index.html`
- 对应 `tests/tool/*`
- 必要时同步 `spec/app/*`

当前范围不包含：培训皇帝拆分、Python 单文件工具拆分、页面 UI 重设计、业务规则变化、导出字段变化、工具下线。

业务上怎样算完成：四个工具的核心逻辑有测试保护；确认需要拆的 main 文件被拆成单一职责模块；HTML 脚本顺序正确；构建、类型检查、相关局部测试和全量测试通过；最终提交和推送。

## 2. 当前事实

已确认工作区事实：开始本轮时 `git status --short --branch` 显示 `## master...origin/master`，工作区干净。

已确认构建事实：本项目构建脚本把 `src/**/*.ts` 单独编译为无模块全局脚本，输出到 `dist/`；拆分后必须通过 `window.<工具命名空间>` 或全局声明装配，并更新页面脚本加载顺序。

已确认 PDF 盖章事实：`src/tool/app/pdf-stamp/main.ts` 约 24KB，同时处理上传、状态、规则渲染、页面预览、拖拽缩放、导出和下载；`logic.ts` 只覆盖规则创建、页码匹配和绘制坐标；现有测试只有 `tests/tool/pdf-stamp/logic.test.ts`。

已确认酒店皇帝事实：`src/tool/app/hotel-bill-check/main.ts` 约 19KB，同时处理文件读取、预览渲染、列选择、匹配触发、结果渲染和 Excel 导出；`logic.ts` 已覆盖日期解析、匹配、入住证明链接列；现有测试 `tests/tool/hotel-bill-check/export.test.ts` 覆盖多链接导出。

已确认珠海皇帝事实：`src/tool/app/session-bill-check/main.ts` 约 14KB，主要包含页面状态、文件读取、汇总渲染、图表渲染、表格渲染、详情渲染和导出触发；`logic.ts` 已覆盖场次/账单解析、比对和导出 workbook；现有测试 `tests/tool/session-bill-check/logic.test.ts` 保护核心业务口径。

已确认航线班次统计事实：`src/tool/app/crew-flight-stats/main.ts` 约 14KB，同时处理默认花名册加载、文件读取、sheet 选择、统计触发、结果渲染、导出和附加姓名识别小表；`logic.ts` 已覆盖花名册解析、排班统计、导出行和按文本顺序识别姓名；现有测试 `tests/tool/crew-flight-stats/logic.test.ts` 保护核心统计口径。

判断：PDF 盖章拆分前需要补更强的纯逻辑测试；酒店皇帝、珠海皇帝、航线班次统计已有业务逻辑测试，可以补轻量入口/渲染辅助测试后拆 main。

## 3. 失败测试

PDF 盖章：

- 补测试覆盖规则字段更新、锁定比例时宽高联动、拖拽移动换算、拖拽缩放换算、导出应匹配的页码和规则数量。
- 拆分后 `npx.cmd vitest run tests/tool/pdf-stamp` 必须通过。

酒店皇帝：

- 现有多入住证明链接导出测试必须继续通过。
- 拆分后 `npx.cmd vitest run tests/tool/hotel-bill-check` 必须通过。

珠海皇帝：

- 现有姓名拆分、大小写匹配、人次数比对、导出 sheet 测试必须继续通过。
- 拆分后 `npx.cmd vitest run tests/tool/session-bill-check` 必须通过。

航线班次统计：

- 现有花名册解析、排班统计、未匹配提示和导出行测试必须继续通过。
- 拆分后 `npx.cmd vitest run tests/tool/crew-flight-stats` 必须通过。

完整失败判定：任一页面缺少新脚本、任一业务测试失败、`npm.cmd run build` 失败、`npm.cmd run typecheck` 失败、`npm.cmd test` 失败，都判定任务未完成。

## 4. 目标

PDF 盖章目标：把 `main.ts` 收敛为初始化和模块装配；规则动作、上传读取、预览画布、拖拽缩放和导出动作拆开；核心换算逻辑有测试保护。

酒店皇帝目标：把文件读取/预览、结果渲染、Excel 导出从 `main.ts` 分离；保持页面结果和 Excel 导出结构不变。

珠海皇帝目标：把视图渲染、文件动作、入口装配拆开；业务比对仍留在 `logic.ts`。

航线班次统计目标：把文件动作、sheet 选择和结果渲染、附加姓名识别小表拆开；统计逻辑仍留在 `logic.ts`。

完成判定：相关局部测试、build、typecheck、全量 test 全部通过。

## 5. 不做范围

不改变业务口径。

不改变 Excel 导出字段、sheet 名和可点击链接结构。

不拆 Python 单文件工具。

不为了行数拆分职责清楚的 logic 文件。

不做页面视觉重设计。

## 6. 设计

通用拆分方式：每个工具建立本工具命名空间，例如 `window.PdfStampApp`、`window.HotelBillCheck`、`window.SessionBillCheck`、`window.CrewFlightStatsApp`。每个拆分文件向命名空间挂载一个职责对象，`main.ts` 只负责创建上下文、绑定动作和首次渲染。

类型方式：需要跨文件共享的状态、元素和 API 类型放在对应 `runtime.d.ts`，避免在多个 `.ts` 里复制类型。

测试方式：业务规则测试继续从 `dist/` 加载构建脚本；改完 `src` 后先 `npm.cmd run build`，再跑局部 vitest。PDF 盖章新增测试优先打到 `logic.ts` 的纯函数，不写脆弱 DOM 细节测试。

PDF 盖章模块边界：

- `runtime.d.ts`：状态、规则、元素、上下文和命名空间类型。
- `app-context.ts`：创建状态、读取元素、状态提示和通用刷新。
- `rule-actions.ts`：添加、删除、复制、字段变更和规则列表渲染。
- `canvas-actions.ts`：页面渲染、预览覆盖层、翻页和拖拽缩放。
- `upload-actions.ts`：PDF 和图片上传读取。
- `export-actions.ts`：PDF 导出和下载。
- `main.ts`：初始化并绑定模块。

酒店皇帝模块边界：

- `runtime.d.ts`：状态、类型和命名空间。
- `app-context.ts`：状态、元素和通用读取。
- `file-actions.ts`：Excel 文件读取、表头预览、超链接提取。
- `view.ts`：预览表、列选择、结果表渲染。
- `export-actions.ts`：Excel 导出。
- `main.ts`：事件绑定和匹配触发。

珠海皇帝模块边界：

- `runtime.d.ts` 继续承接已有运行时类型。
- `view.ts`：文件信息、汇总、图表、表格、来源详情渲染。
- `app-context.ts`：状态、元素、读取 workbook、筛选和导出。
- `main.ts`：文件输入、筛选、导出事件绑定。

航线班次统计模块边界：

- `runtime.d.ts`：状态、元素和命名空间。
- `app-context.ts`：状态、元素、状态提示和 ready 判断。
- `file-actions.ts`：默认/手动花名册、排班表读取。
- `view.ts`：sheet 选择器、警告、结果表渲染。
- `crew-extract-actions.ts`：附加姓名识别小表。
- `main.ts`：初始化和事件绑定。

## 7. 实施任务

- [x] T001 补强 PDF 盖章纯逻辑测试；验收：新增测试先覆盖待抽出的换算和规则更新逻辑。
- [x] T002 拆分 PDF 盖章入口；验收：`main.ts` 只装配模块，页面脚本顺序正确，PDF 局部测试通过。
- [x] T003 拆分酒店皇帝入口；验收：文件读取、视图、导出边界清楚，酒店局部测试通过。
- [x] T004 拆分珠海皇帝入口；验收：视图和动作分离，会话账单局部测试通过。
- [x] T005 拆分航线班次统计入口；验收：文件动作、结果视图、姓名识别分离，航线统计局部测试通过。
- [x] T006 同步 spec 或 plan 中职责事实；验收：不描述旧结构。
- [x] T007 完整验证；命令：`npm.cmd run build`、四个局部测试、`npm.cmd run typecheck`、`npm.cmd test`。
- [x] T008 提交和推送；验收：只提交本轮相关文件。

## 8. 验证计划

局部测试：

```powershell
npx.cmd vitest run tests/tool/pdf-stamp
npx.cmd vitest run tests/tool/hotel-bill-check
npx.cmd vitest run tests/tool/session-bill-check
npx.cmd vitest run tests/tool/crew-flight-stats
```

完整验证：

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

构建检查：确认四个工具的 `dist/tool/app/*/` 下生成新拆分脚本，HTML 按依赖顺序加载。

未验证内容：最终浏览器视觉和拖拽手感由 owner 人工检查。

剩余风险：PDF 盖章涉及 canvas、pdf.js 和 pdf-lib，自动测试主要保护计算和装配，真实 PDF 预览/导出仍需要人工抽查。

## 9. 收口

目标是否完成：已完成。

失败测试是否变绿：已变绿。

改了哪些文件：

- PDF 盖章：新增 `runtime.d.ts`、`app-context.ts`、`rule-actions.ts`、`canvas-actions.ts`、`upload-actions.ts`、`export-actions.ts`，重写 `main.ts` 为入口装配，并更新页面脚本顺序。
- 酒店皇帝：新增 `runtime.d.ts`、`app-context.ts`、`view.ts`、`file-actions.ts`、`export-actions.ts`，重写 `main.ts` 为入口装配，并更新页面脚本顺序。
- 珠海皇帝：新增 `app-context.ts`、`view.ts`，重写 `main.ts` 为入口装配，更新 `runtime.d.ts` 和页面脚本顺序。
- 航线班次统计：新增 `runtime.d.ts`、`app-context.ts`、`view.ts`、`file-actions.ts`、`crew-extract-actions.ts`，重写 `main.ts` 为入口装配，并更新页面脚本顺序。
- 测试：补强 `tests/tool/pdf-stamp/logic.test.ts`，调整 `tests/tool/hotel-bill-check/export.test.ts` 走新导出模块。

跑了哪些验证：

- `npm.cmd run build`
- `npx.cmd vitest run tests/tool/pdf-stamp`
- `npx.cmd vitest run tests/tool/hotel-bill-check`
- `npx.cmd vitest run tests/tool/session-bill-check`
- `npx.cmd vitest run tests/tool/crew-flight-stats`
- `npm.cmd run typecheck`
- `npm.cmd test`

验证结果：全量测试通过 34 个测试文件、137 个测试。

哪些内容没有验证：最终浏览器视觉和 PDF 真实拖拽/导出手感由 owner 人工检查。

剩余风险：PDF 盖章真实 PDF 渲染依赖 pdf.js 和 pdf-lib，自动测试保护核心计算与装配，真实文件导出仍建议用一个小 PDF 抽查。

是否 commit / push：已执行。
