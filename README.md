# ohmyflight

<p align="center">
  <img alt="flight tools" src="https://img.shields.io/badge/flight-tools-9ca3af?style=for-the-badge&labelColor=111827">
  <img alt="training first" src="https://img.shields.io/badge/training-first-d4af37?style=for-the-badge&labelColor=171717">
  <img alt="browser apps" src="https://img.shields.io/badge/browser-apps-737373?style=for-the-badge&labelColor=262626">
  <img alt="python helpers" src="https://img.shields.io/badge/python-helpers-a3a3a3?style=for-the-badge&labelColor=0a0a0a">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-b08d57?style=for-the-badge&labelColor=1c1917">
</p>

项目地址：https://luckymaomi.github.io/ohmyflight/

## 当前工具

| 工具 | 状态 | 功能 |
| --- | --- | --- |
| 培训皇帝 | ✅ | 一键排/核/预估培训，皇帝御用。 |
| 审计之王 | ✅ | 调教手册用。 |
| 姓名匹配员工号 | ✅ | 一键识别姓名，匹配对应员工号。 |
| 锁班皇帝 | ✅ | Python脚本，一键批量录入锁班信息。 |
| 飞行经历/左座经历起落数按天统计 | ✅ | Python脚本，一键批量飞行经历/左座经历起落数。 |
| 珠海皇帝 | ✅ | 一键核对场次表与账单表姓名人次。 |
| 酒店皇帝 | ✅ | 一键对比酒店账单与入住登记表。 |
| 重点人员标注 | ✅ | 一键标注审班表。 |
| 航线班次统计 | ✅ | 根据排班表，一键统计每人各航线班次。 |
| 自动点OA助手 | ✅ | Python脚本，自动打开 OA 待办页并自动点击“已阅”；自动点击百分之95以上oa，部分类型（如督办）需人工处理，自动点击失败时手动完成后等待刷新即可。 |
| Word模板填充器 | ✅ | 通用文档模板填充工具，上传配置和模板，自动生成可单份填写、Excel批量导入并批量导出的应用。 |
| PDF工具 | ✅ | PDF预览、页面提取、转图片、合并、图片转PDF，支持旋转和批量操作。 |
| PDF加水印 | ✅ | 手册工作使用，在PDF每页的相同位置添加图片，支持拖拽定位和精确数值调整。 |
| 图片工具 | ✅ | 图片格式转换、压缩、调整尺寸、裁剪、Base64互转，支持批量操作。 |
| 提取员工号 | ✅ | 从混杂文本中提取6位数字员工号，自动去重排序，支持一键复制。 |
| 人员结构统计 | ✅ | 导入人员信息表，按报告口径一键生成人员结构。 |

## 本地开发

```bash
npm.cmd install
npm.cmd run build
npm.cmd run typecheck
npm.cmd test
```

本地预览可运行 `python start_index.py`，或双击 `start_index.cmd`；脚本会构建 `dist/`，用 Edge 无痕模式打开 `http://localhost:4567/index.html`，并启动本地站点。

`tests/helpers/browser-context.ts` 会在局部测试读取 `dist/` 前自动检查构建产物；如果 `src/` 或 `public/` 更新过，会先触发一次构建，避免测试读到旧脚本。

GitHub Pages 会在 `master` 分支 push 后自动运行 `npm run build`，并把 `dist/` 部署到项目站点。类型检查和测试由本地开发阶段手动运行。

## 开源协议与贡献

本项目遵循 [MIT License](./LICENSE) 开源协议。

欢迎提交 Issue 或 Pull Request 改进工具、修复问题、补充文档。贡献前建议先阅读 [贡献指南](./CONTRIBUTING.md)，并尽量说明问题场景、输入样例、期望结果和验证方式。
