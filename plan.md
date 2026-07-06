# 审计之王 PDF 证据工作区 Plan

## 1. 需求文档

用户要解决的实际问题：审计篮子里已经有人工确认过的依据原文，下一步需要在多份文字型 PDF 手册中定位相应页面、人工核对页面内容、选择页码范围，并把每个编号对应的 PDF 证据导出。

谁会使用：审计之王使用者。

用户完成任务时应该看到什么体验：PDF 区域在页面最下方。用户上传多份 PDF 后，可以从当前审计篮子生成证据槽，也可以按 `1.1-1.61` 生成空槽。每个槽显示编号、审计篮子原文、机器建议的 PDF 和页码、可编辑的 PDF/页码字段、识别切片对比、预览和导出入口。用户可以手工改 PDF 和页码，预览选中页面，单条导出或批量导出。

当前范围包含：前端离线读取文字型 PDF、审计篮子原文切片、PDF 页面连续窗口识别、槽位状态、审计篮子原文与 PDF 切片对比、PDF 页面预览、单条导出、勾选导出、全部导出、spec 和测试同步。

当前范围不包含：OCR、AI 语义判断、联网检索、自动生成符合性声明、把 PDF 定位结果写回审计篮子。

业务上怎样算完成：用户能从审计篮子或编号范围生成槽位；自动识别能给出候选 PDF/页码；用户能看原文与切片对比、手工改 PDF 和页码、预览页面、导出单条或 zip；核心匹配和导出选择规则有测试保护；构建、类型检查和全量测试通过。

## 2. 当前事实

已确认代码事实：审计之王源码在 `src/tool/app/audit-king/`；页面在 `public/tool/app/audit-king/index.html`；模块通过 `window.AuditKing` 装配；`main.ts` 只做 actions 绑定。

已确认测试事实：审计之王测试在 `tests/tool/audit-king/`；测试 helper 会按需构建 `dist/`。

已确认文档/spec 事实：`spec/app/audit-king.md` 已记录关键词、手册证据、审计篮子和文件夹脚本导出规则；当前需要同步 PDF 证据工作区的新事实。

已确认配置或入口事实：`public/libs/` 存在 `pdf.min.js`、`pdf.worker.min.js`、`pdf-lib.min.js`、`jszip.min.js`，可用于 PDF 文本读取、预览、页面提取和 zip 导出。

已确认当前实现事实：当前已新增简化版 PDF 页面范围定位模块，但只输出报告表，缺少槽位、预览、导出和原文/切片对比。

用户提供事实：`1.1` 对应 `飞行人员训练大纲.pdf` 第 50-51 页；`1.4` 对应 `飞行人员训练大纲.pdf` 第 36-37 页；`1.6` 对应 `运行手册（南货航）.pdf` 第 357 页。

当前缺口：PDF 区域没有按编号槽位组织；不能人工选择 PDF 和页码；不能预览 PDF 页面；不能导出页面；不能看到审计篮子原文和 PDF 切片识别对比。

仍不明确：真实 PDF 页面的显示页码是否与 PDF 内部页序完全一致，需要 owner 用实际文件人工确认；扫描件 PDF 不支持。

## 3. 失败测试

自动测试：

- 归一化保留中文、英文和数字，去掉空白、标点、页眉页脚、孤立页码、日期和列表编号。
- 依据按行和长文本切成稳定片段，短泛片段不单独决定命中。
- 页面窗口扫描支持 1 页、2 页、3 页连续窗口。
- 命中片段必须集中在同一个连续页窗内，且顺序基本一致。
- 样例 `1.1`、`1.4`、`1.6` 应按通用算法定位到对应 PDF 页码。
- 从审计篮子生成槽位时，条款和依据内容必须进入槽位。
- 从 `X.X-X.X` 范围生成空槽时，编号必须是 `1.1`、`1.2` 这种单编号。
- 自动定位只能填槽位建议和默认 PDF/页码，不能修改审计篮子。
- 原文与 PDF 切片对比必须能显示哪些片段命中、哪些片段缺失。
- 导出选择规则必须按槽位 PDF 和页码范围生成导出任务，缺 PDF 或页码时跳过并说明。
- 无文字层 PDF 应明确报错，不能静默变成未命中。

类型检查：`npm.cmd run typecheck` 必须通过。

构建命令：`npm.cmd run build` 必须通过。

页面静态检查：页面必须加载 PDF.js、PDFLib、JSZip 和新增脚本；PDF 工作区在页面底部。

真实用户路径演练：上传 PDF -> 从审计篮子生成槽位 -> 自动定位 -> 点击槽位 -> 查看原文/切片对比 -> 预览页面 -> 导出单条或批量 zip。

失败判定：槽位不能编辑、预览不显示、导出不可用、样例页码范围错误、分散片段被误判可信、任一验证命令失败，均判定未完成。

## 4. 目标

用户路径完成到：上传 PDF -> 生成槽位 -> 自动建议 PDF/页码 -> 人工核对和调整 -> 预览页面 -> 导出证据 PDF。

代码主链路接到：纯模型、PDF 读取、PDF 预览、PDF 导出、视图和 actions 分模块；入口只绑定。

状态和记录落到：`state.pdfLocator` 独立保存 PDF、槽位、结果和当前选中槽位，不污染关键词、手册证据或审计篮子。

输出呈现到：页面底部 PDF 证据工作区，左侧槽位列表，右侧对比和预览。

测试和文档同步到：新增/更新测试，更新 `spec/app/audit-king.md`。

完成判定：审计之王测试、build、typecheck、全量 test 全部通过。

## 5. 不做范围

不做 OCR 或扫描件识别。

不做 AI、语义判断或联网检索。

不自动生成符合性声明。

不把 PDF 识别结果自动写回审计篮子。

不写死 `1.1`、`1.4`、`1.6` 样例。

不在本轮做 PDF 内文字级永久高亮导出；本轮先导出选定页面 PDF。

## 6. 设计

主链路：上传 PDF -> PDF.js 抽取文字和保留 PDF 数据 -> 从审计篮子或编号范围生成槽位 -> 自动定位连续页面窗口 -> 写入槽位建议 -> 用户选择槽位 -> 右侧显示审计篮子原文、PDF 切片对比和页面预览 -> 用户手工改 PDF/页码 -> 单条导出或批量导出。

输入 -> 判断 -> 状态 -> 执行 -> 输出 -> 记录

- 输入：PDF 文件、审计篮子依据、编号范围、用户编辑的 PDF 和页码。
- 判断：PDF 是否有文字层；槽位是否有依据；页码范围是否合法；导出任务是否完整。
- 状态：`state.pdfLocator.documents` 保存 PDF；`state.pdfLocator.slots` 保存槽位；`state.pdfLocator.selectedSlotId` 保存当前槽位；`state.pdfLocator.summary` 保存统计。
- 执行：模型负责归一化、切片、定位、对比和导出任务构建；reader 负责 PDF 读取；preview 负责 canvas 预览；export 负责 PDFLib/JSZip 导出；view 负责 DOM；actions 负责事件。
- 输出：槽位列表、对比面板、PDF 页面预览、导出的 PDF/zip。
- 记录：spec 记录当前规则；测试保护核心算法和导出任务。

模块边界：

- `pdf-locator-model.ts`：纯规则，归一化、切片、槽位生成、窗口扫描、对比、导出任务构建。
- `pdf-locator-reader.ts`：PDF.js 读取多 PDF 页面文本和保留导出用数据。
- `pdf-locator-preview.ts`：按槽位 PDF 和页码范围渲染预览 canvas。
- `pdf-locator-export.ts`：按导出任务提取页面，单条输出 PDF，多条输出 zip。
- `pdf-locator-view.ts`：渲染 PDF 工作区、槽位、对比和预览容器。
- `pdf-locator-actions.ts`：绑定上传、生成槽位、定位、编辑、预览、导出。
- `runtime.d.ts`、`state.ts`、`main.ts`、`view.ts`、`index.html`：类型、状态和入口接线。

文件职责：规则、数据读写、渲染展示、外部接线、导出能力分开，不把 PDF 工作区塞进主 `view.ts`。

错误、恢复、中断、重试边界：无 PDF、无审计篮子、无文字层、页码越界、槽位缺字段时给出提示；用户修改字段后可重新预览和导出。

## 7. 实施任务

- [x] T001 保留并扩展核心定位测试；文件/模块：`tests/tool/audit-king/pdf-locator-model.test.ts`。
- [x] T002 扩展模型为槽位、对比和导出任务；文件/模块：`pdf-locator-model.ts`。
- [x] T003 扩展 PDF reader 保存预览/导出所需数据；文件/模块：`pdf-locator-reader.ts`、`runtime.d.ts`。
- [x] T004 新增 PDF 预览模块；文件/模块：`pdf-locator-preview.ts`。
- [x] T005 新增 PDF 导出模块；文件/模块：`pdf-locator-export.ts`。
- [x] T006 重做 PDF 工作区 UI；文件/模块：`index.html`、`pdf-locator-view.ts`。
- [x] T007 重做 PDF actions；文件/模块：`pdf-locator-actions.ts`。
- [x] T008 同步 spec；文件/模块：`spec/app/audit-king.md`。
- [x] T009 完整验证；命令：审计之王测试、build、typecheck、全量 test。

## 8. 验证计划

相关局部测试：

```powershell
npx.cmd vitest run tests/tool/audit-king/pdf-locator-model.test.ts tests/tool/audit-king/pdf-locator-reader.test.ts
npx.cmd vitest run tests/tool/audit-king
```

完整验证命令：

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

构建检查：确认 `dist/tool/app/audit-king/` 生成 PDF locator model、reader、view、actions、preview、export 脚本。

页面入口检查：确认 `index.html` 加载 `pdf.min.js`、`pdf-lib.min.js`、`jszip.min.js` 和新增脚本。

文档同步检查：`spec/app/audit-king.md` 记录 PDF 证据工作区，且不描述 OCR、AI、自动写回审计篮子为当前能力。

未验证内容：真实浏览器中的 PDF 页面渲染视觉效果和真实 PDF 页序需要 owner 人工确认。

剩余风险：部分 PDF 文字层顺序异常会影响自动定位；扫描件 PDF 不支持；本轮导出选定页面，不做文字级高亮写回。

## 9. 收口

目标是否完成：已完成。PDF 区域已从简化报告表改为底部 PDF 证据工作区，支持槽位、原文/切片对比、页面预览和页面导出。

失败测试是否变绿：已变绿。新增和扩展测试覆盖定位、槽位生成、编号范围、切片对比、导出任务和无文字层 PDF 提示。

改了哪些文件：新增 `pdf-locator-preview.ts`、`pdf-locator-export.ts`；扩展 `pdf-locator-model.ts`、`pdf-locator-reader.ts`、`pdf-locator-view.ts`、`pdf-locator-actions.ts`、`runtime.d.ts`、`state.ts`、`main.ts`、`index.html`、`spec/app/audit-king.md` 和 PDF locator 测试。

跑了哪些验证：`npx.cmd vitest run tests/tool/audit-king/pdf-locator-model.test.ts tests/tool/audit-king/pdf-locator-reader.test.ts` 通过；`npx.cmd vitest run tests/tool/audit-king` 12 个测试文件、82 个测试通过；`npm.cmd run typecheck` 通过；`npm.cmd run build` 通过；`npm.cmd test` 37 个测试文件、156 个测试通过。

哪些内容没有验证：真实浏览器中 PDF 页面 canvas 预览的视觉效果、真实 PDF 页序和 owner 实际样本导出结果需要人工检查。

剩余风险：扫描件 PDF 不支持；文字层顺序异常会影响自动识别；本轮导出选定页面 PDF，不做文字级高亮写回。

是否 commit / push：未 commit，未 push。
