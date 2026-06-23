// 生成应用的运行时脚本

const GeneratedAppScript = {
    generate: (config, templateFileName) => {
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
let batchRows = [];
const BATCH_TITLE_COLUMN = '文件标题';
const HAS_LOOP_FIELDS = CONFIG.fields.some(field => field.type === 'loop');
const BATCH_FIELDS = CONFIG.fields.filter(field => field.type !== 'loop');

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
function parseDateValue(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\\d+$/.test(raw) && Number(raw) > 25569) {
        const d = new Date((Number(raw) - 25569) * 86400 * 1000);
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }

    let d = null;
    if (/^\\d{8}$/.test(raw)) {
        d = new Date(raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6, 8));
    } else {
        d = new Date(raw.replace(/\\./g, '-').replace(/\\//g, '-'));
    }

    return d && !Number.isNaN(d.getTime()) ? d : null;
}

function formatDate(dateStr, format) {
    const d = parseDateValue(dateStr);
    if (!d) return '';
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

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function getFieldOptions(field) {
    return (field.options || '').split(',').map(item => item.trim()).filter(Boolean);
}

function getBatchHeader(field) {
    return field.label || field.name;
}

function getBatchValue(row, field) {
    const candidates = [field.label, field.name, '{' + field.name + '}'].filter(Boolean);
    for (const key of candidates) {
        if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    }
    return '';
}

function sanitizeFileName(value) {
    return normalizeText(value).replace(/[\\\\/:*?"<>|]/g, '_').replace(/\\s+/g, ' ').trim();
}

function normalizeBoolean(value) {
    const text = normalizeText(value).toLowerCase();
    if (!text) return { empty: true, valid: true, isYes: false };
    if (['是', 'true', '1', 'yes', 'y'].includes(text)) return { empty: false, valid: true, isYes: true };
    if (['否', 'false', '0', 'no', 'n'].includes(text)) return { empty: false, valid: true, isYes: false };
    return { empty: false, valid: false, isYes: false };
}

function splitCheckboxValue(value) {
    return normalizeText(value).split(/[，,、;；\\n\\r]+/).map(item => item.trim()).filter(Boolean);
}

function buildBatchRow(rawRow, rowNumber, index) {
    const errors = [];
    const data = {};
    const fallbackTitle = document.title + '_' + String(index + 1).padStart(3, '0');
    const title = sanitizeFileName(rawRow[BATCH_TITLE_COLUMN]) || fallbackTitle;

    BATCH_FIELDS.forEach(field => {
        const rawValue = getBatchValue(rawRow, field);
        const value = normalizeText(rawValue) || normalizeText(field.defaultValue);
        const isEmpty = !value;

        if (field.required && isEmpty) {
            errors.push(getBatchHeader(field) + '不能为空');
        }

        switch (field.type) {
            case 'text':
            case 'textarea':
                data[field.name] = value;
                break;
            case 'date': {
                const formatted = value ? formatDate(rawValue || field.defaultValue, field.format) : '';
                if (value && !formatted) errors.push(getBatchHeader(field) + '不是有效日期');
                data[field.name] = formatted;
                break;
            }
            case 'boolean': {
                const boolValue = normalizeBoolean(value);
                if (!boolValue.valid) errors.push(getBatchHeader(field) + '只能填写 是/否');
                data[field.name] = boolValue.isYes ? '是' : '否';
                data[field.name + 'Pass'] = boolValue.isYes ? '☑' : '□';
                data[field.name + 'Fail'] = boolValue.isYes ? '□' : '☑';
                break;
            }
            case 'radio': {
                const options = getFieldOptions(field);
                if (value && options.length && !options.includes(value)) {
                    errors.push(getBatchHeader(field) + '选项无效：' + value);
                }
                data[field.name] = value;
                options.forEach(opt => {
                    data[field.name + '_' + opt] = value === opt ? '☑' : '□';
                });
                break;
            }
            case 'checkbox': {
                const options = getFieldOptions(field);
                const values = splitCheckboxValue(value);
                const invalidValues = values.filter(item => options.length && !options.includes(item));
                if (invalidValues.length) {
                    errors.push(getBatchHeader(field) + '包含无效选项：' + invalidValues.join('、'));
                }
                data[field.name] = values.join('、');
                options.forEach(opt => {
                    data[field.name + '_' + opt] = values.includes(opt) ? '☑' : '□';
                });
                break;
            }
        }
    });

    return {
        rowNumber,
        title,
        fileName: title + '.docx',
        data,
        errors
    };
}

function buildBatchRows(workbook) {
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Excel没有工作表');

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: '',
        raw: true
    }).filter(row => Object.values(row).some(value => normalizeText(value)));

    return rows.map((row, index) => buildBatchRow(row, index + 2, index));
}

function renderBatchPreview() {
    const preview = document.getElementById('batchPreview');
    const status = document.getElementById('batchStatus');
    const exportBtn = document.getElementById('exportBatchBtn');
    const errorRows = batchRows.filter(row => row.errors.length);

    if (!batchRows.length) {
        preview.style.display = 'none';
        status.className = 'batch-status';
        status.textContent = '没有读取到可导出的数据行。';
        exportBtn.disabled = true;
        return;
    }

    status.className = 'batch-status ' + (errorRows.length ? 'error' : 'success');
    status.textContent = '共读取 ' + batchRows.length + ' 行，' + (batchRows.length - errorRows.length) + ' 行可导出，' + errorRows.length + ' 行需修正。';
    exportBtn.disabled = errorRows.length > 0;

    const rowsHtml = batchRows.slice(0, 20).map(row => {
        const state = row.errors.length ? '需修正' : '可导出';
        const detail = row.errors.length ? row.errors.join('；') : row.fileName;
        const stateClass = row.errors.length ? 'error' : 'success';
        return '<tr><td>第' + row.rowNumber + '行</td><td>' + escapeHtml(row.title) + '</td><td class="' + stateClass + '">' + state + '</td><td>' + escapeHtml(detail) + '</td></tr>';
    }).join('');

    preview.innerHTML = '<thead><tr><th>来源行</th><th>文件标题</th><th>状态</th><th>说明</th></tr></thead><tbody>' + rowsHtml + '</tbody>';
    preview.style.display = 'table';
}

function handleBatchFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const result = event.target?.result;
            if (!(result instanceof ArrayBuffer)) throw new Error('文件读取失败');
            const workbook = XLSX.read(new Uint8Array(result), { type: 'array', cellDates: true });
            batchRows = buildBatchRows(workbook);
            renderBatchPreview();
        } catch (error) {
            batchRows = [];
            const status = document.getElementById('batchStatus');
            document.getElementById('batchPreview').style.display = 'none';
            document.getElementById('exportBatchBtn').disabled = true;
            status.className = 'batch-status error';
            status.textContent = '导入失败：' + error.message;
        }
    };
    reader.readAsArrayBuffer(file);
}

function renderWord(data, outputType) {
    const zip = new PizZip(templateData);
    const doc = new window.docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => ''
    });

    doc.render(data);

    return doc.getZip().generate({
        type: outputType,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

async function exportBatchWords() {
    if (!templateData) {
        alert('请先导入模板文件！');
        return;
    }
    if (!batchRows.length || batchRows.some(row => row.errors.length)) {
        alert('请先导入无错误的批量Excel。');
        return;
    }

    const outputZip = new JSZip();
    const usedNames = new Set();
    const manifest = [['来源行', '文件名', '状态', '说明']];

    batchRows.forEach(row => {
        let safeBaseName = sanitizeFileName(row.title) || sanitizeFileName(document.title);
        let fileName = safeBaseName + '.docx';
        let suffix = 2;
        while (usedNames.has(fileName)) {
            fileName = safeBaseName + '_' + suffix + '.docx';
            suffix += 1;
        }
        usedNames.add(fileName);

        try {
            outputZip.file(fileName, renderWord(row.data, 'arraybuffer'));
            manifest.push([row.rowNumber, fileName, '成功', '']);
        } catch (error) {
            manifest.push([row.rowNumber, fileName, '失败', error.message]);
        }
    });

    const manifestText = '\\uFEFF' + manifest.map(row => row.map(cell => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(',')).join('\\r\\n');
    outputZip.file('导出结果清单.csv', manifestText);

    const blob = await outputZip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, document.title + '_批量导出_' + timestamp + '.zip');
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
        const blob = renderWord(data, 'blob');
        const timestamp = new Date().toISOString().slice(0, 10);
        downloadBlob(blob, document.title + '_' + timestamp + '.docx');
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

if (HAS_LOOP_FIELDS) {
    document.getElementById('batchUnsupported').style.display = 'block';
    document.getElementById('batchSupported').style.display = 'none';
} else {
    document.getElementById('batchFile').addEventListener('change', function(e) {
        handleBatchFile(e.target.files[0]);
    });
    document.getElementById('exportBatchBtn').addEventListener('click', exportBatchWords);
}

// 设置日期字段默认值为今天
CONFIG.fields.filter(f => f.type === 'date').forEach(field => {
    const el = document.getElementById(field.name);
    if (el && !el.value) el.valueAsDate = new Date();
});
`;
    }
};
