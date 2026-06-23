// 酒店皇帝 - JavaScript逻辑

// 全局变量
let billWorkbook: WorkbookLike | null = null;
let checkinWorkbook: WorkbookLike | null = null;
let billData: WorkbookRow[] = [];
let checkinData: WorkbookRow[] = [];
let billColumns: string[] = [];
let checkinColumns: string[] = [];
let billHyperlinks: HyperlinkMap = {};
let checkinHyperlinks: HyperlinkMap = {};
let matchResults: MatchResult[] = [];

type WorkbookRow = Array<string | number | boolean | Date | null | undefined>;
type WorkSheetLike = import("xlsx-js-style").WorkSheet;
type WorkbookLike = {
    SheetNames: string[];
    Sheets: Record<string, WorkSheetLike>;
};
type HyperlinkInfo = { url: string; display: string };
type HyperlinkMap = Record<number, Record<number, HyperlinkInfo>>;
type MatchResult = {
    status: 'matched' | 'duplicate' | 'unmatched';
    billRow: WorkbookRow;
    billIdx: number;
    checkinRow: WorkbookRow | null;
    checkinIdx: number;
};
type ProofLinkColumn = {
    header: string;
    link: HyperlinkInfo | null;
};
type HotelBillLogicApi = {
    parseDate: (value: unknown) => Date | null;
    matchRows: (input: {
        billData: WorkbookRow[];
        checkinData: WorkbookRow[];
        billNameCol: number;
        billDateCol: number;
        checkinNameCol: number;
        checkinDateCol: number;
        tolerance: number;
    }) => {
        results: MatchResult[];
        skippedBillLogs: Array<Record<string, unknown>>;
        candidateLogs: Array<Record<string, unknown>>;
    };
    getProofLinks: (result: MatchResult, checkinColumns: string[], checkinHyperlinks: HyperlinkMap) => HyperlinkInfo[];
    getProofColumnCount: (results: MatchResult[], checkinColumns: string[], checkinHyperlinks: HyperlinkMap) => number;
    buildProofLinkColumns: (
        result: MatchResult,
        columnCount: number,
        checkinColumns: string[],
        checkinHyperlinks: HyperlinkMap
    ) => ProofLinkColumn[];
};
const hotelLogic = (window as typeof window & { HotelBillLogic: HotelBillLogicApi }).HotelBillLogic;

function getInput(id: string) {
    return document.getElementById(id) as HTMLInputElement;
}

function getButton(id: string) {
    return document.getElementById(id) as HTMLButtonElement;
}

function getElement(id: string) {
    return document.getElementById(id) as HTMLElement;
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 读取账单表
    document.getElementById('billFile').addEventListener('change', handleBillFile);
    // 读取登记表
    document.getElementById('checkinFile').addEventListener('change', handleCheckinFile);
    // 表头行变化时重新加载
    document.getElementById('billHeaderRow').addEventListener('change', loadBillPreview);
    document.getElementById('checkinHeaderRow').addEventListener('change', loadCheckinPreview);
    // 匹配按钮
    document.getElementById('matchBtn').addEventListener('click', doMatch);
    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', exportExcel);
});

function handleBillFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event: ProgressEvent<FileReader>) {
        try {
            const result = event.target?.result;
            if (!(result instanceof ArrayBuffer)) {
                throw new Error('文件读取结果不是 ArrayBuffer');
            }
            const data = new Uint8Array(result);
            billWorkbook = XLSX.read(data, {type: 'array', cellFormula: true, cellStyles: true});
            showStatus('billStatus', '已加载: ' + file.name, 'success');
            loadBillPreview();
        } catch (err) {
            showStatus('billStatus', '文件解析失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleCheckinFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event: ProgressEvent<FileReader>) {
        try {
            const result = event.target?.result;
            if (!(result instanceof ArrayBuffer)) {
                throw new Error('文件读取结果不是 ArrayBuffer');
            }
            const data = new Uint8Array(result);
            checkinWorkbook = XLSX.read(data, {type: 'array', cellFormula: true, cellStyles: true});
            showStatus('checkinStatus', '已加载: ' + file.name, 'success');
            loadCheckinPreview();
        } catch (err) {
            showStatus('checkinStatus', '文件解析失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function showStatus(id, msg, type) {
    const el = getElement(id);
    el.textContent = msg;
    el.className = 'status status-' + type;
}

function loadBillPreview() {
    if (!billWorkbook) return;
    const headerRow = parseInt(getInput('billHeaderRow').value, 10);
    const sheet = billWorkbook.Sheets[billWorkbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: false, dateNF: 'yyyy-mm-dd'}) as WorkbookRow[];
    
    if (json.length <= headerRow) {
        showStatus('billStatus', '表头行超出数据范围', 'error');
        return;
    }
    
    billColumns = (json[headerRow] || []).map((c, i) => String(c || '列' + (i + 1)));
    billData = json.slice(headerRow + 1);
    billHyperlinks = extractHyperlinks(sheet, headerRow);
    
    console.log('[bill] columns', billColumns);
    console.log('[bill] sample rows', billData.slice(0, 5));

    renderPreview('bill', billColumns, billData.slice(0, 5));
    renderColumnSelectors('bill', billColumns);
    renderDisplayCols('bill', billColumns);
    
    getElement('billConfigSection').style.display = 'block';
    checkAllReady();
}

function loadCheckinPreview() {
    if (!checkinWorkbook) return;
    const headerRow = parseInt(getInput('checkinHeaderRow').value, 10);
    const sheet = checkinWorkbook.Sheets[checkinWorkbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: false, dateNF: 'yyyy-mm-dd'}) as WorkbookRow[];
    
    if (json.length <= headerRow) {
        showStatus('checkinStatus', '表头行超出数据范围', 'error');
        return;
    }
    
    checkinColumns = (json[headerRow] || []).map((c, i) => String(c || '列' + (i + 1)));
    checkinData = json.slice(headerRow + 1);
    checkinHyperlinks = extractHyperlinks(sheet, headerRow);
    
    console.log('[checkin] columns', checkinColumns);
    console.log('[checkin] sample rows', checkinData.slice(0, 5));

    renderPreview('checkin', checkinColumns, checkinData.slice(0, 5));
    renderColumnSelectors('checkin', checkinColumns);
    renderDisplayCols('checkin', checkinColumns);
    
    getElement('checkinConfigSection').style.display = 'block';
    checkAllReady();
}

function extractHyperlinks(sheet: WorkSheetLike, headerRow: number): HyperlinkMap {
    const links: HyperlinkMap = {};
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    for (let R = headerRow + 1; R <= range.e.r; R++) {
        const rowIdx = R - headerRow - 1;
        links[rowIdx] = {};
        
        for (let C = range.s.c; C <= range.e.c; C++) {
            const addr = XLSX.utils.encode_cell({r: R, c: C});
            const cell = sheet[addr];
            if (!cell) continue;
            
            if (cell.l && cell.l.Target) {
                links[rowIdx][C] = {url: cell.l.Target, display: cell.v || ''};
            } else if (cell.f && cell.f.includes('HYPERLINK')) {
                const match = cell.f.match(/HYPERLINK\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/i);
                if (match) {
                    links[rowIdx][C] = {url: match[1], display: match[2]};
                }
            }
        }
    }
    return links;
}

function renderPreview(type: string, columns: string[], rows: WorkbookRow[]) {
    const table = getElement(type + 'Preview');
    let html = '<thead><tr>';
    columns.forEach(col => { html += '<th>' + col + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        columns.forEach((_, i) => {
            const val = row[i] !== undefined ? row[i] : '';
            html += '<td title="' + val + '">' + val + '</td>';
        });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
}

function renderColumnSelectors(type: string, columns: string[]) {
    const nameSelect = getInput(type + 'NameCol');
    const dateSelect = getInput(type + 'DateCol');
    
    nameSelect.innerHTML = '<option value="">请选择...</option>';
    dateSelect.innerHTML = '<option value="">请选择...</option>';
    
    columns.forEach((col, i) => {
        const opt = '<option value="' + i + '">' + col + '</option>';
        nameSelect.innerHTML += opt;
        dateSelect.innerHTML += opt;
    });
    
    // 自动识别
    columns.forEach((col, i) => {
        const colLower = col.toLowerCase();
        if (colLower.includes('姓名') || colLower.includes('人员信息') || colLower.includes('入住人员')) {
            nameSelect.value = String(i);
        }
        if (colLower.includes('入住时间') || colLower.includes('入住日期') || colLower.includes('您入住的时间')) {
            dateSelect.value = String(i);
        }
    });
}

function renderDisplayCols(type: string, columns: string[]) {
    const container = getElement(type + 'DisplayCols');
    container.innerHTML = '';
    
    const defaultBill = ['入住时间', '退房时间', '入住事由', '住宿天数', '入住人员信息'];
    const defaultCheckin = ['您的姓名', '您入住的时间', '您需要入住天数', '您的分部', '入住证明'];
    const defaults = type === 'bill' ? defaultBill : defaultCheckin;
    
    columns.forEach((col, i) => {
        const shouldCheck = defaults.some(d => col.includes(d) || d.includes(col));
        const label = document.createElement('label');
        label.innerHTML = '<input type="checkbox" name="' + type + '_display" value="' + i + '" ' + (shouldCheck ? 'checked' : '') + '><span>' + col + '</span>';
        container.appendChild(label);
    });
}

function checkAllReady() {
    if (billData.length > 0 && checkinData.length > 0) {
        getElement('matchSection').style.display = 'block';
    }
}


// 日期解析
const parseDate = hotelLogic.parseDate;

// 开始匹配
function doMatch() {
    const billNameCol = parseInt(getInput('billNameCol').value, 10);
    const billDateCol = parseInt(getInput('billDateCol').value, 10);
    const checkinNameCol = parseInt(getInput('checkinNameCol').value, 10);
    const checkinDateCol = parseInt(getInput('checkinDateCol').value, 10);
    const tolerance = parseInt(getInput('dateTolerance').value, 10);
    
    if (isNaN(billNameCol) || isNaN(billDateCol) || isNaN(checkinNameCol) || isNaN(checkinDateCol)) {
        alert('请选择所有必需的列');
        return;
    }
    
    console.log('开始匹配', {
        billNameCol, billDateCol, checkinNameCol, checkinDateCol, tolerance,
        billRows: billData.length, checkinRows: checkinData.length
    });
    
    const matchOutput = hotelLogic.matchRows({
        billData,
        checkinData,
        billNameCol,
        billDateCol,
        checkinNameCol,
        checkinDateCol,
        tolerance
    });
    matchResults = matchOutput.results;
    const skippedBillLogs = matchOutput.skippedBillLogs;
    const candidateLogs = matchOutput.candidateLogs;
    
    const matchedCount = matchResults.filter(r => r.status === 'matched').length;
    const unmatched = matchResults.filter(r => r.status === 'unmatched');
    console.log('匹配完成', {matched: matchedCount, unmatched: unmatched.length});
    if (skippedBillLogs.length) {
        console.log('跳过的账单行(姓名或日期缺失)', skippedBillLogs.slice(0, 20));
    }
    if (unmatched.length) {
        const sample = unmatched.slice(0, 10).map(r => ({
            billIdx: r.billIdx,
            billName: r.billRow[billNameCol],
            billDateRaw: r.billRow[billDateCol],
            parsedBillDate: parseDate(r.billRow[billDateCol])
        }));
        console.log('未匹配账单示例', sample);
    }
    if (candidateLogs.length) {
        console.log('候选匹配(前30)', candidateLogs);
    }
    displayResults();
    getButton('exportBtn').disabled = false;
}

// 显示结果
function displayResults() {
    const billDisplayCols = getSelectedCols('bill');
    const checkinDisplayCols = getSelectedCols('checkin');
    
    const matched = matchResults.filter(r => r.status === 'matched').length;
    const duplicate = matchResults.filter(r => r.status === 'duplicate').length;
    const unmatched = matchResults.filter(r => r.status === 'unmatched').length;
    
    getElement('totalCount').textContent = String(matchResults.length);
    getElement('matchedCount').textContent = String(matched + duplicate);
    getElement('unmatchedCount').textContent = String(unmatched);
    
    let headHtml = '<tr><th>状态</th>';
    billDisplayCols.forEach(i => { headHtml += '<th>[账单] ' + billColumns[i] + '</th>'; });
    checkinDisplayCols.forEach(i => { headHtml += '<th>[登记] ' + checkinColumns[i] + '</th>'; });
    headHtml += '<th>入住证明</th></tr>';
    getElement('resultHead').innerHTML = headHtml;
    
    let bodyHtml = '';
    matchResults.forEach(result => {
        bodyHtml += '<tr class="' + result.status + '">';
        bodyHtml += '<td><span class="status-badge ' + result.status + '">' + (result.status === 'matched' ? '匹配' : result.status === 'duplicate' ? '重复匹配' : '无登记') + '</span></td>';
        
        billDisplayCols.forEach(colIdx => {
            const val = result.billRow[colIdx] || '';
            const link = billHyperlinks[result.billIdx] && billHyperlinks[result.billIdx][colIdx];
            bodyHtml += link ? '<td><a href="' + link.url + '" target="_blank" class="proof-link">' + link.display + '</a></td>' : '<td>' + val + '</td>';
        });
        
        if (result.checkinRow) {
            checkinDisplayCols.forEach(colIdx => {
                const val = result.checkinRow[colIdx] || '';
                const link = checkinHyperlinks[result.checkinIdx] && checkinHyperlinks[result.checkinIdx][colIdx];
                bodyHtml += link ? '<td><a href="' + link.url + '" target="_blank" class="proof-link">' + link.display + '</a></td>' : '<td>' + val + '</td>';
            });
        } else {
            checkinDisplayCols.forEach(() => { bodyHtml += '<td>-</td>'; });
        }
        
        bodyHtml += '<td>';
        getProofLinks(result).forEach(link => {
            bodyHtml += '<a href="' + link.url + '" target="_blank" class="proof-link">' + link.display + '</a> ';
        });
        bodyHtml += '</td></tr>';
    });
    
    getElement('resultBody').innerHTML = bodyHtml;
    getElement('resultSection').style.display = 'block';
}

function getSelectedCols(type) {
    return Array.from(document.querySelectorAll<HTMLInputElement>('input[name="' + type + '_display"]:checked'))
        .map(cb => parseInt(cb.value, 10));
}

function getProofLinks(result: MatchResult): HyperlinkInfo[] {
    return hotelLogic.getProofLinks(result, checkinColumns, checkinHyperlinks);
}

function getProofColumnCount(results: MatchResult[]): number {
    return hotelLogic.getProofColumnCount(results, checkinColumns, checkinHyperlinks);
}

function buildProofLinkColumns(result: MatchResult, columnCount: number): ProofLinkColumn[] {
    return hotelLogic.buildProofLinkColumns(result, columnCount, checkinColumns, checkinHyperlinks);
}

// 超链接单元格样式（蓝色+下划线）
const hyperlinkStyle = {
    font: { color: { rgb: "0000FF" }, underline: true }
};

// 创建带样式的超链接单元格
function makeHyperlinkCell(url, display) {
    return {
        f: '=HYPERLINK("' + url + '","' + display + '")',
        t: 'str',
        s: hyperlinkStyle
    };
}

// 导出Excel
function exportExcel() {
    if (matchResults.length === 0) return;
    
    const billDisplayCols = getSelectedCols('bill');
    const checkinDisplayCols = getSelectedCols('checkin');
    const proofColumnCount = getProofColumnCount(matchResults);
    
    const ws = {};
    const colCount = 1 + billDisplayCols.length + checkinDisplayCols.length + proofColumnCount;
    
    // 表头
    let col = 0;
    ws[XLSX.utils.encode_cell({r: 0, c: col++})] = {v: '匹配状态', t: 's'};
    billDisplayCols.forEach(i => {
        ws[XLSX.utils.encode_cell({r: 0, c: col++})] = {v: '[账单] ' + billColumns[i], t: 's'};
    });
    checkinDisplayCols.forEach(i => {
        ws[XLSX.utils.encode_cell({r: 0, c: col++})] = {v: '[登记] ' + checkinColumns[i], t: 's'};
    });
    buildProofLinkColumns(matchResults[0], proofColumnCount).forEach(proofColumn => {
        ws[XLSX.utils.encode_cell({r: 0, c: col++})] = {v: proofColumn.header, t: 's'};
    });
    
    // 数据行
    matchResults.forEach((result, rowIdx) => {
        const r = rowIdx + 1;
        let c = 0;
        
        ws[XLSX.utils.encode_cell({r, c: c++})] = {v: result.status === 'matched' ? '匹配' : result.status === 'duplicate' ? '重复匹配' : '无登记', t: 's'};
        
        billDisplayCols.forEach(colIdx => {
            const link = billHyperlinks[result.billIdx] && billHyperlinks[result.billIdx][colIdx];
            if (link) {
                ws[XLSX.utils.encode_cell({r, c: c++})] = makeHyperlinkCell(link.url, link.display);
            } else {
                ws[XLSX.utils.encode_cell({r, c: c++})] = {v: result.billRow[colIdx] || '', t: 's'};
            }
        });
        
        if (result.checkinRow) {
            checkinDisplayCols.forEach(colIdx => {
                const link = checkinHyperlinks[result.checkinIdx] && checkinHyperlinks[result.checkinIdx][colIdx];
                if (link) {
                    ws[XLSX.utils.encode_cell({r, c: c++})] = makeHyperlinkCell(link.url, link.display);
                } else {
                    ws[XLSX.utils.encode_cell({r, c: c++})] = {v: result.checkinRow[colIdx] || '', t: 's'};
                }
            });
        } else {
            checkinDisplayCols.forEach(() => {
                ws[XLSX.utils.encode_cell({r, c: c++})] = {v: '-', t: 's'};
            });
        }
        
        buildProofLinkColumns(result, proofColumnCount).forEach(proofColumn => {
            if (proofColumn.link) {
                ws[XLSX.utils.encode_cell({r, c: c++})] = makeHyperlinkCell(proofColumn.link.url, proofColumn.link.display);
            } else {
                ws[XLSX.utils.encode_cell({r, c: c++})] = {v: '', t: 's'};
            }
        });
    });
    
    ws['!ref'] = XLSX.utils.encode_range({s: {r: 0, c: 0}, e: {r: matchResults.length, c: colCount - 1}});
    ws['!cols'] = Array(colCount).fill({wch: 15});
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '对比结果');
    XLSX.writeFile(wb, '账单对比结果.xlsx');
}
