# 模拟排班模块

本文只记录当前实现事实，方便后续维护或删除模块。

## 定位

模拟排班是浏览器内临时数据模块。

- 不写回 Excel。
- 不覆盖原文件。
- 不参与有效期更新。
- 不参与 CRM 年度核对。
- 不参与 Excel 健康检查。
- 不参与已录入月份选择。
- 只作为项目 sheet 临时行注入排班总览覆盖判断。

## 数据口径

一条模拟排班记录等价于项目 sheet 中一条未录入排班记录：

- `员工号`
- `姓名`
- `项目名称`
- `培训开始日期`
- `培训结束日期`
- `培训信息是否录入 = 否`
- `备注 = 模拟排班` 或页面输入的备注

备注不含 `取消` 时，模拟记录按有效安排参与排班覆盖判断。

## 模块文件

- `src/tool/app/training-workbench/scripts/simulation-schedule.ts`
  - 保存浏览器内模拟记录。
  - 提供新增、批量新增、删除、清空和导出 extra rows 的方法。
- `src/tool/app/training-workbench/scripts/app-simulation-schedule.ts`
  - 负责页面交互。
  - 从项目风险矩阵对应人员明细中已勾选的人员批量生成模拟记录。
  - 渲染模拟排班列表。
  - 删除单条或清空全部模拟记录。
- `public/tool/app/training-workbench/index.html`
  - 挂载模拟排班页面区块。
  - 引入 `simulation-schedule.js` 和 `app-simulation-schedule.js`。

## 注入点

模拟排班只通过 `extraProjectRows` 注入排班总览。

调用路径：

1. `app-simulation-schedule.ts` 更新浏览器内模拟记录。
2. `app-workbench-controller.ts` 调用 `Workbench.buildWorkbench`。
3. `Workbench.buildWorkbench` 透传 options。
4. `schedule-assessment.ts` 读取 `options.extraProjectRows`。
5. `schedule-assessment.ts` 在 `buildCandidateMatches` 中把模拟记录转换成临时 sheet 行。
6. 覆盖判断继续走 `TrainingRecordPolicy` 和 `RuleEngine.evaluatePlanCoverage`。

关键代码事实：

- `app-workbench-controller.ts` 传入：
  - `extraProjectRows: state.simulationRecords || []`
- `schedule-assessment.ts` 接收：
  - `options.extraProjectRows`
- `schedule-assessment.ts` 转换：
  - `buildExtraRows`
  - `createExtraSheetInfo`

## 页面挂载点

页面区块位于 `public/tool/app/training-workbench/index.html`：

- 项目风险矩阵和人员明细之后。
- 年度有效期到期压力图之前。

事件绑定位于 `src/tool/app/training-workbench/scripts/app.ts`：

- `simulationAddSelectionButton`
- `simulationClearButton`
- `simulationTableBody`
- `simulationProjectSelect`
- `simulationStartDateInput`
- `simulationEndDateInput`

人员明细选择逻辑位于 `src/tool/app/training-workbench/scripts/app-summary-view.ts`：

- 项目风险矩阵数字决定当前人员明细范围。
- 人员明细中的复选框决定哪些人员加入模拟排班。
- 支持单选、多选、全选、取消全选和反选。
- 选中状态保存在 `state.workbenchSelectedPersonKeys`。

页面元素注册位于：

- `src/tool/app/training-workbench/scripts/app-elements.ts`
- `src/tool/app/training-workbench/scripts/app-models.d.ts`

按钮状态控制位于：

- `src/tool/app/training-workbench/scripts/app-controls.ts`

导入新 Excel 时清空模拟记录位于：

- `src/tool/app/training-workbench/scripts/app-actions.ts`

## 删除步骤

如果后续确认不再需要模拟排班，按下面步骤删除：

1. 删除 `src/tool/app/training-workbench/scripts/simulation-schedule.ts`。
2. 删除 `src/tool/app/training-workbench/scripts/app-simulation-schedule.ts`。
3. 从 `public/tool/app/training-workbench/index.html` 删除模拟排班页面区块。
4. 从 `public/tool/app/training-workbench/index.html` 删除两个脚本引用：
   - `simulation-schedule.js`
   - `app-simulation-schedule.js`
5. 从 `app.ts` 删除模拟排班相关事件绑定。
6. 从 `app-elements.ts` 和 `app-models.d.ts` 删除模拟排班页面元素。
7. 从 `app-controls.ts` 删除模拟排班按钮状态逻辑。
8. 从 `app-state.ts` 删除 `simulationRecords`。
9. 从 `app-actions.ts` 删除导入 Excel 时清空模拟记录的调用。
10. 从 `app-renderers.ts` 删除渲染占位时调用模拟排班渲染的逻辑。
11. 从 `app-workbench-controller.ts` 删除传入 `extraProjectRows`。
12. 从 `schedule-assessment.ts` 删除 `ExtraProjectRow`、`buildExtraRows`、`createExtraSheetInfo` 和 `buildCandidateMatches` 中合并模拟行的逻辑。
13. 删除 `tests/tool/training-workbench/schedule-assessment.test.ts` 中模拟排班注入用例。
14. 更新本 README 和培训皇帝 README 中关于模拟排班的事实描述。

删除后，排班总览会恢复为只读取 Excel 真实项目 sheet 行。
