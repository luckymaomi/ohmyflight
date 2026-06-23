const ROSTER_PATH = '../../../template/机组花名册.xlsx';
type CrewFlightWorkbook = import("xlsx-js-style").WorkBook;
type CrewFlightStatsMap = Record<string, Record<string, number>>;
type CrewFlightStatsLogicApi = {
    parseRosterRows(rows: unknown[][]): string[];
    analyzeScheduleRows(
        sheets: Array<{ sheetName: string; rows: unknown[][] }>,
        rosterNames: string[]
    ): { statsResult: CrewFlightStatsMap; routes: string[]; unmatchedCells: string[] };
    getPeopleInRosterOrder(statsResult: CrewFlightStatsMap | null, rosterNames: string[]): string[];
    buildCrewFlightExportRows(statsResult: CrewFlightStatsMap, routes: string[], rosterNames: string[]): Array<Array<string | number>>;
    extractNamesInTextOrder(text: unknown, rosterNames: string[]): string[];
};

interface CrewFlightStatsElements {
    scheduleFile: HTMLInputElement;
    rosterFile: HTMLInputElement;
    rosterStatus: HTMLElement;
    scheduleStatus: HTMLElement;
    sheetSection: HTMLElement;
    sheetSelector: HTMLElement;
    selectAllBtn: HTMLButtonElement;
    selectNoneBtn: HTMLButtonElement;
    analyzeBtn: HTMLButtonElement;
    exportBtn: HTMLButtonElement;
    warningSection: HTMLElement;
    warningList: HTMLElement;
    resultSection: HTMLElement;
    resultHead: HTMLTableSectionElement;
    resultBody: HTMLTableSectionElement;
    resultInfo: HTMLElement;
    crewTableBody: HTMLTableSectionElement;
    extractAllBtn: HTMLButtonElement;
    clearAllBtn: HTMLButtonElement;
    addRowBtn: HTMLButtonElement;
}

let scheduleWorkbook: CrewFlightWorkbook | null = null;  // 排班表工作簿
let rosterNames: string[] = [];                           // 花名册姓名列表
let statsResult: CrewFlightStatsMap | null = null;       // 统计结果
let routes: string[] = [];                               // 航线列表
let selectedSheets: string[] = [];                       // 选中的工作表

const elements: CrewFlightStatsElements = {
    scheduleFile: requireElement('scheduleFile', HTMLInputElement),
    rosterFile: requireElement('rosterFile', HTMLInputElement),
    rosterStatus: requireElement('rosterStatus', HTMLElement),
    scheduleStatus: requireElement('scheduleStatus', HTMLElement),
    sheetSection: requireElement('sheetSection', HTMLElement),
    sheetSelector: requireElement('sheetSelector', HTMLElement),
    selectAllBtn: requireElement('selectAllBtn', HTMLButtonElement),
    selectNoneBtn: requireElement('selectNoneBtn', HTMLButtonElement),
    analyzeBtn: requireElement('analyzeBtn', HTMLButtonElement),
    exportBtn: requireElement('exportBtn', HTMLButtonElement),
    warningSection: requireElement('warningSection', HTMLElement),
    warningList: requireElement('warningList', HTMLElement),
    resultSection: requireElement('resultSection', HTMLElement),
    resultHead: requireElement('resultHead', HTMLTableSectionElement),
    resultBody: requireElement('resultBody', HTMLTableSectionElement),
    resultInfo: requireElement('resultInfo', HTMLElement),
    crewTableBody: requireElement('crewTableBody', HTMLTableSectionElement),
    extractAllBtn: requireElement('extractAllBtn', HTMLButtonElement),
    clearAllBtn: requireElement('clearAllBtn', HTMLButtonElement),
    addRowBtn: requireElement('addRowBtn', HTMLButtonElement)
};
const crewFlightLogic = (window as typeof window & { CrewFlightStatsLogic: CrewFlightStatsLogicApi }).CrewFlightStatsLogic;

// 页面加载时自动加载默认花名册
document.addEventListener('DOMContentLoaded', loadDefaultRoster);

function requireElement<T extends HTMLElement>(id: string, Type: { new(): T }): T {
    const element = document.getElementById(id);
    if (!(element instanceof Type)) {
        throw new Error(`页面缺少必要元素：${id}`);
    }
    return element;
}

async function loadDefaultRoster() {
    try {
        showStatus('rosterStatus', '正在加载默认花名册...', 'loading');
        const resp = await fetch(ROSTER_PATH);
        if (!resp.ok) throw new Error('文件不存在');
        const buffer = await resp.arrayBuffer();
        parseRosterData(new Uint8Array(buffer), '机组花名册.xlsx');
    } catch (e) {
        console.error('自动加载花名册失败:', e);
        showStatus('rosterStatus', '请选择机组花名册文件', 'hint');
    }
}

// 解析花名册数据
function parseRosterData(data: Uint8Array, fileName: string) {
    try {
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {header: 1});
        
        rosterNames = crewFlightLogic.parseRosterRows(json);
        
        showStatus('rosterStatus', `已加载: ${fileName}（${rosterNames.length} 人）`, 'success');
        checkReady();
    } catch (err) {
        showStatus('rosterStatus', '文件解析失败: ' + err.message, 'error');
    }
}

// 读取排班表
elements.scheduleFile.addEventListener('change', async function(e) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    if (!file) return;

    try {
        const data = new Uint8Array(await file.arrayBuffer());
        scheduleWorkbook = XLSX.read(data, {type: 'array'});
        
        const sheetNames = scheduleWorkbook.SheetNames;
        showStatus('scheduleStatus', `已加载: ${file.name}（${sheetNames.length} 个工作表）`, 'success');
        
        // 显示工作表选择器
        displaySheetSelector(sheetNames);
        checkReady();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatus('scheduleStatus', '文件解析失败: ' + message, 'error');
    }
});

// 显示工作表选择器
function displaySheetSelector(sheetNames: string[]) {
    const section = elements.sheetSection;
    const selector = elements.sheetSelector;
    
    section.style.display = 'block';
    selectedSheets = [...sheetNames]; // 默认全选
    
    let html = '';
    for (const name of sheetNames) {
        html += `
            <label class="sheet-checkbox checked">
                <input type="checkbox" value="${name}" checked>
                <span>${name}</span>
            </label>
        `;
    }
    selector.innerHTML = html;
    
    // 绑定checkbox事件
    selector.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const label = this.parentElement;
            if (this.checked) {
                label?.classList.add('checked');
                if (!selectedSheets.includes(this.value)) {
                    selectedSheets.push(this.value);
                }
            } else {
                label?.classList.remove('checked');
                selectedSheets = selectedSheets.filter(s => s !== this.value);
            }
            checkReady();
        });
    });
}

// 全选
elements.selectAllBtn.addEventListener('click', function() {
    const selector = elements.sheetSelector;
    selector.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
        cb.parentElement?.classList.add('checked');
    });
    selectedSheets = scheduleWorkbook ? [...scheduleWorkbook.SheetNames] : [];
    checkReady();
});

// 全不选
elements.selectNoneBtn.addEventListener('click', function() {
    const selector = elements.sheetSelector;
    selector.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.parentElement?.classList.remove('checked');
    });
    selectedSheets = [];
    checkReady();
});

// 读取花名册（手动选择）
elements.rosterFile.addEventListener('change', async function(e) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    parseRosterData(new Uint8Array(buffer), file.name);
});

function showStatus(id: 'rosterStatus' | 'scheduleStatus', msg: string, type: 'success' | 'error' | 'loading' | 'hint') {
    const el = elements[id];
    el.textContent = msg;
    el.className = 'status status-' + type;
}

function checkReady() {
    const ready = scheduleWorkbook && rosterNames.length > 0 && selectedSheets.length > 0;
    elements.analyzeBtn.disabled = !ready;
}

function getPeopleInRosterOrder() {
    return crewFlightLogic.getPeopleInRosterOrder(statsResult, rosterNames);
}

// 开始统计
elements.analyzeBtn.addEventListener('click', function() {
    if (!scheduleWorkbook || rosterNames.length === 0 || selectedSheets.length === 0) return;
    
    const sheetRows = selectedSheets.map(sheetName => ({
        sheetName,
        rows: XLSX.utils.sheet_to_json<unknown[]>(scheduleWorkbook.Sheets[sheetName], {header: 1})
    }));
    const analyzeResult = crewFlightLogic.analyzeScheduleRows(sheetRows, rosterNames);
    statsResult = analyzeResult.statsResult;
    routes = analyzeResult.routes;
    const unmatchedCells = analyzeResult.unmatchedCells;
    
    // 显示未匹配警告
    if (unmatchedCells.length > 0) {
        elements.warningSection.style.display = 'block';
        elements.warningList.innerHTML = unmatchedCells.slice(0, 30).join('<br>') + 
            (unmatchedCells.length > 30 ? `<br>...还有 ${unmatchedCells.length - 30} 条` : '');
    } else {
        elements.warningSection.style.display = 'none';
    }
    
    // 显示结果
    displayResult();
    elements.exportBtn.disabled = false;
});

function displayResult() {
    if (!statsResult) return;
    
    elements.resultSection.style.display = 'block';
    
    const people = getPeopleInRosterOrder();
    elements.resultInfo.textContent = `共统计 ${people.length} 人，${routes.length} 条航线，已选择 ${selectedSheets.length} 个工作表`;
    
    // 表头
    let headHtml = '<tr><th>加分项</th>';
    for (const route of routes) {
        headHtml += `<th>${route}</th>`;
    }
    headHtml += '</tr>';
    elements.resultHead.innerHTML = headHtml;
    
    // 表体
    let bodyHtml = '';
    for (const name of people) {
        bodyHtml += `<tr><td>${name}</td>`;
        for (const route of routes) {
            const count = statsResult[name]?.[route] || '';
            bodyHtml += `<td>${count}</td>`;
        }
        bodyHtml += '</tr>';
    }
    elements.resultBody.innerHTML = bodyHtml;
}

// 导出Excel
elements.exportBtn.addEventListener('click', function() {
    if (!statsResult || routes.length === 0) return;
    
    const data = crewFlightLogic.buildCrewFlightExportRows(statsResult, routes, rosterNames);
    
    // 创建工作簿
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '航线班次统计');
    
    // 下载
    XLSX.writeFile(wb, '航线班次统计.xlsx');
});

// 机组识别功能 - 多行表格
const INITIAL_ROWS = 10;

function createCrewRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="padding: 4px; border: 1px solid #d0d7de;">
            <input type="text" class="crew-input" style="width: 100%; padding: 4px 6px; border: 1px solid #d0d7de; border-radius: 4px; font-size: 13px;" placeholder="粘贴文本...">
        </td>
        <td style="padding: 4px; border: 1px solid #d0d7de;">
            <input type="text" class="crew-result" style="width: 100%; padding: 4px 6px; border: 1px solid #d0d7de; border-radius: 4px; font-size: 13px;" placeholder="识别结果">
        </td>
        <td style="padding: 4px; border: 1px solid #d0d7de; text-align: center;">
            <button class="btn btn-small copy-row-btn" style="padding: 2px 8px; font-size: 12px;">复制</button>
        </td>
    `;
    return tr;
}

function initCrewTable() {
    const tbody = elements.crewTableBody;
    tbody.innerHTML = '';
    for (let i = 0; i < INITIAL_ROWS; i++) {
        tbody.appendChild(createCrewRow());
    }
}
initCrewTable();

// 按出现顺序识别姓名
function extractNamesInOrder(text) {
    return crewFlightLogic.extractNamesInTextOrder(text, rosterNames);
}

// 识别全部
elements.extractAllBtn.addEventListener('click', function() {
    if (rosterNames.length === 0) {
        alert('请先加载机组花名册');
        return;
    }
    
    const rows = elements.crewTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const input = row.querySelector<HTMLInputElement>('.crew-input');
        const result = row.querySelector<HTMLInputElement>('.crew-result');
        if (!input || !result) return;
        const text = input.value.trim();
        if (text) {
            const names = extractNamesInOrder(text);
            result.value = names.join(' ');
        }
    });
});

// 清空全部
elements.clearAllBtn.addEventListener('click', function() {
    const rows = elements.crewTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const input = row.querySelector<HTMLInputElement>('.crew-input');
        const result = row.querySelector<HTMLInputElement>('.crew-result');
        if (input) input.value = '';
        if (result) result.value = '';
    });
});

// 添加行
elements.addRowBtn.addEventListener('click', function() {
    elements.crewTableBody.appendChild(createCrewRow());
});

// 复制按钮（事件委托）
elements.crewTableBody.addEventListener('click', function(e) {
    const target = e.target;
    if (target instanceof HTMLElement && target.classList.contains('copy-row-btn')) {
        const row = target.closest('tr');
        const resultInput = row?.querySelector<HTMLInputElement>('.crew-result');
        const result = resultInput?.value || '';
        if (!result) {
            return;
        }
        navigator.clipboard.writeText(result).then(() => {
            target.textContent = '已复制';
            target.style.backgroundColor = '#1a7f37';
            target.style.color = '#fff';
            setTimeout(() => {
                target.textContent = '复制';
                target.style.backgroundColor = '';
                target.style.color = '';
            }, 1500);
        }).catch(() => {
            alert('复制失败');
        });
    }
});
