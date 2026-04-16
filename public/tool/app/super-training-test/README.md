# 培训克星维护文档

## 当前真实结构

`super-training-test` 现在只支持南货航这份新总表结构，不再兼容“历史 sheet / 预排 sheet 分开”模式。

工作簿按下面的结构识别：

- `人员信息表`
- `CRM`
- 各项目独立 sheet，例如 `应急训练`、`危险品`、`航空安保`、`飞行作风`、`英语能力`、`汉语能力`

每个项目 sheet 内同时包含两类行：

- `培训信息是否录入 = 是`
  作为已录入记录，用于有效期更新
- `培训信息是否录入 != 是`
  作为未录入记录，用于预排模板来源

## 模块职责

- `index.html`
  页面入口和静态文案。
- `scripts/config.js`
  项目规则、固定 sheet 名、默认表头和日期格式。
- `scripts/utils.js`
  日期解析、sheet 读写、样式合并、公共格式化。
- `scripts/scanner.js`
  识别人员信息表和项目 sheet，并把项目行拆成 `recordedInfo` / `pendingInfo`。
- `scripts/validity.js`
  只基于 `recordedInfo` 更新 `人员信息表` 中的有效期。
- `scripts/schedule.js`
  基于 `人员信息表` 现有有效期筛人，并从 `pendingInfo` 提取默认值、日期和复用样式所需上下文。
- `scripts/report-sheet.js`
  生成最前面的 `更新报告` sheet。
- `scripts/generated-sheet.js`
  生成新的 `项目名预排（生成）` sheet。
- `scripts/app.js`
  页面交互、预览和导出。

## 识别口径

- 人员信息表优先识别 `人员信息表`，否则按必需表头兜底识别。
- 项目 sheet 只按项目同名 sheet 或别名识别，不再拼接 `历史` / `预排` 后缀。
- `CRM` 继续忽略。
- 月份来源：
  - 有效期更新使用 `recordedMonths`
  - 预排上下文使用 `pendingMonths`

## 一键更新

- 从所选项目的 `recordedInfo.rows` 中筛选所选月份。
- 只处理 `培训信息是否录入 = 是` 的行。
- 按现有规则计算新有效期。
- 只回写 `人员信息表` 对应项目列。
- 明细里展示来源 `项目 sheet` 和 `项目行号`，不再展示“历史 sheet”概念。

## 一键预排

- 筛人来源是 `人员信息表` 当前有效期。
- 预排模板来源是同一项目 sheet 的 `pendingInfo.rows`。
- 从未录入行提取：
  - 可用月份
  - 默认字段
  - session 日期
  - 表头结构
  - 可复用样式
- 如果某个月没有可复用日期，就回退到用户选择的预排区间，不因为样式缺失阻塞功能。

## 维护注意

- 后续如果南货航继续沿用这类 merged sheet，只需要维护表头差异和项目规则。
- 如果 `培训信息是否录入` 的取值口径变化，需要同步修改 `scanner.js` 与 `validity.js` 的拆分条件。
- 不要再引入 `${项目}历史`、`${项目}预排`、`historySheetName` 这一类旧结构字段。
