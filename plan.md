# 审计之王手册证据采集 Plan

## 1. 需求文档

用户要解决的实际问题：迎审时，搜索命中摘要只能帮助定位候选位置，但真正要保存的手册证据可能是摘要本身，也可能是用户在全部详情中人工选中的更完整原文。用户需要把这些材料统一挂到当前关键词下，并能随关键词一起导入导出。

谁会使用：对照检查单、公司手册和审计篮子整理迎审依据的人工审核人员。

用户完成任务时应该看到什么体验：选中关键词后，可以从命中摘要一键加入手册证据，也可以在全部详情里选中一段原文加入手册证据；底部左侧集中显示当前关键词的手册证据，底部右侧保留独立审计篮子。

当前范围包含：统一手册证据模型；区分证据来源为摘要加入或全文选中；底部区域拆成当前关键词手册证据和审计篮子；关键词 Excel 的 `手册证据` sheet 同步导入导出证据来源和全文定位字段；手册轻微变化时按文本和上下文恢复，不能唯一确认时不乱猜。

当前范围不包含：自动判断证据是否符合条款；自动把手册证据写入审计篮子；把审计篮子改成自动生成成果；AI、语义判断、PDF/OCR、Word 写回。

业务上怎样算完成：同一个关键词下的手册证据可以来自摘要或全文选中；导出再导入后仍能恢复关键词、检查单来源和手册证据；审计篮子仍是最终人工成果，不被手册证据自动污染。

## 2. 当前事实

已确认代码事实：`AuditKingKeyword.evidences` 是统一手册证据数组；摘要卡片可加入/移出当前关键词手册证据；全部详情可把选中原文加入当前关键词手册证据；`keyword-import-export.ts` 的 `手册证据` sheet 已记录证据来源和全文定位字段；`source-locator.ts` 可按全文坐标、段落坐标、文本和上下文恢复手册证据；当前关键词手册证据已移动到底部左侧，审计篮子保留在底部右侧。

已确认测试事实：`tests/tool/audit-king` 已覆盖状态、导入导出、定位、视图、上下文加载和摘要绑定状态。

已确认文档/spec 事实：`spec/app/audit-king.md` 已记录关键词、检查单来源、手册证据、审计篮子分离，已记录摘要加入和全文选中都进入统一手册证据，已记录底部双栏布局和 Excel 字段。

已确认配置或入口事实：审计之王页面为 `public/tool/app/audit-king/index.html`；源码在 `src/tool/app/audit-king/`；测试在 `tests/tool/audit-king/`。

已确认命令输出：`npx.cmd vitest run tests/tool/audit-king` 通过 9 个测试文件、63 个测试；`npm.cmd run build` 通过；`npm.cmd run typecheck` 通过；`npm.cmd test` 通过 34 个测试文件、132 个测试。

当前已有能力：上传检查单、多手册搜索、筛选手册、命中摘要、全部详情临时扩展上下文、摘要加入手册证据、全文选中加入手册证据、关键词和手册证据 Excel 导入导出、审计篮子独立导入导出。

当前缺口：本轮需求内无已知代码缺口。

仍不明确：前端视觉效果需要 owner 人工检查；真实超大手册的长期性能仍需实际样本验证。

## 3. 失败测试

自动测试：状态测试先失败，证明手册证据能保存 `sourceType`、全文起止位置，并且摘要和全文选中都进入同一 `evidences` 数组。

自动测试：定位测试先失败，证明可以从文档全文全局坐标创建证据，并在手册轻微变化后用证据文本和上下文唯一恢复。

自动测试：Excel 测试先失败，证明 `手册证据` sheet 导出和导入 `证据来源`、`全文起点`、`全文终点`。

自动测试：视图测试先失败，证明底部左侧存在当前关键词手册证据区域，关键词池内部不再承载该区域，全部详情标题栏有“选中内容加入手册证据”入口。

类型检查：新增字段和 API 后 `runtime.d.ts`、源码和测试必须一致。

构建命令：`npm.cmd run build` 必须通过。

静态检查：spec 必须同步统一手册证据模型、证据来源、底部布局和导入导出字段。

真实用户路径演练：选择关键词 -> 点击摘要加入证据 -> 在全部详情选中原文加入证据 -> 导出关键词 -> 导入关键词 -> 查看当前关键词手册证据。

失败判定：任一核心测试失败、Excel 字段缺失、页面没有独立手册证据区、spec 描述旧结构，都判定未完成。

## 4. 目标

用户路径完成到：用户可以用摘要快速加入证据，也可以在全部详情中精确选取原文加入同一手册证据列表。

代码主链路接到：`source-locator.ts` 负责从摘要或全文范围生成稳定证据；`state.ts` 管理同一证据数组；`view.ts` 渲染底部双栏和详情标题栏按钮；`main.ts` 接 selection 事件；`keyword-import-export.ts` 读写统一证据字段。

状态和记录落到：每条手册证据记录来源、手册名、手册 ID、段落信息、全文起止、局部起止、证据文本、前文、后文、命中类型和备注。

输出呈现到：底部左侧为当前关键词手册证据，底部右侧为审计篮子；命中摘要仍可加入/移出手册证据；全部详情标题栏可把选中内容加入手册证据。

测试和文档同步到：状态、定位、导入导出、视图测试更新；`spec/app/audit-king.md` 更新。

完成判定：审计之王局部测试、构建、类型检查、全量测试全部通过。

## 5. 不做范围

不做：把摘要绑定和全文证据拆成两个长期列表。

不保留：不把手册证据继续塞在关键词池卡片内部。

不兼容：不为不存在的旧模型增加隐藏分支；当前 Excel 以新字段为事实，缺字段按空值读入。

不处理：自动合成审计篮子、自动判断符合性、PDF/OCR、Word 写回、跨浏览器持久保存。

## 6. 设计

主链路：关键词选中 -> 摘要加入或详情选中加入 -> 生成 `AuditKingManualEvidence` -> 写入当前关键词 `evidences` -> 底部手册证据刷新 -> 导出关键词 Excel `手册证据` sheet -> 导入后恢复关键词和证据 -> 上传手册后按全文坐标、文本和上下文尝试恢复。

输入 -> 判断 -> 状态 -> 执行 -> 输出 -> 记录：输入来自摘要 match 或详情 selection；判断必须选中具体关键词，详情 selection 必须在当前详情原文内；状态只写当前关键词证据数组；执行不修改审计篮子；输出刷新摘要绑定状态和底部证据列表；记录用于导入导出和恢复。

模块边界：`highlight.ts` 提供详情窗口全局偏移；`source-locator.ts` 提供摘要证据和全文选中证据创建/恢复；`state.ts` 只管理证据数组；`keyword-import-export.ts` 只管理 Excel 结构；`view.ts` 只渲染区域和控件；`main.ts` 只处理 DOM 选择和事件接线。

文件职责：`runtime.d.ts` 定义新增字段；`source-locator.ts` 处理文档全文坐标和上下文；`view.ts` 调整底部布局和详情按钮；`main.ts` 从详情 selection 生成证据；测试文件保护核心规则。

状态归属：手册证据归属关键词；审计篮子归属最终人工整理；命中摘要和详情窗口是临时视图。

数据或事件流：摘要加入保存来源 `summary`；详情选中保存来源 `selection`；导出时都进入同一 `手册证据` sheet；导入后都回到同一 `evidences` 数组。

错误、恢复、中断、重试边界：没有当前关键词、没有当前命中、选区不在详情原文内时提示错误；手册恢复不能唯一确认时保留证据但显示需人工确认；删除手册不删除证据；删除关键词删除其证据。

与现有架构的关系：沿用当前静态浏览器 runtime 模块结构和 Bootstrap 卡片布局，不引入新框架。

测试和文档影响：新增/更新状态、定位、Excel、视图测试；更新 spec。

## 7. 实施任务

- [x] T001 补状态测试：证据来源和全文定位字段进入同一证据数组；文件：`tests/tool/audit-king/state.test.ts`；验收：失败测试覆盖统一模型。
- [x] T002 补定位测试：从文档全文范围创建/恢复证据；文件：`tests/tool/audit-king/source-locator.test.ts`；验收：唯一恢复、多处不猜。
- [x] T003 补 Excel 测试：`手册证据` sheet 包含来源和全文字段；文件：`tests/tool/audit-king/keyword-import-export.test.ts`；验收：导出导入字段一致。
- [x] T004 补视图测试：底部双栏和详情选中加入入口；文件：`tests/tool/audit-king/view.test.ts`；验收：旧区域位置不再出现，新区域出现。
- [x] T005 实现类型和定位逻辑；文件：`runtime.d.ts`、`highlight.ts`、`source-locator.ts`；验收：定位测试通过。
- [x] T006 实现状态和 Excel；文件：`state.ts`、`keyword-import-export.ts`；验收：状态和 Excel 测试通过。
- [x] T007 实现 UI 和事件；文件：`view.ts`、`main.ts`、`public/tool/app/audit-king/index.html`；验收：视图测试通过。
- [x] T008 同步 spec；文件：`spec/app/audit-king.md`；验收：文档描述当前事实。
- [x] T009 构建和全量验证；命令：局部测试、build、typecheck、test；验收：全部通过。

## 8. 验证计划

相关局部测试：`npx.cmd vitest run tests/tool/audit-king`。

完整验证命令：`npm.cmd run build`、`npm.cmd run typecheck`、`npm.cmd test`。

构建或安装检查：确认 `dist/tool/app/audit-king/` 生成最新脚本。

页面/工具入口检查：确认底部左侧为当前关键词手册证据，右侧为审计篮子；全部详情标题栏有选中内容加入证据入口。

恢复或中断演练：测试覆盖全文坐标恢复、文本上下文恢复、多处命中不猜、无选区提示。

文档同步检查：`spec/app/audit-king.md` 与实现一致。

未验证内容：最终视觉和真实大手册体验需要 owner 人工检查。

剩余风险：Word 段落拆分大幅变化时，部分证据可能只能保留为需人工确认。

## 9. 收口

目标是否完成：已完成。

失败测试是否变绿：已变绿。

改了哪些文件：`public/tool/app/audit-king/index.html`、`src/tool/app/audit-king/highlight.ts`、`src/tool/app/audit-king/keyword-import-export.ts`、`src/tool/app/audit-king/main.ts`、`src/tool/app/audit-king/runtime.d.ts`、`src/tool/app/audit-king/source-locator.ts`、`src/tool/app/audit-king/state.ts`、`src/tool/app/audit-king/view.ts`、`tests/tool/audit-king/*`、`spec/app/audit-king.md`、`plan.md`。

跑了哪些验证：`npx.cmd vitest run tests/tool/audit-king`、`npm.cmd run build`、`npm.cmd run typecheck`、`npm.cmd test`。

哪些内容没有验证：最终视觉和真实超大手册体验需要 owner 人工检查。

剩余风险：Word 段落拆分大幅变化时，部分手册证据可能只能保留为需人工确认。

是否 commit / push：待执行。
