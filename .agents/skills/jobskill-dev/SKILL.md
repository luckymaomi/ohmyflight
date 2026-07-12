---
name: jobskill-dev
description: 维护 ohmyflight 内的 Jobskill 业务技能子站。用户要求新增、删除、重命名或调整飞行部日常 Skill，修改 Jobskill 页面、导航、Markdown、图片附件、维护指南或索引时使用。
---

# Jobskill Dev

Jobskill 是 ohmyflight 下的独立静态子应用，用于查询飞行部日常工作 Skill。业务正文与项目级 Agent Skills 是两类内容，不能混放。

## 当前入口

- 页面：`public/jobskill/index.html`
- 样式：`public/jobskill/site.css`
- 页面逻辑：`src/jobskill/site.ts`
- 搜索规则：`src/jobskill/search.ts`
- 页面索引：`src/jobskill/skills-data.ts`
- 业务 Skill：`public/jobskill/skills/<数字>/SKILL.md`
- 模块规范：`public/jobskill/SPEC.md`
- 人工索引：`public/jobskill/SKILL_INDEX.md`
- 自动验证：`tests/smoke/jobskill.test.ts`

## 事实纪律

- 只写当前有效做法，不把旧入口、旧数据或历史处理方式写入正文。
- owner 提供原文且未要求整理时，按原文字句写入，不自行扩写或换口径。
- 不确定内容先确认，不把推测写成业务事实。
- 附件放在所属 Skill 的 `assets/` 内，正文使用相对路径引用。

## 维护流程

1. 先读取目标 `SKILL.md` 全文和关联图片，不只修改用户摘出的片段。
2. 修改正文时保持标准 frontmatter：`name`、`description`。
3. 新增、删除、重命名或调整顺序时，同步 `src/jobskill/skills-data.ts`、`public/jobskill/SPEC.md` 和 `public/jobskill/SKILL_INDEX.md`。
4. 页面布局、搜索或 Markdown 渲染变化时，同步检查 `index.html`、`site.css`、`search.ts` 和 `site.ts`。
5. Jobskill 用户事实写入模块 `SPEC.md`，通用贡献说明使用仓库根 `CONTRIBUTING.md`，Agent 执行流程写入本 Skill。
6. 不复制 Bootstrap、marked、许可证或第二套 Git；统一复用 ohmyflight 主仓库能力。
7. Markdown、HTML、CSS 和 JavaScript 文本统一使用 UTF-8 无 BOM；发现非规范编码时直接清洗源文件，不在读取端增加兼容分支。

## 验证

先运行：

```powershell
npm.cmd run build
npx.cmd vitest run tests/smoke/jobskill.test.ts tests/smoke/html-assets-all.test.ts tests/smoke/javascript-syntax.test.ts
```

收尾运行 `npm.cmd run verify`。真实页面的导航、Markdown、表格和图片观感由 owner 人工确认。
