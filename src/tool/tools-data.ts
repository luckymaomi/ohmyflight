// 工具数据配置
// 添加新工具时，优先为每个工具创建独立目录，并在这里填写目录名 entry

const tools: ToolSection[] = [
    {
        category: 'common',
        categoryName: '常用',
        items: [
            { name: '姓名匹配员工号', desc: '从混杂文本中识别姓名，并匹配对应员工号，支持一键复制', entry: 'crew-match-name-id' },
            { name: '通用锁班助手（测试）', desc: 'Python脚本，自动化填写飞行门户非生产任务录入表单，支持批量录入锁班信息', entry: 'lock-entry-helper' },
            { name: '飞行经历/左座经历起落数按天统计（测试）', desc: 'Python脚本，自动化查询飞行门户飞行经历/左座经历起落数并按天统计', entry: 'flight-stats-helper' },
            { name: '酒店账单核对', desc: '对比酒店账单与入住登记表，核对用', entry: 'hotel-bill-check' },
            { name: '重点人员标注', desc: '根据重点人员表对审班表进行颜色标注，支持多类别标记', entry: 'focus-crew' },
            { name: '超级培训', desc: '面向培训总表的一体化工具，支持排班总览、到期清单、有效期更新、预排班和计划核对', entry: 'super-training-test' }
        ]
    },
    {
        category: 'other',
        categoryName: '其他',
        items: [
            { name: 'PDF工具箱', desc: 'PDF预览、页面提取、转图片、合并、图片转PDF，支持旋转和批量操作', entry: 'pdf-tool' },
            { name: '图片工具箱', desc: '图片格式转换、压缩、调整尺寸、裁剪、Base64互转，支持批量操作', entry: 'image-tool' },
            { name: '文件批量处理', desc: 'Python工具，批量重命名文件（添加前缀/后缀/删除/替换字符），创建同名文件夹，支持大量文件处理', entry: 'file-batch-tool' },
            { name: '历史航班统计', desc: '根据航班号和截止日期筛选任务记录，三色标记匹配航班、各航班最后一班、机长最后执飞', entry: 'flight-filter' },
            { name: 'PDF加水印', desc: '手册工作使用，在PDF每页的相同位置添加图片，支持拖拽定位和精确数值调整', entry: 'pdf-stamp' },
            { name: '自动点OA助手（测试）', desc: 'Python脚本，自动打开 OA 待办页并自动点击“已阅”；自动点击百分之95以上oa，部分类型（如督办）需人工处理，自动点击失败时手动完成后等待刷新即可。', entry: 'oa-read-helper' },
            { name: 'Word模板填充器（测试）', desc: '通用文档模板填充工具，上传配置和模板，自动生成表单并导出，具体使用方法请仔细阅读文档！', entry: 'word-template-filler' },
            { name: '账单甘特图', desc: '将酒店账单转换为甘特图，与飞行任务日程对比审核', entry: 'bill-gantt' },
            { name: '航线班次统计', desc: '根据排班表统计每人各航线班次', entry: 'crew-flight-stats' },
            { name: '提取员工号', desc: '从混杂文本中提取6位数字员工号，自动去重排序，支持一键复制', entry: 'crew-extract-id' },
            { name: '换季学习抽风查询助手（测试）', desc: 'Python脚本，登录培训系统后批量查询换季学习记录和培训课时，并导出 Excel 核对结果。', entry: 'seasonal-learning-check-test' }
        ]
    }
];

window.tools = tools;
