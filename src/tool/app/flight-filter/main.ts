type FlightFilterWorkbook = import("xlsx-js-style").WorkBook;
type FlightFilterWorksheet = import("xlsx-js-style").WorkSheet;
type FlightFilterRange = import("xlsx-js-style").Range;
type FlightFilterCell = import("xlsx-js-style").CellObject & { s?: Record<string, unknown> };
type FlightFilterStatusType = "error" | "success" | "info";

interface FlightFilterRowRecord {
    row: number;
    date: Date;
}

interface FlightFilterMatchedRow {
    rowNum: number;
    employeeId: unknown;
    pilotName: unknown;
    date: unknown;
    task: unknown;
    colorClass: string;
}

interface FlightFilterElements {
    dateInput: HTMLInputElement;
    fileInput: HTMLInputElement;
    flightInput: HTMLInputElement;
    addBtn: HTMLButtonElement;
    clearBtn: HTMLButtonElement;
    processBtn: HTMLButtonElement;
    downloadLink: HTMLAnchorElement;
    fileStatus: HTMLElement;
    processStatus: HTMLElement;
    flightTags: HTMLElement;
    resultSection: HTMLElement;
    resultTableBody: HTMLTableSectionElement;
}

let workbook: FlightFilterWorkbook | null = null;
let flightNumbers = new Set<string>();
let processedWorkbook: FlightFilterWorkbook | null = null;
let originalFileName = '';
let matchedRowsData: FlightFilterMatchedRow[] = [];

const elements: FlightFilterElements = {
    dateInput: requireElement('dateInput', HTMLInputElement),
    fileInput: requireElement('fileInput', HTMLInputElement),
    flightInput: requireElement('flightInput', HTMLInputElement),
    addBtn: requireElement('addBtn', HTMLButtonElement),
    clearBtn: requireElement('clearBtn', HTMLButtonElement),
    processBtn: requireElement('processBtn', HTMLButtonElement),
    downloadLink: requireElement('downloadLink', HTMLAnchorElement),
    fileStatus: requireElement('fileStatus', HTMLElement),
    processStatus: requireElement('processStatus', HTMLElement),
    flightTags: requireElement('flightTags', HTMLElement),
    resultSection: requireElement('resultSection', HTMLElement),
    resultTableBody: requireElement('resultTableBody', HTMLTableSectionElement)
};

document.addEventListener('DOMContentLoaded', function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    elements.dateInput.value = `${year}-${month}-${day}`;
    
    elements.fileInput.addEventListener('change', handleFileUpload);
    elements.addBtn.addEventListener('click', addFlights);
    elements.clearBtn.addEventListener('click', clearFlights);
    elements.processBtn.addEventListener('click', processData);
    elements.downloadLink.addEventListener('click', function(e) {
        e.preventDefault();
        downloadFile();
    });
    
    elements.flightInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addFlights();
        }
    });
});

function requireElement<T extends HTMLElement>(id: string, Type: { new(): T }): T {
    const element = document.getElementById(id);
    if (!(element instanceof Type)) {
        throw new Error(`页面缺少必要元素：${id}`);
    }
    return element;
}

function showStatus(id: 'fileStatus' | 'processStatus', msg: string, type: FlightFilterStatusType) {
    const el = elements[id];
    el.textContent = msg;
    el.className = 'status status-' + type;
}

function getWorksheetRange(worksheet: FlightFilterWorksheet): FlightFilterRange {
    return XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
}

function getWorksheetCell(worksheet: FlightFilterWorksheet, rowIndex: number, columnIndex: number): FlightFilterCell | undefined {
    return worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] as FlightFilterCell | undefined;
}

async function handleFileUpload(e: Event) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) {
        return;
    }

    const file = target.files?.[0];
    if (!file) return;
    
    originalFileName = file.name.replace(/\.(xlsx|xls)$/i, '');

    try {
        const data = new Uint8Array(await file.arrayBuffer());
        workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const range = getWorksheetRange(worksheet);
        const dataRows = range.e.r;
        
        showStatus('fileStatus', `已加载: ${file.name}，共 ${dataRows} 行数据`, 'success');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatus('fileStatus', '文件加载失败: ' + message, 'error');
    }
}

function addFlights() {
    const value = elements.flightInput.value.trim();
    
    if (!value) {
        showStatus('processStatus', '请输入航班号', 'error');
        return;
    }
    
    const flights = value.split(/[,，]/).map(f => f.trim()).filter(f => f);
    let added = 0;
    
    flights.forEach(flight => {
        if (/^\d{4}$/.test(flight)) {
            flightNumbers.add(flight);
            added++;
        } else {
            showStatus('processStatus', '航班号格式错误: ' + flight + '（应为4位数字）', 'error');
        }
    });
    
    elements.flightInput.value = '';
    updateFlightTags();
    
    if (added > 0) {
        showStatus('processStatus', `当前共 ${flightNumbers.size} 个航班号`, 'success');
    }
}

function updateFlightTags() {
    const container = elements.flightTags;
    container.innerHTML = '';
    
    if (flightNumbers.size === 0) {
        container.innerHTML = '<div style="color: #6c757d; padding: 8px;">暂无航班号</div>';
        return;
    }
    
    flightNumbers.forEach(flight => {
        const tag = document.createElement('div');
        tag.className = 'flight-tag';
        tag.innerHTML = `
            <span>${flight}</span>
            <span class="remove" onclick="removeFlight('${flight}')">×</span>
        `;
        container.appendChild(tag);
    });
}

function removeFlight(flight) {
    flightNumbers.delete(flight);
    updateFlightTags();
    showStatus('processStatus', '已移除航班号: ' + flight, 'info');
}

function clearFlights() {
    flightNumbers.clear();
    updateFlightTags();
    elements.flightInput.value = '';
    showStatus('processStatus', '已清空所有航班号', 'info');
}

function processData() {
    if (!workbook) {
        showStatus('processStatus', '请先上传Excel文件', 'error');
        return;
    }
    
    if (flightNumbers.size === 0) {
        showStatus('processStatus', '请至少添加一个航班号', 'error');
        return;
    }
    
    const cutoffDateStr = elements.dateInput.value;
    if (!cutoffDateStr) {
        showStatus('processStatus', '请选择统计截止日期', 'error');
        return;
    }
    
    showStatus('processStatus', '正在处理数据...', 'info');
    
    try {
        const cutoffDate = new Date(cutoffDateStr);
        cutoffDate.setHours(23, 59, 59, 999);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const range = getWorksheetRange(worksheet);
        
        const matchedRows = new Set<number>();
        const lastFlightRows = new Map<string, number>();
        const pilotLastRows = new Map<string, number>();
        const pilotFlightRecords = new Map<string, FlightFilterRowRecord[]>();
        const pilotFlightMap = new Map<string, Set<string>>();
        const pilotAllRecords = new Map<string, FlightFilterRowRecord[]>();
        
        for (let R = 1; R <= range.e.r; R++) {
            const pilotNameCell = getWorksheetCell(worksheet, R, 1);
            const dateCell = getWorksheetCell(worksheet, R, 2);
            const taskCell = getWorksheetCell(worksheet, R, 3);
            
            if (!pilotNameCell || !dateCell || !taskCell) continue;
            
            const pilotName = String(pilotNameCell.v || '').trim();
            const task = String(taskCell.v || '');
            
            let rowDate: Date;
            if (dateCell.t === 'd') {
                rowDate = dateCell.v instanceof Date ? dateCell.v : new Date(String(dateCell.v));
            } else {
                try {
                    rowDate = new Date(String(dateCell.v));
                } catch (error) {
                    continue;
                }
            }

            if (Number.isNaN(rowDate.getTime())) {
                continue;
            }
            
            if (rowDate.getTime() > cutoffDate.getTime()) continue;
            
            const matchedFlights: string[] = [];
            flightNumbers.forEach(flight => {
                if (task.includes(flight)) {
                    matchedFlights.push(flight);
                }
            });
            
            if (matchedFlights.length > 0) {
                matchedRows.add(R);
                
                if (!pilotAllRecords.has(pilotName)) {
                    pilotAllRecords.set(pilotName, []);
                }
                pilotAllRecords.get(pilotName).push({
                    row: R,
                    date: rowDate
                });
                
                matchedFlights.forEach(flight => {
                    const key = `${pilotName}|${flight}`;
                    
                    if (!pilotFlightRecords.has(key)) {
                        pilotFlightRecords.set(key, []);
                    }
                    
                    pilotFlightRecords.get(key).push({
                        row: R,
                        date: rowDate
                    });
                    
                    if (!pilotFlightMap.has(pilotName)) {
                        pilotFlightMap.set(pilotName, new Set());
                    }
                    pilotFlightMap.get(pilotName).add(flight);
                });
            }
        }
        
        pilotFlightRecords.forEach((records, key) => {
            records.sort((a, b) => b.date.getTime() - a.date.getTime());
            lastFlightRows.set(key, records[0].row);
        });
        
        pilotAllRecords.forEach((records, pilotName) => {
            records.sort((a, b) => b.date.getTime() - a.date.getTime());
            pilotLastRows.set(pilotName, records[0].row);
        });
        
        const noRecordInfo: Array<[string, string]> = [];
        pilotFlightMap.forEach((flights, pilotName) => {
            const missingFlights: string[] = [];
            flightNumbers.forEach(flight => {
                if (!flights.has(flight)) {
                    missingFlights.push(flight);
                }
            });
            
            if (missingFlights.length > 0) {
                noRecordInfo.push([pilotName, missingFlights.join('、')]);
            }
        });
        
        createResultWorkbook(worksheet, range, matchedRows, lastFlightRows, pilotLastRows, noRecordInfo, sheetName);
        
        displayResults(worksheet, matchedRows, lastFlightRows, pilotLastRows);
        
        showStatus('processStatus', '数据处理完成', 'success');
        elements.resultSection.style.display = 'block';
        
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatus('processStatus', '处理失败: ' + message, 'error');
        console.error(error);
    }
}

function createResultWorkbook(
    sourceSheet: FlightFilterWorksheet,
    range: FlightFilterRange,
    matchedRows: Set<number>,
    lastFlightRows: Map<string, number>,
    pilotLastRows: Map<string, number>,
    noRecordInfo: Array<[string, string]>,
    originalSheetName: string
) {
    processedWorkbook = XLSX.utils.book_new();
    
    const newSheet: FlightFilterWorksheet = {};
    
    for (let R = 0; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
            const addr = XLSX.utils.encode_cell({r: R, c: C});
            const sourceCell = sourceSheet[addr];
            
            if (!sourceCell) continue;
            
            let cellStyle = sourceCell.s || {};
            
            if (R > 0) {
                let isPilotLast = false;
                pilotLastRows.forEach(lastRow => {
                    if (lastRow === R) {
                        isPilotLast = true;
                    }
                });
                
                let isLastFlight = false;
                lastFlightRows.forEach(lastRow => {
                    if (lastRow === R) {
                        isLastFlight = true;
                    }
                });
                
                if (isPilotLast) {
                    cellStyle = {
                        fill: { patternType: "solid", fgColor: { rgb: "CCE5FF" } },
                        alignment: { horizontal: "left", vertical: "center" },
                        border: {
                            top: {style: "thin", color: {rgb: "000000"}},
                            bottom: {style: "thin", color: {rgb: "000000"}},
                            left: {style: "thin", color: {rgb: "000000"}},
                            right: {style: "thin", color: {rgb: "000000"}}
                        }
                    };
                } else if (isLastFlight) {
                    cellStyle = {
                        fill: { patternType: "solid", fgColor: { rgb: "FFCCCC" } },
                        alignment: { horizontal: "left", vertical: "center" },
                        border: {
                            top: {style: "thin", color: {rgb: "000000"}},
                            bottom: {style: "thin", color: {rgb: "000000"}},
                            left: {style: "thin", color: {rgb: "000000"}},
                            right: {style: "thin", color: {rgb: "000000"}}
                        }
                    };
                } else if (matchedRows.has(R)) {
                    cellStyle = {
                        fill: { patternType: "solid", fgColor: { rgb: "FFFFCC" } },
                        alignment: { horizontal: "left", vertical: "center" },
                        border: {
                            top: {style: "thin", color: {rgb: "000000"}},
                            bottom: {style: "thin", color: {rgb: "000000"}},
                            left: {style: "thin", color: {rgb: "000000"}},
                            right: {style: "thin", color: {rgb: "000000"}}
                        }
                    };
                }
            }
            
            newSheet[addr] = {
                v: sourceCell.v,
                t: sourceCell.t || 's',
                s: cellStyle
            };
        }
    }
    
    newSheet['!ref'] = sourceSheet['!ref'];
    if (sourceSheet['!cols']) newSheet['!cols'] = sourceSheet['!cols'];
    if (sourceSheet['!rows']) newSheet['!rows'] = sourceSheet['!rows'];
    
    XLSX.utils.book_append_sheet(processedWorkbook, newSheet, originalSheetName);
    
    if (noRecordInfo.length > 0) {
        const noRecordData = [
            ['中文名', '无记录航班号'],
            ...noRecordInfo
        ];
        const wsNoRecord = XLSX.utils.aoa_to_sheet(noRecordData);
        wsNoRecord['!cols'] = [{ wch: 15 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(processedWorkbook, wsNoRecord, '无记录说明');
    }
}

function displayResults(
    worksheet: FlightFilterWorksheet,
    matchedRows: Set<number>,
    lastFlightRows: Map<string, number>,
    pilotLastRows: Map<string, number>
) {
    const tbody = elements.resultTableBody;
    tbody.innerHTML = '';
    
    matchedRowsData = [];
    
    matchedRows.forEach(rowNum => {
        const employeeIdCell = getWorksheetCell(worksheet, rowNum, 0);
        const pilotNameCell = getWorksheetCell(worksheet, rowNum, 1);
        const dateCell = getWorksheetCell(worksheet, rowNum, 2);
        const taskCell = getWorksheetCell(worksheet, rowNum, 3);
        
        let colorClass = 'row-yellow';
        let isPilotLast = false;
        pilotLastRows.forEach(lastRow => {
            if (lastRow === rowNum) {
                isPilotLast = true;
            }
        });
        
        let isLastFlight = false;
        lastFlightRows.forEach(lastRow => {
            if (lastRow === rowNum) {
                isLastFlight = true;
            }
        });
        
        if (isPilotLast) {
            colorClass = 'row-blue';
        } else if (isLastFlight) {
            colorClass = 'row-red';
        }
        
        matchedRowsData.push({
            rowNum: rowNum + 1,
            employeeId: employeeIdCell ? employeeIdCell.v : '',
            pilotName: pilotNameCell ? pilotNameCell.v : '',
            date: dateCell ? dateCell.v : '',
            task: taskCell ? taskCell.v : '',
            colorClass: colorClass
        });
    });
    
    matchedRowsData.sort((a, b) => a.rowNum - b.rowNum);
    
    matchedRowsData.forEach(data => {
        const tr = document.createElement('tr');
        tr.className = data.colorClass;
        tr.innerHTML = `
            <td>${data.rowNum}</td>
            <td>${data.employeeId}</td>
            <td>${data.pilotName}</td>
            <td>${data.date}</td>
            <td>${data.task}</td>
        `;
        tbody.appendChild(tr);
    });
}

function downloadFile() {
    if (!processedWorkbook) {
        showStatus('processStatus', '没有可下载的文件', 'error');
        return;
    }
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `${originalFileName}_标色结果_${dateStr}.xlsx`;
    
    XLSX.writeFile(processedWorkbook, fileName);
    showStatus('processStatus', '文件已下载: ' + fileName, 'success');
}
