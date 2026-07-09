# 校对之王 Plan

## 1. 需求文档

用户要解决的实际问题：对同一本手册的新旧版本做文本校对，找出新版相对旧版的删除、新增、修改和疑似冲突，并导出可复核 Excel 差异报告。

谁会使用：需要核对手册修订差异的飞行部手册校对人员。

用户完成任务时应该看到什么体验：打开独立工具“校对之王”，上传基准手册 A 和待校对手册 B。A 是旧版或基准版，B 是新版或待校对版。手册可以是 `.docx` 或文字型 `.pdf`。PDF 可填写起止页，只比对指定页码；Word 默认全文。点击开始比对后，页面显示解析统计、总体差异统计、差异预览，并能导出 Excel 报告。

当前范围包含：新增独立工具入口；文字型 PDF 读取；docx 读取；标点优先切片；搜索引擎候选召回；A 到 B 主向比对；B 新增内容反向识别；疑似冲突识别；Excel 差异报告；spec 和测试同步；使用 owner 提供的两本真实手册做本地回放调优。

当前范围不包含：OCR、扫描件 PDF、`.doc` 旧 Word、AI 语义判断、联网检索、Word 页码范围、自动写回 Word/PDF、PDF 高亮导出。

业务上怎样算完成：工具能独立打开；真实样本能完成解析和比对；Excel 报告能按 A 顺序列出 A 到 B 的匹配/修改/删除，另列 B 新增内容和疑似冲突；结果不是明显离谱；核心切片和比对规则有测试保护；构建、类型检查、全量测试通过。

## 2. 当前事实

已确认代码事实：本仓库工具入口在 `src/tool/tools-data.ts`；工具页面放 `public/tool/app/<tool>/`；工具源码放 `src/tool/app/<tool>/`；构建脚本会把 `src/**/*.ts` 转成 `dist/**/*.js` 并复制 `public/`。

已确认代码事实：审计之王已有 `search-engine.ts`、`document-reader.ts`、`pdf-locator-reader.ts`、`pdf-locator-model.ts`，可作为移植重写参考，但新工具不直接引用审计之王模块。

已确认测试事实：测试在 `tests/tool/`；浏览器脚本测试通过 `tests/helpers/browser-context.ts` 读取构建产物。

已确认文档/spec 事实：`spec/app/` 是用户侧功能事实记录位置；新增正式工具必须补 spec 和工具入口。

已确认配置或入口事实：`public/libs/` 已有 `mammoth.min.js`、`pdf.min.js`、`pdf.worker.min.js`、`xlsx-js-style.min.js`、`flexsearch.bundle.min.js`，可支撑浏览器本地读取 Word/PDF、建立本地索引和导出 Excel。

用户提供事实：工具名倾向“校对之王”；目标是同一本手册新旧版比对；A/B 有主次，A 是基准，B 是待校对；输出重点是 Excel 差异报告；真实测试文件为 `C:\Users\Administrator\Desktop\南货航《飞行技术管理手册》R01-08 V1（无修订记录）(1).docx` 和 `C:\Users\Administrator\Desktop\飞行技术管理手册_第09版第26修订.pdf`。

当前已有能力：仓库已有独立静态工具模式、PDF/Word 本地读取库、Excel 导出库、搜索召回和切片定位的成熟参考。

当前缺口：没有独立手册新旧版校对工具；没有 A/B 主向差异报告；没有按标点优先切片的手册版本比对模型；没有对应 spec 和测试。

仍不明确：真实样本最终“可接受”的差异量没有固定阈值，需要以本地回放结果是否便于人工复核为判断；Word 页码范围第一版不支持。

## 3. 失败测试

自动测试：

- 标点优先切片应按 `。；！？`、换行等强边界切片，必要时用逗号级边界和滑动窗口处理长句。
- 太短且没有关键项的片段不能单独形成强命中；工具默认不内置业务词特判。
- 归一化必须保留中文、英文、数字和条款号，例如 `ICAO`、`1000小时`、`121.467`。
- A 到 B 比对应按 A 切片顺序输出，能识别一致、修改、删除。
- B 到 A 反向比对应识别新版新增内容。
- 相似内容中的关键数字、英文或条款号不一致时应进入疑似冲突。
- Excel 报告应包含 `总览`、`A到B比对`、`B新增内容`、`疑似冲突` 四个 sheet，且关键字段完整。

类型检查：`npm.cmd run typecheck` 必须通过。

构建命令：`npm.cmd run build` 必须通过。

静态检查：工具入口数据、spec 索引、页面脚本引用和构建产物应一致。

真实用户路径演练：上传 A docx 和 B PDF，B 可指定页码范围或整本；运行比对；查看页面统计；导出 Excel；检查报告内容是否可人工复核。

失败判定：工具无法独立打开、PDF/Word 不能读取、核心测试失败、Excel sheet 缺失、真实样本结果明显全是误判或空结果、任一完整验证命令失败，均判定未完成。

## 4. 目标

用户路径完成到：上传基准手册 A 和待校对手册 B -> 可选 PDF 页码范围 -> 开始比对 -> 查看统计和差异预览 -> 导出 Excel。

代码主链路接到：reader、normalizer、segmenter、search-index、compare-model、excel-export、view、actions、main 独立模块。

状态和记录落到：工具内独立状态保存 A/B 文档、页码范围、切片、比对结果和导出状态，不依赖审计之王状态。

输出呈现到：页面统计卡、差异预览表、Excel 报告。

测试和文档同步到：新增 `spec/app/proof-king.md`，更新 spec 索引和工具入口，新增 `tests/tool/proof-king/` 核心测试。

完成判定：局部测试、构建、类型检查、全量测试通过，并完成真实样本本地回放。

## 5. 不做范围

不做 OCR。

不做扫描件 PDF。

不做 `.doc` 旧 Word。

不做 AI 语义等价判断。

不做 Word 页码范围。

不做 PDF 或 Word 写回。

不把新工具直接引用审计之王模块。

不提交真实业务手册、临时探测脚本或真实样本导出的 Excel。

## 6. 设计

主链路：读取 A/B 文件 -> 统一成文档单元 -> 按页码范围过滤 PDF -> 按结构和标点切片 -> 建 B 搜索索引 -> A 切片召回 B 候选并评分 -> 建 A 搜索索引 -> B 切片反向识别新增 -> 聚合总览和疑似冲突 -> 页面预览 -> 导出 Excel。

输入 -> 判断 -> 状态 -> 执行 -> 输出 -> 记录

- 输入：A 文件、B 文件、PDF 起止页、用户点击开始比对。
- 判断：文件类型是否合法；PDF 是否有文字层；页码范围是否合法；切片是否足够；候选匹配是否达到阈值。
- 状态：A/B 文档、A/B 切片、A 到 B 结果、B 新增结果、疑似冲突、总览统计。
- 执行：reader 读取；segmenter 切片；search-index 召回；compare-model 评分分类；excel-export 导出。
- 输出：页面统计、结果表、Excel。
- 记录：spec 记录当前能力和限制；测试保护核心规则。

模块边界：

- `reader.ts`：读取 docx/pdf 并输出统一文档单元。
- `normalizer.ts`：文本归一化和关键 token 提取。
- `segmenter.ts`：标点优先切片、通用短片段过滤、可注入排除池/hook 和长句滑窗。
- `search-index.ts`：FlexSearch 和 ngram 候选索引。
- `compare-model.ts`：评分、状态分类、总览和冲突识别。
- `excel-export.ts`：Excel workbook 结构和下载。
- `view.ts`：页面渲染。
- `actions.ts`：事件绑定和状态更新。
- `main.ts`：装配入口。

文件职责：规则、读取、索引、渲染和导出分离；页面只负责上传、展示和触发导出。

状态归属：新工具使用 `window.ProofKing` 命名空间，和 `window.AuditKing` 完全独立。

数据或事件流：文件 input change 读取 A/B；按钮 click 运行比对；结果写入 state；导出按钮按当前结果生成 Excel。

错误、恢复、中断、重试边界：缺文件、文件类型错误、PDF 无文字层、页码越界、切片不足、无结果时给页面提示；用户可重新上传并重跑。

与现有架构的关系：新增正式工具，沿用仓库静态工具结构和本地浏览器库；只移植重写算法思想，不直接共享审计之王模块。

测试和文档影响：新增 spec、入口数据、页面、源码和测试；收尾运行完整验证。

## 7. 实施任务

- [x] T001 写入当前 `plan.md`；文件/模块：`plan.md`；依赖：owner 已确认需求；验收：计划结构完整。
- [x] T002 新增工具页面和入口；文件/模块：`public/tool/app/proof-king/index.html`、`src/tool/tools-data.ts`；依赖：T001；验收：构建后入口脚本可生成。
- [x] T003 新增核心模型模块；文件/模块：`normalizer.ts`、`segmenter.ts`、`search-index.ts`、`compare-model.ts`；依赖：T001；验收：核心测试通过。
- [x] T004 新增读取、导出和交互模块；文件/模块：`reader.ts`、`excel-export.ts`、`view.ts`、`actions.ts`、`main.ts`、`runtime.d.ts`；依赖：T002、T003；验收：页面可完成上传、比对、导出。
- [x] T005 同步 spec 和索引；文件/模块：`spec/app/proof-king.md`、`spec/app/README.md`；依赖：T002-T004；验收：文档只写当前事实。
- [x] T006 新增自动测试；文件/模块：`tests/tool/proof-king/*.test.ts`；依赖：T003、T004；验收：局部测试通过。
- [x] T007 完整验证和真实样本回放；命令/文件：局部测试、build、typecheck、全量 test、owner 提供 docx/pdf；依赖：T006；验收：结果可人工复核，收口记录真实。

## 8. 验证计划

相关局部测试：

```powershell
npx.cmd vitest run tests/tool/proof-king
```

完整验证命令：

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

构建或安装检查：确认 `dist/tool/app/proof-king/` 生成全部脚本，`dist/tool/index.html` 可链接到新工具。

页面/工具入口检查：确认工具入口数据包含“校对之王”，页面加载 `mammoth`、`pdf.js`、`xlsx-js-style`、`flexsearch` 和新工具脚本。

恢复或中断演练：第一版不做工作区持久化；用户可重新上传文件重跑。

文档同步检查：`spec/app/proof-king.md` 与实现一致，不描述 OCR、AI、Word 页码范围为当前能力。

真实样本验证：用 `C:\Users\Administrator\Desktop\南货航《飞行技术管理手册》R01-08 V1（无修订记录）(1).docx` 作为 A，`C:\Users\Administrator\Desktop\飞行技术管理手册_第09版第26修订.pdf` 作为 B，运行本地比对并导出报告；如结果明显离谱，优先调整通用切片、阈值或通过可注入池/hook 显式配置，不把业务词写死进代码。

未验证内容：前端视觉最终由 owner 人工确认；真实 Word 页码不支持。

剩余风险：PDF 抽取文本顺序可能与视觉排版不同；两版手册章节大幅重排时，局部候选可能需要人工确认；无 AI 时不能保证语义等价判断。

## 9. 收口

目标是否完成：已完成。已新增独立工具“校对之王”，A 为基准手册、B 为待校对手册，支持 docx 全文和文字型 PDF 页码范围，能比对并导出 Excel 差异报告。页面已从表格预览改为差异列表加右侧 A/B 上下文对照，支持颜色高亮和 B 手册 PDF 页面预览。

失败测试是否变绿：已变绿。新增测试覆盖标点切片、无硬编码业务弱词、可注入 hook、A/B 主向比对、中心候选防偏移、标点空白归一、B 新增、重复短片段过滤、PDF 页码范围、PDF 预览页路由和 Excel sheet。

改了哪些文件：新增 `public/tool/app/proof-king/index.html`；新增 `src/tool/app/proof-king/` 下 reader、normalizer、segmenter、search-index、compare-model、excel-export、preview、view、actions、main 和 runtime 类型；更新 `src/tool/tools-data.ts`；新增 `spec/app/proof-king.md` 并更新 `spec/app/README.md`；新增 `tests/tool/proof-king/` 测试。

跑了哪些验证：`npm.cmd run build` 通过；`npx.cmd vitest run tests/tool/proof-king` 5 个测试文件、13 个测试通过；`npm.cmd run typecheck` 通过；`npm.cmd test` 42 个测试文件、173 个测试通过。

真实样本验证：已用 `C:\Users\Administrator\Desktop\南货航《飞行技术管理手册》R01-08 V1（无修订记录）(1).docx` 作为 A，`C:\Users\Administrator\Desktop\飞行技术管理手册_第09版第26修订.pdf` 作为 B 做本地回放。第二轮结果：A 切片 3900、B 切片 8433、一致 1432、修改 1857、删除 445、需确认 166、B 新增 2021、疑似冲突 601、A 覆盖率 76.6%、平均相似度 69.6%。已导出本地验证报告 `.vitest/proof-real-report.xlsx`。

哪些内容没有验证：未做浏览器人工视觉检查；未验证扫描 PDF、`.doc` 旧 Word、Word 页码范围，因为当前不支持。

剩余风险：真实 PDF 抽取文本顺序可能与视觉排版不完全一致；跨版本大幅重排时可能出现需确认项；无 AI 时不能判断深度语义等价。真实样本中修订记录类内容会产生较多新增/冲突项，但报告可用于人工复核。

是否 commit / push：未 commit，未 push。
