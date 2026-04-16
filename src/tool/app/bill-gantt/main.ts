// 账单甘特图生成

type BillGanttWorkbook = import("xlsx-js-style").WorkBook;
type BillGanttJsonRow = unknown[];

interface BillGanttCell {
    value: string;
    isHotel: boolean;
}

interface BillGanttResultRow {
    type: 'task' | 'hotel';
    name: string;
    cells: BillGanttCell[];
}

interface BillGanttResult {
    dateHeaders: string[];
    rows: BillGanttResultRow[];
    stats: {
        totalPersons: number;
        totalRecords: number;
        totalDays: number;
    };
}

interface BillGanttElements {
    scheduleFile: HTMLInputElement;
    billFile: HTMLInputElement;
    scheduleHeaderRow: HTMLInputElement;
    billHeaderRow: HTMLInputElement;
    generateBtn: HTMLButtonElement;
    exportBtn: HTMLButtonElement;
    scheduleStatus: HTMLElement;
    billStatus: HTMLElement;
    scheduleConfigSection: HTMLElement;
    billConfigSection: HTMLElement;
    actionSection: HTMLElement;
    schedulePreview: HTMLTableElement;
    billPreview: HTMLTableElement;
    scheduleNameCol: HTMLSelectElement;
    scheduleDateStartCol: HTMLSelectElement;
    billNameCol: HTMLSelectElement;
    billCheckinCol: HTMLSelectElement;
    billCheckoutCol: HTMLSelectElement;
    billReasonCol: HTMLSelectElement;
    totalPersons: HTMLElement;
    totalRecords: HTMLElement;
    totalDays: HTMLElement;
    resultTable: HTMLTableElement;
    resultSection: HTMLElement;
}

interface BillGanttBillEntry {
    checkin: Date;
    checkout: Date;
    reason: string;
}

let scheduleWorkbook: BillGanttWorkbook | null = null;
let billWorkbook: BillGanttWorkbook | null = null;
let scheduleData: BillGanttJsonRow[] = [];
let billData: BillGanttJsonRow[] = [];
let scheduleColumns: string[] = [];
let billColumns: string[] = [];
let ganttResult: BillGanttResult | null = null;

const elements: BillGanttElements = {
    scheduleFile: requireElement('scheduleFile', HTMLInputElement),
    billFile: requireElement('billFile', HTMLInputElement),
    scheduleHeaderRow: requireElement('scheduleHeaderRow', HTMLInputElement),
    billHeaderRow: requireElement('billHeaderRow', HTMLInputElement),
    generateBtn: requireElement('generateBtn', HTMLButtonElement),
    exportBtn: requireElement('exportBtn', HTMLButtonElement),
    scheduleStatus: requireElement('scheduleStatus', HTMLElement),
    billStatus: requireElement('billStatus', HTMLElement),
    scheduleConfigSection: requireElement('scheduleConfigSection', HTMLElement),
    billConfigSection: requireElement('billConfigSection', HTMLElement),
    actionSection: requireElement('actionSection', HTMLElement),
    schedulePreview: requireElement('schedulePreview', HTMLTableElement),
    billPreview: requireElement('billPreview', HTMLTableElement),
    scheduleNameCol: requireElement('scheduleNameCol', HTMLSelectElement),
    scheduleDateStartCol: requireElement('scheduleDateStartCol', HTMLSelectElement),
    billNameCol: requireElement('billNameCol', HTMLSelectElement),
    billCheckinCol: requireElement('billCheckinCol', HTMLSelectElement),
    billCheckoutCol: requireElement('billCheckoutCol', HTMLSelectElement),
    billReasonCol: requireElement('billReasonCol', HTMLSelectElement),
    totalPersons: requireElement('totalPersons', HTMLElement),
    totalRecords: requireElement('totalRecords', HTMLElement),
    totalDays: requireElement('totalDays', HTMLElement),
    resultTable: requireElement('resultTable', HTMLTableElement),
    resultSection: requireElement('resultSection', HTMLElement)
};

document.addEventListener('DOMContentLoaded', function() {
    elements.scheduleFile.addEventListener('change', handleScheduleFile);
    elements.billFile.addEventListener('change', handleBillFile);
    elements.scheduleHeaderRow.addEventListener('change', loadSchedulePreview);
    elements.billHeaderRow.addEventListener('change', loadBillPreview);
    elements.generateBtn.addEventListener('click', generateGantt);
    elements.exportBtn.addEventListener('click', exportExcel);
});

function requireElement<T extends HTMLElement>(id: string, Type: { new(): T }): T {
    const element = document.getElementById(id);
    if (!(element instanceof Type)) {
        throw new Error(`页面缺少必要元素：${id}`);
    }
    return element;
}

function showStatus(id: 'scheduleStatus' | 'billStatus', msg: string, type: 'success' | 'error') {
    const el = elements[id];
    el.textContent = msg;
    el.className = 'status status-' + type;
}

async function handleScheduleFile(e: Event) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    if (!file) return;

    try {
        const data = new Uint8Array(await file.arrayBuffer());
        scheduleWorkbook = XLSX.read(data, {type: 'array'});
        showStatus('scheduleStatus', '✓ 文件读取成功: ' + file.name, 'success');
        loadSchedulePreview();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatus('scheduleStatus', '✗ 文件解析失败: ' + message, 'error');
    }
}

async function handleBillFile(e: Event) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    if (!file) return;

    try {
        const data = new Uint8Array(await file.arrayBuffer());
        billWorkbook = XLSX.read(data, {type: 'array'});
        showStatus('billStatus', '✓ 文件读取成功: ' + file.name, 'success');
        loadBillPreview();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatus('billStatus', '✗ 文件解析失败: ' + message, 'error');
    }
}

function loadSchedulePreview() {
    if (!scheduleWorkbook) return;
    const headerRow = Number.parseInt(elements.scheduleHeaderRow.value, 10) || 0;
    const sheet = scheduleWorkbook.Sheets[scheduleWorkbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<BillGanttJsonRow>(sheet, {header: 1, raw: false, dateNF: 'yyyy-mm-dd'});
    
    if (json.length <= headerRow) {
        showStatus('scheduleStatus', '✗ 表头行超出数据范围', 'error');
        return;
    }
    
    scheduleColumns = (json[headerRow] || []).map((c, i) => c ? String(c) : '列' + (i+1));
    scheduleData = json.slice(headerRow + 1);
    
    console.log('[schedule] columns', scheduleColumns);
    console.log('[schedule] sample rows', scheduleData.slice(0, 5));

    renderPreview(elements.schedulePreview, scheduleColumns, scheduleData);
    renderScheduleSelectors();
    
    elements.scheduleConfigSection.classList.remove('hidden');
    checkAllReady();
}

function loadBillPreview() {
    if (!billWorkbook) return;
    const headerRow = Number.parseInt(elements.billHeaderRow.value, 10) || 0;
    const sheet = billWorkbook.Sheets[billWorkbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<BillGanttJsonRow>(sheet, {header: 1, raw: false, dateNF: 'yyyy-mm-dd'});
    
    if (json.length <= headerRow) {
        showStatus('billStatus', '✗ 表头行超出数据范围', 'error');
        return;
    }
    
    billColumns = (json[headerRow] || []).map((c, i) => c ? String(c) : '列' + (i+1));
    billData = json.slice(headerRow + 1);
    
    console.log('[bill] columns', billColumns);
    console.log('[bill] sample rows', billData.slice(0, 5));

    renderPreview(elements.billPreview, billColumns, billData);
    renderBillSelectors();
    
    elements.billConfigSection.classList.remove('hidden');
    checkAllReady();
}

function renderPreview(table: HTMLTableElement, columns: string[], rows: BillGanttJsonRow[]) {
    let html = '<thead><tr>';
    columns.forEach((col, i) => { html += '<th title="列索引:' + i + '">' + col + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        columns.forEach((_, i) => {
            const val = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
            html += '<td title="' + val + '">' + (val.length > 15 ? val.substring(0,15) + '..' : val) + '</td>';
        });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
}

function renderScheduleSelectors() {
    const nameSelect = elements.scheduleNameCol;
    const dateStartSelect = elements.scheduleDateStartCol;
    
    nameSelect.innerHTML = '<option value="">请选择...</option>';
    dateStartSelect.innerHTML = '<option value="">请选择...</option>';
    
    scheduleColumns.forEach((col, i) => {
        nameSelect.innerHTML += '<option value="' + i + '">' + col + '</option>';
        dateStartSelect.innerHTML += '<option value="' + i + '">' + col + '</option>';
    });
    
    // 自动识别
    scheduleColumns.forEach((col, i) => {
        if (col === '姓名') nameSelect.value = String(i);
        if (/^1[日号]$/.test(col)) dateStartSelect.value = String(i);
    });
}

function renderBillSelectors() {
    const nameSelect = elements.billNameCol;
    const checkinSelect = elements.billCheckinCol;
    const checkoutSelect = elements.billCheckoutCol;
    const reasonSelect = elements.billReasonCol;
    
    [nameSelect, checkinSelect, checkoutSelect, reasonSelect].forEach(sel => {
        sel.innerHTML = '<option value="">请选择...</option>';
    });
    reasonSelect.innerHTML += '<option value="-1">（不显示事由）</option>';
    
    billColumns.forEach((col, i) => {
        const opt = '<option value="' + i + '">' + col + '</option>';
        nameSelect.innerHTML += opt;
        checkinSelect.innerHTML += opt;
        checkoutSelect.innerHTML += opt;
        reasonSelect.innerHTML += opt;
    });
    
    // 自动识别
    billColumns.forEach((col, i) => {
        if (col.includes('入住人员') || col === '姓名') nameSelect.value = String(i);
        if (col.includes('入住时间')) checkinSelect.value = String(i);
        if (col.includes('退房时间')) checkoutSelect.value = String(i);
        if (col.includes('入住事由')) reasonSelect.value = String(i);
    });
}

function checkAllReady() {
    if (scheduleData.length > 0 && billData.length > 0) {
        elements.actionSection.classList.remove('hidden');
    }
}

// 日期解析
function parseDate(str) {
    if (!str) return null;
    if (str instanceof Date) {
        const d0 = new Date(str.getFullYear(), str.getMonth(), str.getDate());
        return isNaN(d0.getTime()) ? null : d0;
    }
    const s = String(str).trim();
    let d = null;
    
    if (/^\d{8}$/.test(s)) {
        d = new Date(s.slice(0,4) + '-' + s.slice(4,6) + '-' + s.slice(6,8));
    } else if (/^\d+$/.test(s) && parseInt(s) > 40000) {
        d = new Date((parseInt(s) - 25569) * 86400 * 1000);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{2}\s+\d{1,2}:\d{2}/.test(s)) {
        const parts = s.split(/[\s\/:]+/);
        d = new Date(2000 + parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(s)) {
        const parts = s.split('/');
        d = new Date(2000 + parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(s)) {
        const parts = s.split(/[-\/\s:]+/);
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
        d = new Date(s);
    }
    
    if (d && !isNaN(d.getTime())) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    console.log('parseDate failed', str);
    return null;
}

// 生成甘特图
function generateGantt() {
    const scheduleNameCol = Number.parseInt(elements.scheduleNameCol.value, 10);
    const scheduleDateStartCol = Number.parseInt(elements.scheduleDateStartCol.value, 10);
    const billNameCol = Number.parseInt(elements.billNameCol.value, 10);
    const billCheckinCol = Number.parseInt(elements.billCheckinCol.value, 10);
    const billCheckoutCol = Number.parseInt(elements.billCheckoutCol.value, 10);
    const billReasonCol = Number.parseInt(elements.billReasonCol.value, 10);
    
    if (isNaN(scheduleNameCol) || isNaN(scheduleDateStartCol) || 
        isNaN(billNameCol) || isNaN(billCheckinCol) || isNaN(billCheckoutCol)) {
        alert('请选择所有必需的列');
        return;
    }

    console.log('配置', {
        scheduleNameCol, scheduleDateStartCol,
        billNameCol, billCheckinCol, billCheckoutCol, billReasonCol,
        scheduleRows: scheduleData.length, billRows: billData.length
    });
    
    const dateColCount = scheduleColumns.length - scheduleDateStartCol;
    const dateHeaders = scheduleColumns.slice(scheduleDateStartCol);
    
    // 构建账单数据：按人员分组
    const billByPerson: Record<string, BillGanttBillEntry[]> = {};
    let totalRecords = 0;
    const skippedBills: Array<{ idx: number; name: string; checkinRaw: unknown; checkoutRaw: unknown }> = [];
    
    billData.forEach((row, idx) => {
        const name = String(row[billNameCol] || '').trim();
        if (!name) return;
        
        const checkinDate = parseDate(row[billCheckinCol]);
        const checkoutDate = parseDate(row[billCheckoutCol]);
        const reason = billReasonCol >= 0 ? String(row[billReasonCol] || '') : '';
        
        if (!checkinDate || !checkoutDate) {
            skippedBills.push({
                idx,
                name,
                checkinRaw: row[billCheckinCol],
                checkoutRaw: row[billCheckoutCol]
            });
            return;
        }
        
        if (!billByPerson[name]) billByPerson[name] = [];
        billByPerson[name].push({ checkin: checkinDate, checkout: checkoutDate, reason: reason });
        totalRecords++;
    });
    
    // 构建结果
    const resultRows: BillGanttResultRow[] = [];
    let totalDays = 0;
    
    scheduleData.forEach(scheduleRow => {
        const name = String(scheduleRow[scheduleNameCol] || '').trim();
        if (!name) return;
        
        // 任务行
        const taskRow: BillGanttResultRow = { type: 'task', name: name, cells: [] };
        for (let i = 0; i < dateColCount; i++) {
            const val = scheduleRow[scheduleDateStartCol + i];
            const str = (val !== undefined && val !== null && String(val).trim() !== '-') ? String(val) : '';
            taskRow.cells.push({ value: str, isHotel: false });
        }
        resultRows.push(taskRow);
        
        // 住宿行（如果有记录）
        if (billByPerson[name]) {
            const hotelRow: BillGanttResultRow = { type: 'hotel', name: name, cells: [] };
            for (let i = 0; i < dateColCount; i++) {
                hotelRow.cells.push({ value: '', isHotel: false });
            }
            
            billByPerson[name].forEach(bill => {
                for (let i = 0; i < dateColCount; i++) {
                    const header = dateHeaders[i];
                    const headerDate = parseDate(header);
                    const dayMatch = header.match(/(\d+)/);
                    const day = dayMatch ? parseInt(dayMatch[1]) : null;

                    let isHit = false;
                    if (headerDate) {
                        isHit = headerDate >= bill.checkin && headerDate <= bill.checkout;
                    } else if (day !== null) {
                        const checkinDay = bill.checkin.getDate();
                        const checkoutDay = bill.checkout.getDate();
                        isHit = day >= checkinDay && day <= checkoutDay;
                    }

                    if (isHit) {
                        hotelRow.cells[i].isHotel = true;
                        if (bill.reason && !hotelRow.cells[i].value) {
                            hotelRow.cells[i].value = bill.reason;
                        } else if (!hotelRow.cells[i].value) {
                            hotelRow.cells[i].value = '●';
                        }
                        totalDays++;
                    }
                }
            });
            resultRows.push(hotelRow);
        }
    });
    
    if (skippedBills.length) {
        console.log('跳过的账单记录(日期缺失/无法解析)', skippedBills.slice(0, 30));
    }

    ganttResult = {
        dateHeaders: dateHeaders,
        rows: resultRows,
        stats: { totalPersons: Object.keys(billByPerson).length, totalRecords: totalRecords, totalDays: totalDays }
    };
    
    displayResult();
    elements.exportBtn.disabled = false;
}

function displayResult() {
    if (!ganttResult) return;
    
    elements.totalPersons.textContent = String(ganttResult.stats.totalPersons);
    elements.totalRecords.textContent = String(ganttResult.stats.totalRecords);
    elements.totalDays.textContent = String(ganttResult.stats.totalDays);
    
    let html = '<thead><tr><th class="name-col">姓名</th>';
    ganttResult.dateHeaders.forEach(h => { html += '<th>' + h + '</th>'; });
    html += '</tr></thead><tbody>';
    
    ganttResult.rows.forEach(row => {
        const rowClass = row.type === 'hotel' ? 'hotel-row' : 'task-row';
        html += '<tr class="' + rowClass + '"><td class="name-col">' + row.name + '</td>';
        row.cells.forEach(cell => {
            const cls = cell.isHotel ? 'hotel-cell' : '';
            const val = cell.value.length > 10 ? cell.value.substring(0,10) + '..' : cell.value;
            html += '<td class="' + cls + '" title="' + cell.value + '">' + val + '</td>';
        });
        html += '</tr>';
    });
    html += '</tbody>';
    
    elements.resultTable.innerHTML = html;
    elements.resultSection.classList.remove('hidden');
}

function exportExcel() {
    if (!ganttResult) return;
    
    const colCount = 1 + ganttResult.dateHeaders.length;
    const ws = {};
    
    // xlsx-js-style 样式格式
    // 表头样式（灰色背景）
    const headerStyle = { 
        font: { bold: true }, 
        fill: { patternType: "solid", fgColor: { rgb: "DDDDDD" } }, 
        alignment: { horizontal: "center" },
        border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
    };
    // 住宿行背景色（浅黄色）
    const hotelBgStyle = { 
        fill: { patternType: "solid", fgColor: { rgb: "FFF3CD" } }, 
        alignment: { horizontal: "center" },
        border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
    };
    // 住宿高亮单元格（深黄色）
    const hotelCellStyle = { 
        fill: { patternType: "solid", fgColor: { rgb: "FFC107" } }, 
        font: { bold: true }, 
        alignment: { horizontal: "center" },
        border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
    };
    // 普通单元格
    const normalStyle = { 
        alignment: { horizontal: "center" },
        border: { top: {style: "thin"}, bottom: {style: "thin"}, left: {style: "thin"}, right: {style: "thin"} }
    };
    
    // 表头
    ws[XLSX.utils.encode_cell({r: 0, c: 0})] = { v: '姓名', t: 's', s: headerStyle };
    ganttResult.dateHeaders.forEach((h, i) => {
        ws[XLSX.utils.encode_cell({r: 0, c: i + 1})] = { v: h, t: 's', s: headerStyle };
    });
    
    // 数据行
    ganttResult.rows.forEach((row, rowIdx) => {
        const r = rowIdx + 1;
        const isHotelRow = row.type === 'hotel';
        
        // 姓名列
        ws[XLSX.utils.encode_cell({r, c: 0})] = { 
            v: row.name, 
            t: 's', 
            s: isHotelRow ? hotelBgStyle : normalStyle 
        };
        
        // 日期列
        row.cells.forEach((cell, colIdx) => {
            let style = normalStyle;
            if (isHotelRow) {
                style = cell.isHotel ? hotelCellStyle : hotelBgStyle;
            }
            ws[XLSX.utils.encode_cell({r, c: colIdx + 1})] = { v: cell.value, t: 's', s: style };
        });
    });
    
    // 设置范围和列宽
    ws['!ref'] = XLSX.utils.encode_range({s: {r: 0, c: 0}, e: {r: ganttResult.rows.length, c: colCount - 1}});
    ws['!cols'] = [{wch: 8}].concat(ganttResult.dateHeaders.map(() => ({wch: 12})));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '账单甘特图');
    XLSX.writeFile(wb, '账单甘特图对比.xlsx');
}
