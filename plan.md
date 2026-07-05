# 全局文件职责审查与部署稳定性 Plan

## 1. 需求文档

用户要解决的实际问题：项目持续增加工具后，部分文件变成超长、超重、职责混杂的维护点。后续小白维护时，如果状态管理、规则计算、数据读写、渲染展示、外部接线和兼容处理继续混在一起，改一个功能会牵动很多无关逻辑。

谁会使用：项目 owner、后续维护者和 agent。

用户完成任务时应该看到什么体验：核心工具的文件职责清楚，能一句话说清每个文件为什么变化；已经拆分的模块有测试保护；没有为了行数机械拆分，也没有为了省事把不同变化原因硬塞在一个文件。

当前范围包含：扫描 `src/tool/app`、`public/tool/app`、`scripts`、`tests/tool` 和 `spec/app` 中超过 300 行或职责信号混杂的文件；先按语义记录每个候选文件的一句话职责、变化原因和混杂风险；再决定是否拆分。审计之王、酒店皇帝、航线班次统计、PDF 盖章、人员结构统计、会话账单、旧 Python 工具都先审查，不先入为主。Python 分发脚本保持单文件形态，只记录内部维护风险，不拆成多个运行文件。

当前范围不包含：培训皇帝的大规模拆分；培训皇帝只做职责审查记录，因为它已经按规则、扫描、渲染、图表、动作等模块拆开。也不做业务规则重写、UI 重设计、工具下线、旧兼容迁移。不把可下载 Python 工具拆成多文件，因为它们对用户的交付边界就是单个可运行文件。

业务上怎样算完成：形成基于语义的全局职责审查记录；明确必须拆、建议拆、暂缓和保留的事实理由；只有确认必须拆且测试保护足够的文件才进入拆分；GitHub Pages workflow 对偶发部署失败做最小稳定性修复；构建、类型检查和全量测试通过；最终提交和推送。

## 2. 当前事实

已确认扫描事实：`git status --short --branch` 显示 `## master...origin/master`，当前工作区干净。

已确认超过 300 行的源码文本文件包括：`public/tool/app/lock-entry-helper/superapp.py`、`public/tool/app/lock-entry-helper/app.py`、`public/tool/app/flight-stats-helper/app.py`、`src/tool/app/personnel-structure-stats/app.py`、`src/tool/app/training-workbench/scripts/schedule-assessment.ts`、`src/tool/app/audit-king/main.ts`、`src/tool/app/personnel-structure-stats/logic.ts`、`src/tool/app/pdf-stamp/main.ts`、`src/tool/app/hotel-bill-check/main.ts`、`src/tool/app/audit-king/view.ts`、`src/tool/app/audit-king/source-locator.ts`、`src/tool/app/audit-king/state.ts`、`src/tool/app/crew-flight-stats/main.ts`、`src/tool/app/session-bill-check/logic.ts`、`src/tool/app/session-bill-check/main.ts` 等。

已确认职责信号：`src/tool/app/audit-king/main.ts` 同时包含文件上传、搜索重算、DOM 选区、事件委托、关键词动作、检查单来源绑定、手册证据加入/移除、审计篮子编辑、Excel 导入导出和日期文件名，属于重点审查对象；是否拆分需结合现有测试、入口脚本顺序和模块边界再决定。

已确认可暂缓事实：`src/tool/app/word-template-filler` 已拆成 `generated-app-runtime-*`、`app-packager`、`config-parser`、`html-generator` 等小模块，当前没有超过 300 行源码文件。

已确认可暂缓事实：培训皇帝虽然存在 300 行以上文件，但 `schedule-assessment.ts` 主要是排班风险计算和视图数据构造，`rule-engine.ts` 主要是培训有效期规则，`app-renderers.ts` 主要是渲染，`app-charts.ts` 主要是图表。它们触发职责审查，但不是本轮优先拆分对象。

已确认测试事实：审计之王已有 9 个测试文件保护文档读取、搜索、高亮、定位、状态、导入导出和视图；全量测试在上一阶段通过 34 个测试文件、132 个测试。

语义审查记录：

- 保留：`src/tool/app/training-workbench/scripts/rule-engine.ts`。一句话职责：计算培训有效期、窗口期、排班状态和规则判断。变化原因集中在培训规则变化，不含 DOM、Excel 读写或事件接线。
- 保留：`src/tool/app/training-workbench/scripts/schedule-assessment.ts`。一句话职责：基于培训分析结果构造排班评估、筛选、统计和图表数据。变化原因集中在排班总览评估口径，不直接操作 DOM 或文件。
- 保留：`src/tool/app/training-workbench/scripts/app-renderers.ts`。一句话职责：把 TrainingToolApp 状态渲染到页面。变化原因集中在页面展示结构，不负责规则计算或文件读写。
- 保留：`src/tool/app/training-workbench/scripts/app-charts.ts`。一句话职责：渲染培训工作台图表。变化原因集中在图表展示。
- 暂缓：`src/tool/app/training-workbench/scripts/utils.ts`。一句话职责：培训工作台共享工具函数。它包含日期、表头、样式和 Excel 写单元格工具，确实偏“工具箱”，但调用面广且现有行为稳定，本轮不拆。
- 必须拆候选：`src/tool/app/audit-king/main.ts`。一句话现状：审计之王页面入口和所有用户动作编排。问题是同一文件同时处理上传、搜索重算、DOM 选区、关键词动作、来源绑定、手册证据、审计篮子、Excel 导入导出和事件委托，变化原因过多；测试保护相对充分，适合作为第一轮拆分对象。
- 暂缓：`src/tool/app/audit-king/view.ts`。一句话职责：渲染审计之王页面。虽然超过 300 行，但变化原因主要是展示；可后续按面板拆，不作为第一轮。
- 保留：`src/tool/app/audit-king/source-locator.ts`。一句话职责：从检查单来源和手册证据的坐标、文本、上下文恢复定位。算法多但变化原因一致，不因行数拆。
- 保留：`src/tool/app/audit-king/state.ts`。一句话职责：审计之王状态创建和状态变更 API。覆盖关键词、手册、筛选、详情上下文和审计篮子，属于同一状态层；暂不拆。
- 建议拆：`src/tool/app/hotel-bill-check/main.ts`。一句话现状：酒店皇帝页面入口、Excel 读取预览、列选择、匹配触发、结果渲染和 Excel 导出。`logic.ts` 已承接核心匹配和日期逻辑，`main.ts` 仍混合 UI 和导出，后续适合拆成 view/export/io。
- 建议拆：`src/tool/app/session-bill-check/main.ts`。一句话现状：会话账单页面入口、文件读取、状态、图表、表格、详情和导出。`logic.ts` 已承接核心规则，`main.ts` 可后续拆渲染和导出。
- 建议拆：`src/tool/app/crew-flight-stats/main.ts`。一句话现状：航线班次统计页面入口、默认花名册读取、排班表读取、sheet 选择、结果渲染、导出和手工机组表。`logic.ts` 已承接核心统计，`main.ts` 可后续拆页面接线和渲染。
- 必须拆候选但本轮暂缓：`src/tool/app/pdf-stamp/main.ts`。一句话现状：PDF 盖章页面入口、上传、规则编辑、预览渲染、拖拽和导出。`logic.ts` 只承接规则计算，`main.ts` 职责混杂明显；但当前测试只覆盖 logic，拆前需补浏览器交互或更细的纯逻辑测试。
- 建议拆：`src/tool/app/personnel-structure-stats/app.py`。一句话现状：人员结构报告 Python GUI/CLI、Excel 解析、统计、Word 写回和界面运行。职责混杂明显，但已有 `logic.ts` 和部分 docx 测试；Python 端拆分需要单独计划。
- 保留：`src/tool/app/personnel-structure-stats/logic.ts`。一句话职责：浏览器版人员结构统计解析和计算。变化原因集中在统计口径。
- 必须拆候选但本轮暂缓：`public/tool/app/lock-entry-helper/app.py`、`public/tool/app/lock-entry-helper/superapp.py`、`public/tool/app/flight-stats-helper/app.py`。一句话现状：可下载 Python 自动化脚本，混合 CLI、输入解析、Playwright 页面操作、结果匹配和 Excel 写回。职责混杂明显，但它们在 `public` 下作为分发脚本，测试保护不足，不能直接大拆。
- 暂缓：`public/tool/app/oa-read-helper/app.py`。一句话现状：OA 批量已阅自动化脚本，主要围绕 Playwright 页面循环操作；虽然长，但变化原因比锁班/经历助手集中，本轮不拆。

已确认 Python 分发边界：`public/tool/app/*/*.py` 和类似 Python 小工具对用户来说是单文件下载运行的工具，不能为了职责拆分变成多文件包。后续只允许在单文件内部改善结构、补测试或记录风险，除非 owner 明确要求改变分发方式。

已确认部署失败现象：用户提供的 GitHub Actions 日志显示 `npm run build` 和 artifact 上传阶段已经完成，`actions/deploy-pages@v4` 已创建 Pages deployment，失败发生在 `Getting Pages deployment status...` 之后，错误为 `Deployment failed, try again later.` 用户重新推送后同一类部署又成功。

已确认 workflow 事实：`.github/workflows/deploy-pages.yml` 使用 push 到 `master` 和手动触发；build job 安装依赖、构建、配置 Pages、上传 `dist`；deploy job 使用 `actions/deploy-pages@v4`。原 workflow 使用 `concurrency.group: pages` 和 `cancel-in-progress: true`。

已确认官方文档事实：GitHub Actions 并发配置中 `cancel-in-progress: true` 会取消同一 concurrency group 中正在运行的 job 或 workflow。GitHub Pages 自定义 workflow 官方示例使用 `actions/upload-pages-artifact` 上传站点产物，再用 `actions/deploy-pages` 部署。

判断：本次失败更像 Pages 发布服务或 workflow 并发取消造成的部署阶段偶发失败，不像项目构建产物错误。Node 20 deprecation 和 `punycode` 是 action runtime 警告，不是这条日志里的直接失败点。

仍不明确：GitHub Pages 后端服务本身是否当时有瞬时故障，本地无法直接验证；需要以 GitHub Actions 页面后续运行结果确认。

## 3. 失败测试

自动测试：拆分审计之王 `main.ts` 后，`npx.cmd vitest run tests/tool/audit-king` 必须保持通过，证明事件接线、状态流、导入导出和证据逻辑没有断。

自动测试：如果移动审计之王状态或定位逻辑，`state.test.ts`、`source-locator.test.ts`、`keyword-import-export.test.ts` 必须继续覆盖同一行为。

自动测试：如果拆酒店皇帝或会话账单，必须先补对应导出、超链接、日期和匹配测试，再拆。

静态检查：拆分后 `public/tool/app/<tool>/index.html` 的脚本加载顺序必须包含新模块，构建产物必须生成对应脚本。

静态检查：部署稳定性修复后，`.github/workflows/deploy-pages.yml` 必须继续只在 `master` push 和手动触发时部署；Pages 部署必须串行排队，不取消已开始的同分支部署。

类型检查：`npm.cmd run typecheck` 必须通过。

构建命令：`npm.cmd run build` 必须通过。

全量测试：`npm.cmd test` 必须通过。

失败判定：拆分后任何测试失败、入口缺少新脚本、spec 描述旧文件职责、或拆分只是移动代码但职责仍混杂，都判定未完成。

## 4. 目标

审计之王先审查：确认 `main.ts` 的变化原因是否已经超过“页面接线和应用控制”职责；如果拆分，目标是让 `main.ts` 回到启动和模块装配职责。

全局审查完成：形成“必须拆、建议拆、暂缓、保留”的事实清单；是否做第一轮拆分以审查结论和测试保护为准。

测试保护完成：对测试不足的工具先记录，不直接大拆；对确认必须拆的文件，先确认或补足核心测试。

文档同步完成：spec 或 plan 记录当前职责边界和暂缓理由。

完成判定：相关局部测试、build、typecheck、全量 test 全部通过。

## 5. 不做范围

不为了行数拆分：超过 300 行只触发职责审查，不自动拆。

不拆培训皇帝核心模块：除非发现明确职责混杂或测试失败。

不重写旧 Python 工具：先审查记录，后续按实际维护需求决定；Python 工具不能拆成多文件分发。

不在没有测试保护的情况下大拆酒店皇帝、PDF 盖章、人员结构统计等工具。

不改变业务规则、导出结构、页面文案和用户工作流。

不把 GitHub Pages 偶发失败归因到构建产物，除非后续日志显示 artifact 或 build 阶段失败。

## 6. 设计

审查主链路：先按文件阅读和事实记录，不先设计拆分文件名；每个候选文件记录一句话职责、变化原因、内部耦合、测试保护、拆分收益、拆分风险和结论。

可能的审计之王拆分方向仅作为候选：外部接线/应用控制、上传处理、关键词与检查单来源动作、手册证据动作、审计篮子动作、导入导出动作。是否执行以审查结论为准。

状态归属：仍由 `state.ts` 管理状态变更；动作模块只调用状态 API；渲染仍由 `view.ts` 管理；定位仍由 `source-locator.ts` 管理。

全局审查口径：能一句话说清职责、变化原因一致、内部耦合合理的文件保留；状态管理、规则计算、数据读写、渲染展示、外部接线、错误兼容和业务判断混在一起的文件进入拆分候选。

测试影响：审计之王现有测试主要从构建产物读取脚本，改完 `src` 后必须先 build 再跑测试。

本轮拆分事实：

- 已拆：`src/tool/app/audit-king/main.ts`。拆分后一句话职责：创建审计之王上下文并装配动作模块。
- 新增：`src/tool/app/audit-king/app-context.ts`。一句话职责：创建共享上下文，集中提供状态、runtime、搜索重算、刷新、命中过滤、命中聚焦和本地日期格式化。
- 新增：`src/tool/app/audit-king/upload-actions.ts`。一句话职责：处理检查单和手册上传读取。
- 新增：`src/tool/app/audit-king/keyword-actions.ts`。一句话职责：处理关键词、检查单选区和检查单来源绑定动作。
- 新增：`src/tool/app/audit-king/match-actions.ts`。一句话职责：处理命中筛选、命中导航、手册证据加入/移出和手册启停删除动作。
- 新增：`src/tool/app/audit-king/evidence-actions.ts`。一句话职责：处理审计篮子编辑和审计篮子 Excel 导入导出。
- 新增：`src/tool/app/audit-king/keyword-file-actions.ts`。一句话职责：处理关键词 Excel 导入导出。
- 已更新：`public/tool/app/audit-king/index.html` 按依赖顺序加载新拆分脚本。

已验证事实：`npm.cmd run build` 通过，构建输出从 100 个脚本增加到 106 个脚本；`npx.cmd vitest run tests/tool/audit-king` 通过 9 个测试文件、63 个测试；`npm.cmd run typecheck` 通过。

部署稳定性设计：

- 保持一个 Pages workflow，不恢复额外 CI workflow。
- 并发组改成当前 workflow 和当前分支，避免和其他 workflow 共享过宽的 `pages` 组。
- `cancel-in-progress` 改为 `false`，让同分支 Pages 部署串行完成，避免取消已经开始创建 Pages deployment 的运行。
- `actions/upload-pages-artifact` 升级到 v4，跟随当前 GitHub Pages 官方示例；`actions/deploy-pages@v4` 继续保留，因为当前失败点不是 action 版本缺失造成。

## 7. 实施任务

- [x] T001 语义审查培训皇帝：确认哪些长文件职责单一、为什么不拆；验收：plan 中有保留理由。
- [x] T002 语义审查审计之王：确认 `main.ts`、`view.ts`、`source-locator.ts`、`state.ts` 的职责边界；验收：plan 中有拆/不拆结论。
- [x] T003 语义审查酒店皇帝、会话账单、航线班次统计；验收：记录职责、测试保护和风险。
- [x] T004 语义审查 PDF 盖章、人员结构统计、旧 Python 工具；验收：记录职责、测试保护和风险。
- [x] T005 形成全局清单：必须拆、建议拆、暂缓、保留；验收：每项有事实理由。
- [x] T006 对“必须拆且测试保护足够”的对象执行第一轮拆分；验收：拆分前后行为测试通过。
- [x] T007 补充或调整测试；验收：受影响工具局部测试通过。
- [x] T008 同步文档；验收：职责边界不描述旧结构。
- [x] T009 完整验证；命令：`npm.cmd run build`、相关局部测试、`npm.cmd run typecheck`、`npm.cmd test`；验收：全部通过。
- [x] T010 修正 Python 单文件分发边界；验收：plan 不再把 Python 分发脚本列为多文件拆分对象。
- [x] T011 诊断 GitHub Pages 偶发部署失败；验收：记录已确认失败阶段、最可能原因和非直接原因。
- [x] T012 最小修改 Pages workflow 并发策略；验收：部署不再取消同分支正在运行的 Pages workflow。

## 8. 验证计划

相关局部测试：`npx.cmd vitest run tests/tool/audit-king`。

完整验证命令：`npm.cmd run build`、`npm.cmd run typecheck`、`npm.cmd test`。

部署配置验证：静态检查 `.github/workflows/deploy-pages.yml`，确认 Pages workflow 仍只在 `master` push 和手动触发，deploy job 仍依赖 build job，concurrency 不取消进行中的部署。

构建或安装检查：确认 `dist/tool/app/audit-king/` 生成新拆分脚本，页面入口按依赖顺序加载。

页面/工具入口检查：确认审计之王入口不缺脚本；页面视觉由 owner 人工确认。

文档同步检查：`plan.md` 记录全局审查事实和本轮拆分事实。

未验证内容：GitHub Pages 后端偶发失败只能通过后续 GitHub Actions 实际部署结果观察；本地无法复现 GitHub Pages 服务端状态。

剩余风险：拆分动作模块可能影响事件绑定顺序，必须用测试和构建产物检查兜住；Pages 服务端如果本身瞬时异常，workflow 只能降低并发触发风险，不能完全消除 GitHub 服务偶发故障。

## 9. 收口

目标是否完成：已完成本轮语义审查、第一轮拆分和 Pages workflow 稳定性修正。

失败测试是否变绿：已变绿。

改了哪些文件：`plan.md`、`.github/workflows/deploy-pages.yml`、`public/tool/app/audit-king/index.html`、`src/tool/app/audit-king/main.ts`、`src/tool/app/audit-king/runtime.d.ts`，新增 `src/tool/app/audit-king/app-context.ts`、`upload-actions.ts`、`keyword-actions.ts`、`match-actions.ts`、`evidence-actions.ts`、`keyword-file-actions.ts`。

跑了哪些验证：`npm.cmd run build`、`npx.cmd vitest run tests/tool/audit-king`、`npm.cmd run typecheck`、`npm.cmd test`。

哪些内容没有验证：最终页面视觉由 owner 人工检查；GitHub Pages 服务端偶发失败需要后续实际 Actions 部署观察。

剩余风险：PDF 盖章仍是高风险候选，但测试保护不足，本轮只记录不拆；Python 自动化脚本保持单文件分发，只记录内部维护风险；Pages 如果是 GitHub 服务端瞬时失败，workflow 修改只能降低并发取消风险。

是否 commit / push：待执行。
