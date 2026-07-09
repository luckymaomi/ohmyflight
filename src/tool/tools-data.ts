// 工具数据配置
// 添加新工具时，优先为每个工具创建独立目录，并在这里填写目录名 entry

const tools: ToolItem[] = [
    { name: '培训皇帝', desc: '一键排/核/预估培训，皇帝御用', entry: 'training-workbench', status: 'done' },
    { name: '审计之王', desc: '调教手册用。', entry: 'audit-king', status: 'done' },
    { name: '校对之王', desc: '对同一本手册新旧版做本地文字比对并导出差异报告', entry: 'proof-king', status: 'done' },
    { name: '姓名匹配员工号', desc: '一键识别姓名，匹配对应员工号', entry: 'crew-match-name-id', status: 'done' },
    { name: '锁班皇帝', desc: 'Python脚本，一键批量录入锁班信息', entry: 'lock-entry-helper', status: 'done' },
    { name: '飞行经历/左座经历起落数按天统计', desc: 'Python脚本，一键批量飞行经历/左座经历起落数', entry: 'flight-stats-helper', status: 'done' },
    { name: '珠海皇帝', desc: '一键核对场次表与账单表姓名人次', entry: 'session-bill-check', status: 'done' },
    { name: '酒店皇帝', desc: '一键对比酒店账单与入住登记表', entry: 'hotel-bill-check', status: 'done' },
    { name: '重点人员标注', desc: '一键标注审班表', entry: 'focus-crew', status: 'done' },
    { name: '航线班次统计', desc: '根据排班表，一键统计每人各航线班次', entry: 'crew-flight-stats', status: 'done' },
    { name: '自动点OA助手', desc: 'Python脚本，自动打开 OA 待办页并自动点击“已阅”；自动点击百分之95以上oa，部分类型（如督办）需人工处理，自动点击失败时手动完成后等待刷新即可。', entry: 'oa-read-helper', status: 'done' },
    { name: 'Word模板填充器', desc: '通用文档模板填充工具，上传配置和模板，自动生成表单并导出', entry: 'word-template-filler', status: 'done' },
    { name: 'PDF工具', desc: 'PDF预览、页面提取、转图片、合并、图片转PDF，支持旋转和批量操作', entry: 'pdf-tool', status: 'done' },
    { name: 'PDF加水印', desc: '手册工作使用，在PDF每页的相同位置添加图片，支持拖拽定位和精确数值调整', entry: 'pdf-stamp', status: 'done' },
    { name: '图片工具', desc: '图片格式转换、压缩、调整尺寸、裁剪、Base64互转，支持批量操作', entry: 'image-tool', status: 'done' },
    { name: '提取员工号', desc: '从混杂文本中提取6位数字员工号，自动去重排序，支持一键复制', entry: 'crew-extract-id', status: 'done' },
    { name: '人员结构统计', desc: '导入人员信息表，按报告口径一键生成人员结构', entry: 'personnel-structure-stats', status: 'done' }
];

window.tools = tools;
