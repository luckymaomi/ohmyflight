// HTML页面生成器
// 根据配置生成完整的、可独立运行的HTML文件

const HtmlGenerator = {
    // 生成完整HTML（独立版本，使用CDN）
    generate: (config, appName, templateFileName) => {
        const formHtml = HtmlGenerator.generateFormHtml(config);
        const jsCode = HtmlGenerator.generateJsCode(config, templateFileName);
        
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        }
        body {
            background: #f6f8fa;
            min-height: 100vh;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container { max-width: 800px; width: 100%; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 24px;
            padding: 16px;
            background: #ffffff;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            position: relative;
        }
        .header h1 { color: #1f2328; font-size: 24px; font-weight: 600; }
        .header p { color: #656d76; font-size: 14px; margin-top: 8px; }
        .panel {
            background: #ffffff;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            padding: 20px;
        }
        .form-group { margin-bottom: 16px; }
        .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #1f2328;
            margin-bottom: 6px;
        }
        .form-group input[type="text"],
        .form-group input[type="date"],
        .form-group textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
        }
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .form-group textarea { min-height: 80px; resize: vertical; }
        .radio-group, .checkbox-group { display: flex; gap: 16px; flex-wrap: wrap; }
        .checkbox-group { flex-direction: column; gap: 8px; }
        .radio-group label, .checkbox-group label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: normal;
            cursor: pointer;
        }
        .loop-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 14px;
        }
        .loop-table th, .loop-table td {
            border: 1px solid #d0d7de;
            padding: 8px;
            text-align: left;
        }
        .loop-table th { background: #f6f8fa; font-weight: 500; }
        .loop-table input, .loop-table textarea, .loop-table select {
            width: 100%;
            border: none;
            padding: 4px;
            font-size: 14px;
            font-family: inherit;
            background: transparent;
        }
        .loop-table input:focus, .loop-table textarea:focus, .loop-table select:focus {
            outline: none;
            background: #f0f6ff;
        }
        .btn {
            padding: 8px 16px;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            background: #f6f8fa;
            color: #1f2328;
            transition: all 0.2s;
        }
        .btn:hover { border-color: #2563eb; color: #2563eb; }
        .btn-primary { background: #2563eb; border-color: #2563eb; color: white; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-sm { padding: 4px 10px; font-size: 13px; }
        .btn-danger { background: #cf222e; color: #fff; border: none; }
        .btn-danger:hover { background: #a40e26; }
        .button-group { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 24px; }
        .required { color: #cf222e; margin-left: 2px; }
        .upload-hint {
            background: #f6f8fa;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
            font-size: 14px;
            color: #656d76;
        }
        .upload-hint label { color: #2563eb; cursor: pointer; text-decoration: underline; }
        .upload-hint .file-name { color: #1f2328; font-weight: 500; margin-left: 8px; }
        @media (max-width: 768px) {
            .button-group { flex-direction: column; }
            .btn { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${appName}</h1>
            <p>填写完成后可导出为Word文档</p>
        </div>

        <div class="panel">
            <div id="uploadHint" class="upload-hint" style="display:none;">
                模板文件未找到，请<label>点击上传模板<input type="file" id="templateFile" accept=".docx" style="display:none;"></label>（${templateFileName}）<span id="uploadedFileName" class="file-name"></span>
            </div>
${formHtml}
            <div class="button-group">
                <button class="btn btn-primary" id="exportBtn">导出Word文档</button>
                <button class="btn" id="clearBtn">清空表单</button>
            </div>
        </div>
    </div>

    <script src="libs/pizzip.min.js"><\/script>
    <script src="libs/docxtemplater.min.js"><\/script>
    <script>
${jsCode}
    <\/script>
</body>
</html>`;
    },

    // 生成表单HTML
    generateFormHtml: (config) => {
        let html = '';
        
        config.fields.forEach(field => {
            switch (field.type) {
                case 'text':
                    html += HtmlGenerator.textField(field);
                    break;
                case 'textarea':
                    html += HtmlGenerator.textareaField(field);
                    break;
                case 'date':
                    html += HtmlGenerator.dateField(field);
                    break;
                case 'boolean':
                    html += HtmlGenerator.booleanField(field);
                    break;
                case 'radio':
                    html += HtmlGenerator.radioField(field);
                    break;
                case 'checkbox':
                    html += HtmlGenerator.checkboxField(field);
                    break;
                case 'loop':
                    const subFields = config.loopFields[field.name] || [];
                    html += HtmlGenerator.loopField(field, subFields);
                    break;
            }
        });
        
        return html;
    },

    // 文本字段
    textField: (field) => `
            <div class="form-group">
                <label>${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
                <input type="text" id="${field.name}" placeholder="${field.placeholder || ''}" value="${field.defaultValue || ''}">
            </div>
`,

    // 多行文本
    textareaField: (field) => `
            <div class="form-group">
                <label>${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
                <textarea id="${field.name}" placeholder="${field.placeholder || ''}" rows="${field.rows || 3}">${field.defaultValue || ''}</textarea>
            </div>
`,

    // 日期字段
    dateField: (field) => `
            <div class="form-group">
                <label>${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
                <input type="date" id="${field.name}">
            </div>
`,

    // 布尔字段
    booleanField: (field) => {
        const isYesDefault = field.defaultValue === '是' || field.defaultValue === 'true' || field.defaultValue === true;
        return `
            <div class="form-group">
                <label>${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
                <div class="radio-group">
                    <label><input type="radio" name="${field.name}" value="是" ${isYesDefault ? 'checked' : ''}> 是</label>
                    <label><input type="radio" name="${field.name}" value="否" ${!isYesDefault ? 'checked' : ''}> 否</label>
                </div>
            </div>
`;
    },

    // 单选字段
    radioField: (field) => {
        const options = (field.options || '').split(',').map(o => o.trim()).filter(o => o);
        const optionsHtml = options.map((opt, i) => 
            `<label><input type="radio" name="${field.name}" value="${opt}" ${(field.defaultValue === opt) || (i === 0 && !field.defaultValue) ? 'checked' : ''}> ${opt}</label>`
        ).join('\n                    ');
        
        return `
            <div class="form-group">
                <label>${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
                <div class="radio-group">
                    ${optionsHtml}
                </div>
            </div>
`;
    },

    // 多选字段
    checkboxField: (field) => {
        const options = (field.options || '').split(',').map(o => o.trim()).filter(o => o);
        const defaults = (field.defaultValue || '').split(',').map(o => o.trim());
        const optionsHtml = options.map(opt => 
            `<label><input type="checkbox" name="${field.name}" value="${opt}" ${defaults.includes(opt) ? 'checked' : ''}> ${opt}</label>`
        ).join('\n                    ');
        
        return `
            <div class="form-group">
                <label>${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
                <div class="checkbox-group">
                    ${optionsHtml}
                </div>
            </div>
`;
    },

    // 循环列表字段
    loopField: (field, subFields) => {
        const headerHtml = subFields.map(sf => `<th>${sf.label}</th>`).join('');
        
        return `
            <div class="form-group">
                <label>${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>
                <table class="loop-table" id="table_${field.name}">
                    <thead><tr>${headerHtml}<th style="width:60px">操作</th></tr></thead>
                    <tbody></tbody>
                </table>
                <button type="button" class="btn btn-sm" onclick="addLoopRow('${field.name}')">+ 添加行</button>
            </div>
`;
    },

    // 生成JS代码
    generateJsCode: (config, templateFileName) => {
        const fieldsJson = JSON.stringify(config.fields);
        const loopFieldsJson = JSON.stringify(config.loopFields);
        
        return `
// 配置数据
const CONFIG = {
    fields: ${fieldsJson},
    loopFields: ${loopFieldsJson}
};

const TEMPLATE_FILE = '${templateFileName}';
let templateData = null;

// 页面加载时尝试加载模板
async function loadTemplate() {
    try {
        const resp = await fetch(TEMPLATE_FILE);
        if (!resp.ok) throw new Error('模板文件不存在');
        const blob = await resp.blob();
        templateData = await blob.arrayBuffer();
        console.log('模板加载成功');
    } catch (e) {
        console.warn('自动加载模板失败，需要手动上传:', e.message);
        document.getElementById('uploadHint').style.display = 'block';
    }
}
loadTemplate();

// 手动上传模板
document.getElementById('templateFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        templateData = await file.arrayBuffer();
        document.getElementById('uploadedFileName').textContent = '已选择: ' + file.name;
    }
});

// 循环列表管理
function addLoopRow(fieldName) {
    const subFields = CONFIG.loopFields[fieldName] || [];
    const tbody = document.querySelector('#table_' + fieldName + ' tbody');
    const tr = document.createElement('tr');
    
    subFields.forEach(sf => {
        const td = document.createElement('td');
        if (sf.type === 'textarea') {
            td.innerHTML = '<textarea style="min-height:60px"></textarea>';
        } else if (sf.type === 'radio') {
            const opts = (sf.options || '').split(',').map(o => o.trim()).filter(o => o);
            td.innerHTML = '<select>' + opts.map((o,i) => '<option' + (i===0?' selected':'') + '>' + o + '</option>').join('') + '</select>';
        } else {
            td.innerHTML = '<input type="' + (sf.type === 'date' ? 'date' : 'text') + '">';
        }
        tr.appendChild(td);
    });
    
    const actionTd = document.createElement('td');
    actionTd.innerHTML = '<button type="button" class="btn btn-sm btn-danger" onclick="this.closest(\\'tr\\').remove()">删除</button>';
    tr.appendChild(actionTd);
    
    tbody.appendChild(tr);
}

// 初始化循环列表
CONFIG.fields.filter(f => f.type === 'loop').forEach(field => {
    addLoopRow(field.name);
});

// 日期格式化
function formatDate(dateStr, format) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    format = format || 'YYYY年MM月DD日';
    return format
        .replace('YYYY', d.getFullYear())
        .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
        .replace('DD', String(d.getDate()).padStart(2, '0'));
}

// 收集表单数据
function collectFormData() {
    const data = {};
    
    CONFIG.fields.forEach(field => {
        switch (field.type) {
            case 'text':
            case 'textarea':
                data[field.name] = document.getElementById(field.name)?.value || '';
                break;
            case 'date':
                const dateVal = document.getElementById(field.name)?.value || '';
                data[field.name] = formatDate(dateVal, field.format);
                break;
            case 'boolean':
                const boolVal = document.querySelector('input[name="' + field.name + '"]:checked')?.value;
                const isYes = boolVal === '是';
                data[field.name] = isYes ? '是' : '否';
                data[field.name + 'Pass'] = isYes ? '☑' : '□';
                data[field.name + 'Fail'] = isYes ? '□' : '☑';
                break;
            case 'radio':
                const radioVal = document.querySelector('input[name="' + field.name + '"]:checked')?.value || '';
                data[field.name] = radioVal;
                (field.options || '').split(',').forEach(opt => {
                    opt = opt.trim();
                    if (opt) data[field.name + '_' + opt] = (radioVal === opt) ? '☑' : '□';
                });
                break;
            case 'checkbox':
                const checked = document.querySelectorAll('input[name="' + field.name + '"]:checked');
                const checkedVals = Array.from(checked).map(el => el.value);
                data[field.name] = checkedVals.join('、');
                (field.options || '').split(',').forEach(opt => {
                    opt = opt.trim();
                    if (opt) data[field.name + '_' + opt] = checkedVals.includes(opt) ? '☑' : '□';
                });
                break;
            case 'loop':
                const subFields = CONFIG.loopFields[field.name] || [];
                const tbody = document.querySelector('#table_' + field.name + ' tbody');
                const rows = tbody?.querySelectorAll('tr') || [];
                data[field.name] = Array.from(rows).map(row => {
                    const rowData = {};
                    subFields.forEach((sf, i) => {
                        const input = row.querySelectorAll('input, textarea, select')[i];
                        let val = input?.value || '';
                        if (sf.type === 'date') val = formatDate(val, sf.format);
                        rowData[sf.name] = val;
                    });
                    return rowData;
                });
                break;
        }
    });
    
    return data;
}

// 导出Word
document.getElementById('exportBtn').addEventListener('click', async function() {
    if (!templateData) {
        alert('请先导入模板文件！');
        return;
    }
    
    const data = collectFormData();
    console.log('导出数据:', data);
    
    try {
        const zip = new PizZip(templateData);
        const doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ''
        });
        
        doc.render(data);
        
        const blob = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().slice(0, 10);
        a.download = document.title + '_' + timestamp + '.docx';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        alert('导出失败：' + error.message);
    }
});

// 清空表单
document.getElementById('clearBtn').addEventListener('click', function() {
    if (confirm('确定要清空所有填写内容吗？')) {
        document.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
            el.value = '';
        });
        // 重置每组radio的第一个为选中状态
        const radioGroups = {};
        document.querySelectorAll('input[type="radio"]').forEach(el => {
            const name = el.name;
            if (!radioGroups[name]) {
                radioGroups[name] = true;
                el.checked = true;
            } else {
                el.checked = false;
            }
        });
        document.querySelectorAll('input[type="checkbox"]').forEach(el => {
            el.checked = false;
        });
        CONFIG.fields.filter(f => f.type === 'loop').forEach(field => {
            const tbody = document.querySelector('#table_' + field.name + ' tbody');
            if (tbody) {
                tbody.innerHTML = '';
                addLoopRow(field.name);
            }
        });
    }
});

// 设置日期字段默认值为今天
CONFIG.fields.filter(f => f.type === 'date').forEach(field => {
    const el = document.getElementById(field.name);
    if (el && !el.value) el.valueAsDate = new Date();
});
`;
    }
};
