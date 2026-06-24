// 生成应用运行时：配置和全局状态

const GeneratedAppRuntimeState = {
    generate: (fieldsJson, loopFieldsJson, templateFileName) => `
// 配置数据
const CONFIG = {
    fields: ${fieldsJson},
    loopFields: ${loopFieldsJson}
};

const TEMPLATE_FILE = '${templateFileName}';
let templateData = null;
let batchRows = [];
let batchPreviewExpanded = false;
const BATCH_TITLE_COLUMN = '文件标题';
const BATCH_PREVIEW_COLLAPSED_LIMIT = 20;
const HAS_LOOP_FIELDS = CONFIG.fields.some(field => field.type === 'loop');
const BATCH_FIELDS = CONFIG.fields.filter(field => field.type !== 'loop');
`
};
