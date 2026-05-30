# 通用锁班助手

## 功能

自动填写飞行门户的非生产任务录入表单，支持批量锁班、手动单条录入和 Excel 导入。

## 运行方式

- 打开 `tool/app/lock-entry-helper/index.html` 下载脚本和模板
- `app.py` 是原始助手，稳定单页流程，支持批量、手动、Excel 导入三种模式。
- `superapp.py` 是并发助手，默认 20 个页面并发录入，适合大量数据提速。
- 原始助手运行命令：

```bash
python app.py
```

- 并发助手运行命令：

```bash
python superapp.py
```

## 输入

- 批量粘贴文本，或 Excel 模板
- 每条记录至少包含：
  - 员工号
  - 姓名
  - 锁班类型
  - 开始日期
  - 结束日期
- 可选输入：
  - 白名单员工号
  - 统一备注

## 输出

- 自动提交到飞行门户
- 终端里的成功 / 失败提示
- `app.py` 原始助手结束后生成失败记录文本日志，便于复制重跑失败项
- `superapp.py` 并发助手会新建结果 Excel
- `superapp.py` 每处理一条记录就实时写入一行结果，不回写原始 Excel
- `superapp.py` 成功记录备注为空
- `superapp.py` 冲突或错误记录会写入备注；冲突记录会写入门户冲突列表里的“冲突”列内容

## 页面元素

- 员工号输入框：`#showIdshowNonproductionTaskImportPage`
- 锁班类型下拉框：`#lockType`
- 开始日期：`#lockStartTime`
- 结束日期：`#lockEndTime`
- 备注输入框：`#lockReasonTxt`
- 冲突列表：`#showNonproductionTaskImportResultPage2 tbody.list tr`
- 查询结果：`#showNonproductionTaskImportResultPage1`

## 输入输出样例

输入样例：

```text
123456 张三 ALV 2026-04-20 2026-04-22
654321 李四 MAT_FA_LVE 2026-04-21 2026-04-21
```

输出样例：

```text
张三：录入成功
李四：发现冲突，已跳过
失败记录日志或并发结果 Excel 已保存到本地
```

## 使用要点

- 启动后先完成浏览器路径、白名单、统一备注等设置，再登录门户并进入非生产任务录入页面，最后才导入或粘贴锁班记录
- 统一备注确认一次后，可复用于本轮全部记录
- 遇到冲突不会强行提交，适合批量安全处理
- Excel导入只读取原文件，不回写原文件；并发助手的处理结果写入新建结果 Excel
- 网页是 Vue 表单，下拉框和输入框需要触发页面事件后再提交

