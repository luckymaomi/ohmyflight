# Word 模板填充器开发规格

## 产品边界

`word-template-filler` 不是直接填一份 Word，而是把字段配置 Excel 与 `.docx` 模板打包成可离线分发的表单应用。生成应用支持单份填写；配置不含列表/循环字段时，还支持 Excel 批量导入并批量生成 Word。

## 生成器输入

- 配置文件支持 `.xlsx`、`.xls`，字段规则由页面下载的配置模板定义。
- Word 输入必须为 `.docx`，占位符使用 `{字段名}`。
- 应用名称必填，用于生成页面标题、包名和缺省导出文件名。
- 配置解析后先显示字段预览；配置或模板无效时不启用生成。

## 生成包契约

ZIP 包包含可直接打开的 HTML、原 Word 模板、本地依赖和使用说明。配置可批量时，包内还包含与配置同步生成的批量 Excel 模板，其第一列固定为 `文件标题`。

生成应用必须保持以下行为：

- 单份模式按字段类型校验表单，替换模板占位符并导出一个 Word。
- 批量模式只读取随包模板对应的列；每行生成一份 Word，最终打包 ZIP。
- `文件标题` 非空时决定单份文件名；为空时使用“应用名 + 序号”。
- 选项字段必须命中配置选项，否则该行报错。
- 日期字段接受 Excel 日期单元格、Excel serial、`YYYY/M/D`、`YYYY-M-D`、`YYYY.M.D`、`YYYYMMDD`。
- `5/11/26` 等地区含义不明确的短日期无效。
- 文本字段若由 SheetJS 读成日期对象，稳定输出 `YYYY-MM-DD`，不得泄漏 JavaScript Date 字符串。

## 列表/循环边界

- 单份填写支持列表/循环字段。
- 第一版批量导入不支持列表/循环字段；只要配置包含该类型，生成应用就禁用批量区并明确说明原因。
- 不通过隐式展开或忽略字段伪装为批量成功。

## 模块边界

- 配置：`src/tool/app/word-template-filler/config-parser.ts`、`config-template.ts`
- 生成器：`html-generator.ts`、`app-packager.ts`、`generated-app-*.ts`
- 页面入口：`public/tool/app/word-template-filler/index.html`、`src/tool/app/word-template-filler/main.ts`
- 测试：`tests/tool/word-template-filler/generated-batch.test.ts`
