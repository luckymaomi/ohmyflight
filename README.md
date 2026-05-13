# ohmyflight

<p align="center">
  <img alt="flight tools" src="https://img.shields.io/badge/flight-tools-9ca3af?style=for-the-badge&labelColor=111827">
  <img alt="training first" src="https://img.shields.io/badge/training-first-d4af37?style=for-the-badge&labelColor=171717">
  <img alt="browser apps" src="https://img.shields.io/badge/browser-apps-737373?style=for-the-badge&labelColor=262626">
  <img alt="python helpers" src="https://img.shields.io/badge/python-helpers-a3a3a3?style=for-the-badge&labelColor=0a0a0a">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-b08d57?style=for-the-badge&labelColor=1c1917">
</p>

项目地址：https://agentjz.github.io/ohmyflight/

## 当前工具

| 工具 | 状态 | 功能 |
| --- | --- | --- |
| 酒店账单核对 | 🚧 开发中 | 对比酒店账单和入住登记表，按姓名与日期容差匹配，区分已匹配、重复匹配和未匹配记录。 |
| 培训皇帝 | 🚧 开发中 | 面向培训总表的一体化工具，支持工作台、到期清单、有效期更新、预排班、计划核对和导出。 |
| 姓名匹配员工号 | ✅ 可用 | 从混杂文本中识别花名册姓名，匹配员工号、技术信息和技术等级，并支持分列复制。 |
| 通用锁班助手（测试） | ✅ 可用 | Python自动化填写飞行门户非生产任务录入，支持批量文本、手动单条、Excel导入、白名单和统一备注。 |
| 飞行经历/左座经历起落数按天统计（测试） | ✅ 可用 | Python自动化查询飞行门户飞行经历或左座经历，按员工和日期区间汇总起落数并导出Excel。 |
| 重点人员标注 | ✅ 可用 | 将重点人员名单叠加到审班表，按类别给命中姓名标色并追加标签，支持多工作表类别。 |
| PDF工具箱 | ✅ 可用 | 本地处理PDF页面提取、合并、PDF转图片、图片转PDF，支持多文件和顺序调整。 |
| 图片工具箱 | ✅ 可用 | 本地处理图片格式转换、压缩、尺寸调整、裁剪和Base64互转，支持批量图片。 |
| 文件批量处理 | ✅ 可用 | Python批量整理本地文件，支持重命名、修改扩展名、创建同名文件夹、移动文件和撤销最近操作。 |
| 历史航班统计 | ✅ 可用 | 从任务记录筛选指定航班，在导出表中标记匹配航班、各机长该航班最后一班和机长最后执飞。 |
| PDF加水印 | ✅ 可用 | 给PDF每页或指定页批量添加图片水印，可设置页范围、位置、大小和透明度。 |
| 自动点OA助手（测试） | ✅ 可用 | Python自动打开OA待办并循环点击“已阅”，支持有限/无限模式，异常条目保留人工处理。 |
| Word模板填充器（测试） | ✅ 可用 | 用Excel配置定义字段，把Word模板打包成可分发的表单填写小应用并导出ZIP。 |
| 账单甘特图 | ✅ 可用 | 把酒店账单住宿区间转换为时间轴甘特图，与飞行任务日程并排对照并导出Excel。 |
| 航线班次统计 | ✅ 可用 | 读取排班表和机组花名册，按人员统计各航线班次，并列出未匹配内容。 |
| 提取员工号 | ✅ 可用 | 从任意文本中提取所有6位员工号，自动去重、排序、统计数量并支持一键复制。 |
| 换季学习抽风查询助手（测试） | ✅ 可用 | Python登录培训系统批量查询换季学习记录和培训课时，导出含匹配类别、课时、状态的核对表。 |

## 本地开发

```bash
npm install
npm run build
npm test
```

## 开源协议与贡献

本项目遵循 [MIT License](./LICENSE) 开源协议。

欢迎提交 Issue 或 Pull Request 改进工具、修复问题、补充文档。贡献前建议先阅读 [贡献指南](./CONTRIBUTING.md)，并尽量说明问题场景、输入样例、期望结果和验证方式。
