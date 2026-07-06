# 审计之王文件夹脚本导出 Plan

## 1. 需求文档

用户要解决的实际问题：迎审资料整理时，需要快速生成一批空文件夹，文件夹名按 `1.1`、`1.2` 这类单编号命名，避免人工逐个新建。

谁会使用：审计之王使用者。

用户完成任务时应该看到什么体验：在审计之王页面设置完整范围，例如 `1.1-1.61`，先看到将要生成的文件夹预览，再导出一个独立 `.py` 文件。把该 Python 文件放到目标目录运行后，在当前目录创建这些空文件夹。

当前范围包含：审计之王页面新增文件夹脚本导出区；新增可测试的文件夹范围生成逻辑；新增导出 Python 的页面动作；同步 spec 和测试。

当前范围不包含：浏览器直接运行 Python、删除或移动现有文件夹、读取用户本地目录结构、把 Python 拆成多个文件。

业务上怎样算完成：页面能按设置导出单文件 Python；Python 脚本只使用标准库，在运行目录创建缺失文件夹，已有文件夹不报错；核心生成规则有测试保护；构建、类型检查和测试通过。

## 2. 当前事实

已确认代码事实：审计之王源码在 `src/tool/app/audit-king/`；页面在 `public/tool/app/audit-king/index.html`；脚本通过 `window.AuditKing` 命名空间装配；`main.ts` 当前只负责绑定各模块。

已确认测试事实：审计之王测试在 `tests/tool/audit-king/`；测试 helper 会在 `dist/` 过旧时自动运行 `npm.cmd run build`。

已确认文档/spec 事实：`spec/app/audit-king.md` 已记录审计之王现有离线检索、关键词、手册证据和审计篮子规则。

已确认配置或入口事实：页面按 `<script src="..."></script>` 依赖顺序加载构建后的全局脚本；新增脚本需要加入页面加载顺序并在 `main.ts` 绑定。

已确认命令输出：工作区开始时 `git status --short --branch` 显示 `## master...origin/master`；用户给的参考目录中存在 `1.1` 到 `1.51` 等单编号文件夹和一个检查单 docx，未观察到现成的 `1.xx-1.xx` 范围文件夹。

用户明确事实：页面应指定 `X.X-X.X` 形式的完整范围，例如 `1.1-1.61`。

当前已有能力：审计之王可离线上传检查单和手册、维护关键词、导入导出关键词和审计篮子。

当前缺口：没有根据页面设置导出创建文件夹用的 Python 单文件脚本。

仍不明确：无。

## 3. 失败测试

自动测试：更新 `tests/tool/audit-king/folder-script-generator.test.ts`，覆盖完整范围解析、逐项生成单编号文件夹名、非法输入和 Python 文本关键行为。

类型检查：`npm.cmd run typecheck` 必须通过。

构建命令：`npm.cmd run build` 必须通过并生成新增脚本。

静态检查：页面必须加载新增脚本，`main.ts` 必须绑定新增 action。

真实用户路径演练：页面输入 `1.1-1.61` 时预览显示 `1.1`、`1.2` 等文件夹名；点击导出 Python 得到单文件脚本。

失败判定：范围生成错误、非法输入不拦截、Python 不是单文件标准库脚本、页面缺少脚本加载、任一验证命令失败，均判定未完成。

## 4. 目标

用户路径完成到：用户在审计之王页面设置范围并下载 Python 文件。

代码主链路接到：`folder-script-generator.ts` 负责纯生成规则；`folder-script-actions.ts` 负责 DOM 输入、预览和下载；`main.ts` 只新增绑定调用。

状态和记录落到：该功能不进入审计之王主状态，不影响关键词、手册、手册证据或审计篮子。

输出呈现到：页面显示文件夹名预览、数量和导出按钮；下载文件名为创建文件夹用途的 `.py`。

测试和文档同步到：新增测试和 `spec/app/audit-king.md` 同步描述当前事实。

完成判定：局部测试、build、typecheck、全量 test 全部通过。

## 5. 不做范围

不做浏览器执行 Python。

不做自动读取或扫描本地目标目录。

不做删除、重命名、移动、覆盖文件。

不把该功能绑定到关键词、检查单、手册或审计篮子数据。

不把 Python 拆成多个文件。

## 6. 设计

主链路：页面输入完整范围 `X.X-X.X` -> 校验格式、同一一级编号和起止顺序 -> 生成文件夹名列表 -> 页面显示数量和前若干项预览 -> 点击导出 -> 生成含固定列表的 Python 文本 -> Blob 下载 `.py`。

模块边界：

- `folder-script-generator.ts`：纯逻辑，生成范围名、校验配置、生成 Python 文本。
- `folder-script-actions.ts`：读取页面输入、渲染预览、导出文件。
- `runtime.d.ts`：声明配置类型和命名空间类型。
- `index.html`：新增 Bootstrap 表单和预览容器，加载新增脚本。
- `main.ts`：新增一次 action 绑定。

文件职责：生成规则和 DOM 事件分开；Python 模板只在生成器模块里维护。

状态归属：表单值留在 DOM，不写入 `AuditKingStateModel`。

数据或事件流：输入框 `input/change` 触发预览刷新；导出按钮读取当前配置并下载。

错误、恢复、中断、重试边界：非法输入只在页面状态栏提示错误，不修改其它状态；用户改正输入后可重新预览和导出；Python 脚本遇到同名目录视为已存在，遇到同名文件记录失败，不删除任何内容。

与现有架构的关系：沿用 `window.AuditKing` 全局模块和 Bootstrap 页面样式。

测试和文档影响：新增生成器测试；spec 增加文件夹脚本导出规则。

## 7. 实施任务

- [x] T001 新增失败测试；文件/模块：`tests/tool/audit-king/folder-script-generator.test.ts`；验收：覆盖范围名和 Python 文本。
- [x] T002 新增生成器模块；文件/模块：`src/tool/app/audit-king/folder-script-generator.ts`；验收：测试通过。
- [x] T003 新增页面 action 和入口绑定；文件/模块：`folder-script-actions.ts`、`main.ts`；验收：页面输入能刷新预览并导出。
- [x] T004 新增页面 UI 和脚本加载；文件/模块：`public/tool/app/audit-king/index.html`；验收：Bootstrap 风格、紧凑、可读。
- [x] T005 同步 spec；文件/模块：`spec/app/audit-king.md`；验收：记录当前功能事实和禁止行为。
- [x] T006 完整验证；命令：局部测试、build、typecheck、全量 test。
- [ ] T007 收口提交和推送；验收：只提交本任务相关文件。

## 8. 验证计划

相关局部测试：

```powershell
npx.cmd vitest run tests/tool/audit-king/folder-script-generator.test.ts
npx.cmd vitest run tests/tool/audit-king
```

完整验证命令：

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

构建或安装检查：确认 `dist/tool/app/audit-king/folder-script-generator.js` 和 `folder-script-actions.js` 生成。

页面/工具入口检查：确认 `public/tool/app/audit-king/index.html` 加载新增脚本，`main.ts` 绑定 action。

恢复或中断演练：非法输入不导出，修正后恢复预览和导出。

文档同步检查：`spec/app/audit-king.md` 不描述旧事实。

未验证内容：下载后的 Python 在用户真实目标目录运行效果需要 owner 本地确认；本轮可做脚本文本和标准库逻辑检查。

剩余风险：无已知业务风险。

## 9. 收口

目标是否完成：已完成。

失败测试是否变绿：已变绿。

改了哪些文件：

- `public/tool/app/audit-king/index.html`：新增文件夹脚本导出区域，并加载新增脚本。
- `src/tool/app/audit-king/folder-script-generator.ts`：新增范围解析、文件夹名生成和 Python 文本生成。
- `src/tool/app/audit-king/folder-script-actions.ts`：新增页面预览和下载动作。
- `src/tool/app/audit-king/main.ts`、`runtime.d.ts`：接入新增动作和类型。
- `tests/tool/audit-king/folder-script-generator.test.ts`：新增核心生成规则测试。
- `spec/app/audit-king.md`：同步文件夹脚本导出事实。
- `plan.md`：记录本任务计划和收口。

跑了哪些验证：

- `npx.cmd vitest run tests/tool/audit-king/folder-script-generator.test.ts`
- `npx.cmd vitest run tests/tool/audit-king`
- `npm.cmd run build`
- `npm.cmd run typecheck`
- `npm.cmd test`

哪些内容没有验证：没有在真实目标目录运行导出的 Python；本轮已通过脚本文本和生成规则测试验证。

剩余风险：当前只支持同一一级编号范围，例如 `1.1-1.61`；跨 `1.x-2.x` 不生成，页面会报错。

是否 commit / push：已执行，口径修正提交为 `4bb6cba 修正审计之王文件夹脚本目录名`。
