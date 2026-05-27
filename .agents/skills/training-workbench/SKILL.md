---
name: training-workbench
description: ohmyflight 培训皇帝/培训工作台专属开发引导。用于修改培训有效期、排班总览、模拟排班、CRM 年度核对、年度已培训人次、培训 Excel 解析导出、培训测试或培训 spec 时。
---

# Training Workbench

本 skill 只做培训模块开发引导；具体业务事实写在 `spec/app/training-workbench/`。

## 先读

- 通用开发方法：`.agents/skills/ohmyflight-dev/SKILL.md`
- 培训总览事实：`spec/app/training-workbench/README.md`
- 培训规则事实：`spec/app/training-workbench/training-rule-spec.md`
- 模拟排班维护：`spec/app/training-workbench/simulation-schedule-module.md`

## 大方针

- 不凭记忆改培训规则；先确认 spec、测试和当前代码。
- 培训工具只呈现已确认事实，不替用户发明新业务规则。
- 具体口径放 spec，工作方法放 skill，仓库入口放 `AGENTS.md`。
- 排班总览、有效期更新、统计图、CRM、模拟排班可能是不同口径；改动前先确认数据来源和影响范围。
- 新事实替代旧事实时，只保留新事实；不要为旧名称、旧字段或旧口径保留兼容层，除非 owner 明确要求。

## 改动要求

- 涉及培训规则、Excel 解析、日期判断、导出结构、忽略清单或回归问题时，同步代码、测试和 spec。
- 优先沿用现有模块结构，不顺手重构无关培训代码。
- 有真实培训表时可做本地回放，但真实业务 Excel 不能成为仓库测试依赖，也不能提交。

## 验证

按影响范围先跑相关测试，再跑：

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```
