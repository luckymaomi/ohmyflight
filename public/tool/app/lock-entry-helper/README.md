# 通用锁班助手

自动化填写南航飞行门户(ieb.csair.com)非生产任务录入表单的工具。

## 功能

- 批量模式：粘贴多条记录，逐条自动填表并提交
- 手动模式：单条录入
- Excel导入：从Excel文件批量导入锁班数据
- 白名单：只处理指定员工号
- 统一备注：启动时可选填写一份统一备注，输入 `OK` 确认后复用于本次全部记录
- 冲突检测：提交后检查冲突列表，遇到冲突或错误会自动跳过并记录
- 失败报告：记录并输出失败的条目

## 技术栈

- Python 3
- Playwright（浏览器自动化）
- Colorama（终端彩色输出）

## 数据格式

支持从Excel复制的数据，自动解析：
- 员工号：6位数字
- 姓名：员工号后的2-4个中文字符
- 请假类型：匹配预定义的类型映射
- 日期：支持 `2026-01-05` 和 `2026/1/5` 格式

## 页面元素

- 员工号输入框：`#showIdshowNonproductionTaskImportPage`
- 锁班类型下拉框：`#lockType`
- 开始日期：`#lockStartTime`
- 结束日期：`#lockEndTime`
- 备注输入框：`#lockReasonTxt`
- 冲突列表：`#showNonproductionTaskImportResultPage2 tbody.list tr`（有tr行表示有冲突）
- 查询结果：`#showNonproductionTaskImportResultPage1`

## 请假类型映射

```python
LEAVE_TYPE_MAP = {
    "ALV_FD-飞行员公休（订座）": "ALV_FD",
    "RECU_LVE-健康疗养": "RECU_LVE",
    "RECU_LVE_R-康复疗养": "RECU_LVE_R",
    "MAT_FA_LVE-陪产假": "MAT_FA_LVE",
    "PARENT_LVE-探亲假-探父母": "PARENT_LVE",
    "SPOUSE_LVE-探亲假-探配偶": "SPOUSE_LVE",
    "MARR_LVE-婚假": "MARR_LVE",
    "COMP_LVE-丧假": "COMP_LVE",
    "CHILD_LVE-育儿假": "CHILD_LVE",
}
```

## 运行

```bash
pip install playwright colorama
playwright install chromium
python app.py
```

可指定本地浏览器路径（如统信系统的 `/usr/bin/browser`）。

## 流程

1. 启动 → 设置浏览器路径 → 设置白名单 → 选择是否填写统一备注
2. 自动打开登录页 → 扫码登录 → 自动导航到录入页面
3. 选择批量/手动模式
4. 粘贴数据 → 确认 → 自动填表 → 提交 → 检查冲突
5. 无冲突继续下一条，有冲突或错误自动跳过并在结束后输出失败报告

## 注意事项

- 网页是Vue框架，下拉框需要触发多个事件才能生效
- 备注框有严格校验，脚本会按点击、清空、再次点击、慢速输入的方式填写
- 统信系统粘贴可能丢失换行符，程序会自动按员工号切分
- 全局无超时限制，等待元素出现后再操作
