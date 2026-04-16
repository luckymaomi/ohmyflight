type FocusCrewWorkbook = import("xlsx-js-style").WorkBook;
type FocusCrewWorksheet = import("xlsx-js-style").WorkSheet;
type FocusCrewCategory = '重点关注' | '一般关注' | '预防性关注' | '三新人员（不上会）' | '长期关注';
type FocusCrewJsonRow = unknown[];
type FocusCrewCategoryTotals = Partial<Record<FocusCrewCategory, number>>;

interface FocusSheetInfo {
    name: string;
    category: FocusCrewCategory;
    columns: string[];
    data: FocusCrewJsonRow[];
}

interface FocusCrewElements {
    scheduleFile: HTMLInputElement;
    focusFile: HTMLInputElement;
    highlightBtn: HTMLButtonElement;
    exportBtn: HTMLButtonElement;
    scheduleStatus: HTMLElement;
    focusStatus: HTMLElement;
    scheduleConfigSection: HTMLElement;
    focusConfigSection: HTMLElement;
    focusSheetsConfig: HTMLElement;
    schedulePreview: HTMLTableElement;
    scheduleIdCol: HTMLSelectElement;
    scheduleNameCol: HTMLSelectElement;
    actionSection: HTMLElement;
    resultStats: HTMLElement;
}

let scheduleWorkbook: FocusCrewWorkbook | null = null;
let focusWorkbook: FocusCrewWorkbook | null = null;
let scheduleData: FocusCrewJsonRow[] = [];
let focusSheets: FocusSheetInfo[] = [];
let scheduleColumns: string[] = [];
let resultWorkbook: FocusCrewWorkbook | null = null;

const elements: FocusCrewElements = {
    scheduleFile: requireElement('scheduleFile', HTMLInputElement),
    focusFile: requireElement('focusFile', HTMLInputElement),
    highlightBtn: requireElement('highlightBtn', HTMLButtonElement),
    exportBtn: requireElement('exportBtn', HTMLButtonElement),
    scheduleStatus: requireElement('scheduleStatus', HTMLElement),
    focusStatus: requireElement('focusStatus', HTMLElement),
    scheduleConfigSection: requireElement('scheduleConfigSection', HTMLElement),
    focusConfigSection: requireElement('focusConfigSection', HTMLElement),
    focusSheetsConfig: requireElement('focusSheetsConfig', HTMLElement),
    schedulePreview: requireElement('schedulePreview', HTMLTableElement),
    scheduleIdCol: requireElement('scheduleIdCol', HTMLSelectElement),
    scheduleNameCol: requireElement('scheduleNameCol', HTMLSelectElement),
    actionSection: requireElement('actionSection', HTMLElement),
    resultStats: requireElement('resultStats', HTMLElement)
};

const CATEGORY_CONFIG: Record<FocusCrewCategory, FocusCrewCategoryConfigEntry> = {
    '重点关注': { priority: 1, color: 'FFE5CC', label: '重点' },
    '一般关注': { priority: 2, color: 'FFF3CD', label: '一般' },
    '预防性关注': { priority: 3, color: '5b84f9', label: '预防' },
    '三新人员（不上会）': { priority: 4, color: '65c53f', label: '三新' },
    '长期关注': { priority: 5, color: 'a584ed', label: '长期' }
};
const view = window.FocusCrewView;

document.addEventListener('DOMContentLoaded', function() {
    elements.scheduleFile.addEventListener('change', handleScheduleFile);
    elements.focusFile.addEventListener('change', handleFocusFile);
    elements.highlightBtn.addEventListener('click', doHighlight);
    elements.exportBtn.addEventListener('click', exportExcel);
});

function requireElement<T extends HTMLElement>(id: string, Type: { new(): T }): T {
    const element = document.getElementById(id);
    if (!(element instanceof Type)) {
        throw new Error(`页面缺少必要元素：${id}`);
    }
    return element;
}

async function handleScheduleFile(e: Event) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    if (!file) return;

    try {
        const data = new Uint8Array(await file.arrayBuffer());
        scheduleWorkbook = XLSX.read(data, {type: 'array'});
        showStatus('scheduleStatus', '已加载: ' + file.name, 'success');
        loadSchedulePreview();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatus('scheduleStatus', '文件解析失败: ' + message, 'error');
    }
}

async function handleFocusFile(e: Event) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    if (!file) return;

    try {
        const data = new Uint8Array(await file.arrayBuffer());
        focusWorkbook = XLSX.read(data, {type: 'array'});
        showStatus('focusStatus', '已加载: ' + file.name, 'success');
        loadFocusPreview();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatus('focusStatus', '文件解析失败: ' + message, 'error');
    }
}

function showStatus(id: 'scheduleStatus' | 'focusStatus', msg: string, type: 'success' | 'error') {
    const el = elements[id];
    el.textContent = msg;
    el.className = 'status status-' + type;
}

function loadSchedulePreview() {
    if (!scheduleWorkbook) return;
    
    const sheet = scheduleWorkbook.Sheets[scheduleWorkbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<FocusCrewJsonRow>(sheet, {header: 1, raw: false});
    
    if (json.length === 0) {
        showStatus('scheduleStatus', '表格为空', 'error');
        return;
    }
    
    scheduleColumns = (json[0] || []).map((c, i) => c ? String(c) : '列' + (i+1));
    scheduleData = json;
    
    view.renderPreview(elements.schedulePreview, scheduleColumns, json.slice(0, 6));
    view.renderSelectors(elements.scheduleIdCol, elements.scheduleNameCol, scheduleColumns);
    
    elements.scheduleConfigSection.style.display = 'block';
    checkReady();
}

function loadFocusPreview() {
    if (!focusWorkbook) return;
    
    const sheetNames = focusWorkbook.SheetNames;
    focusSheets = [];
    
    for (const sheetName of sheetNames) {
        let category = null;
        
        for (const cat of Object.keys(CATEGORY_CONFIG)) {
            if (sheetName.includes(cat) || cat.includes(sheetName)) {
                category = cat;
                break;
            }
        }
        
        if (!category) continue;
        
        const sheet = focusWorkbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<FocusCrewJsonRow>(sheet, {header: 1, raw: false});
        
        if (json.length < 2) continue;
        
        const columns = (json[1] || []).map((c, i) => c ? String(c) : '列' + (i+1));
        
        focusSheets.push({
            name: sheetName,
            category: category,
            columns: columns,
            data: json
        });
    }
    
    if (focusSheets.length === 0) {
        showStatus('focusStatus', '未找到有效的关注类别工作表', 'error');
        return;
    }
    
    view.renderFocusSheets(elements.focusSheetsConfig, focusSheets, CATEGORY_CONFIG);
    
    showStatus('focusStatus', '已加载 ' + focusSheets.length + ' 个关注类别工作表', 'success');
    
    elements.focusConfigSection.style.display = 'block';
    checkReady();
}

function checkReady() {
    if (scheduleData.length > 0 && focusSheets.length > 0) {
        elements.actionSection.style.display = 'block';
    }
}

function doHighlight() {
    const scheduleNameCol = Number.parseInt(elements.scheduleNameCol.value, 10);
    
    if (isNaN(scheduleNameCol)) {
        alert('请选择审班表的姓名列');
        return;
    }
    
    const focusData: Record<string, FocusCrewCategory[]> = {};
    
    for (let sheetIdx = 0; sheetIdx < focusSheets.length; sheetIdx++) {
        const sheetInfo = focusSheets[sheetIdx];
            const nameColSelect = document.getElementById('focusNameCol_' + sheetIdx);
            
            if (!(nameColSelect instanceof HTMLSelectElement)) {
                console.warn('未找到工作表 [' + sheetInfo.name + '] 的姓名列选择器');
                continue;
            }
            
            const nameCol = Number.parseInt(nameColSelect.value, 10);
        
        if (isNaN(nameCol)) {
            alert('请选择 [' + sheetInfo.name + '] 的姓名列');
            return;
        }
        
        for (let i = 2; i < sheetInfo.data.length; i++) {
            const row = sheetInfo.data[i];
            if (!row || row.length === 0) continue;
            
            const name = String(row[nameCol] || '').trim();
            if (!name) continue;
            
            if (!focusData[name]) {
                focusData[name] = [];
            }
            focusData[name].push(sheetInfo.category);
        }
    }
    
    const focusNames = Object.keys(focusData);
    console.log('重点人员总数:', focusNames.length);
    console.log('重点人员示例:', focusNames.slice(0, 10));
    
    if (focusNames.length === 0) {
        alert('未找到任何重点人员，请检查重点人员表的姓名列是否选择正确');
        return;
    }
    
    resultWorkbook = XLSX.utils.book_new();
    const matchedCategories: FocusCrewCategoryTotals = {};
    
    for (const sheetName of scheduleWorkbook.SheetNames) {
        const sourceSheet = scheduleWorkbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sourceSheet['!ref'] || 'A1');
        
        const newSheet = {};
        let matchCount = 0;
        
        for (let R = 0; R <= range.e.r; R++) {
            for (let C = 0; C <= range.e.c; C++) {
                const addr = XLSX.utils.encode_cell({r: R, c: C});
                const sourceCell = sourceSheet[addr];
                
                if (!sourceCell) {
                    continue;
                }
                
                let cellValue = sourceCell.v;
                let cellStyle = sourceCell.s || {};
                
                if (R > 0 && C === scheduleNameCol) {
                    const name = String(cellValue || '').trim();
                    
                    if (name && focusData[name]) {
                        const categories = focusData[name];
                        const uniqueCategories = Array.from(new Set(categories));
                        
                        uniqueCategories.sort((a, b) => {
                            return CATEGORY_CONFIG[a].priority - CATEGORY_CONFIG[b].priority;
                        });
                        
                        const topCategory = uniqueCategories[0];
                        const color = CATEGORY_CONFIG[topCategory].color;
                        
                        const labels = uniqueCategories.map(cat => '[' + CATEGORY_CONFIG[cat].label + ']').join('');
                        cellValue = name + labels;
                        
                        cellStyle = {
                            fill: { patternType: "solid", fgColor: { rgb: color } },
                            alignment: { horizontal: "left", vertical: "center" },
                            border: {
                                top: {style: "thin", color: {rgb: "000000"}},
                                bottom: {style: "thin", color: {rgb: "000000"}},
                                left: {style: "thin", color: {rgb: "000000"}},
                                right: {style: "thin", color: {rgb: "000000"}}
                            }
                        };
                        
                        matchCount++;
                        
                        uniqueCategories.forEach(cat => {
                            matchedCategories[cat] = (matchedCategories[cat] || 0) + 1;
                        });
                    }
                }
                
                newSheet[addr] = {
                    v: cellValue,
                    t: sourceCell.t || 's',
                    s: cellStyle
                };
            }
        }
        
        newSheet['!ref'] = sourceSheet['!ref'];
        if (sourceSheet['!cols']) newSheet['!cols'] = sourceSheet['!cols'];
        if (sourceSheet['!rows']) newSheet['!rows'] = sourceSheet['!rows'];
        
        XLSX.utils.book_append_sheet(resultWorkbook, newSheet, sheetName);
        
        console.log('工作表 [' + sheetName + '] 匹配到 ' + matchCount + ' 人');
    }
    
    view.displayStats(elements.resultStats, focusNames.length, matchedCategories, CATEGORY_CONFIG);
    elements.exportBtn.disabled = false;
}

function exportExcel() {
    if (!resultWorkbook) {
        alert('请先进行标注');
        return;
    }
    XLSX.writeFile(resultWorkbook, '审班表_已标注.xlsx');
}
