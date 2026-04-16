// PDF 加水印 - 多规则版
const { PDFDocument } = PDFLib;
const MM2PT = 72 / 25.4;

type StampRule = {
    id: number;
    mode: 'all' | 'odd' | 'even' | 'range';
    rangeStr: string;
    xMm: number;
    yMm: number;
    wMm: number;
    hMm: number;
    opacity: number;
    lockRatio: boolean;
};

type StampState = {
    pdfArrayBuffer: ArrayBuffer | null;
    pdfDoc: any;
    pageCount: number;
    currentPage: number;
    pageWidth: number;
    pageHeight: number;
    renderScale: number;
    imgDataUrl: string | null;
    imgAspect: number;
    pdfFileName: string;
    rules: StampRule[];
    activeRuleId: number | null;
    nextRuleId: number;
    previewMode: boolean;
};

function getElement<T extends HTMLElement>(id: string) {
    return document.getElementById(id) as T;
}

function getCanvasContext(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Canvas 2D context unavailable');
    }
    return context;
}

const state: StampState = {
    pdfArrayBuffer: null,
    pdfDoc: null,
    pageCount: 0,
    currentPage: 1,
    pageWidth: 0,
    pageHeight: 0,
    renderScale: 1,
    imgDataUrl: null,
    imgAspect: 1,
    pdfFileName: '',
    rules: [],
    activeRuleId: null,
    nextRuleId: 1,
    previewMode: false
};

document.addEventListener('DOMContentLoaded', function () {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../libs/pdf.worker.min.js';
    setupUploadArea('pdfUpload', 'pdfInput', handlePdfFile);
    setupUploadArea('imgUpload', 'imgInput', handleImgFile);
    document.getElementById('addRuleBtn').addEventListener('click', () => addRule());
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    document.getElementById('pageJump').addEventListener('change', onPageJump);
    document.getElementById('previewMode').addEventListener('change', onPreviewToggle);
    document.getElementById('exportBtn').addEventListener('click', doExport);
    setupDrag();
});

// ==================== Upload ====================

function setupUploadArea(areaId, inputId, handler) {
    const area = getElement<HTMLElement>(areaId);
    const input = getElement<HTMLInputElement>(inputId);
    area.onclick = () => input.click();
    area.ondragover = e => { e.preventDefault(); area.classList.add('dragover'); };
    area.ondragleave = () => area.classList.remove('dragover');
    area.ondrop = e => {
        e.preventDefault();
        area.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) handler(file);
    };
    input.onchange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) handler(file);
        target.value = '';
    };
}

function showStatus(msg, type, progress?: number) {
    const el = getElement('statusBar');
    getElement('statusText').textContent = msg;
    el.className = 'status-bar ' + (type || 'info');
    el.classList.remove('hidden');
    const pw = getElement('progressWrap');
    const pb = getElement('progressBar');
    if (progress !== undefined && progress >= 0) {
        pw.classList.remove('hidden');
        pb.style.width = Math.min(100, Math.round(progress)) + '%';
    } else {
        pw.classList.add('hidden');
    }
}

async function handlePdfFile(file) {
    showStatus('加载 PDF...', 'info', 0);
    try {
        state.pdfArrayBuffer = await file.arrayBuffer();
        const task = pdfjsLib.getDocument({ data: state.pdfArrayBuffer.slice(0) });
        task.onProgress = p => { if (p.total > 0) showStatus('加载 PDF... ' + Math.round(p.loaded / p.total * 100) + '%', 'info', p.loaded / p.total * 100); };
        state.pdfDoc = await task.promise;
        state.pageCount = state.pdfDoc.numPages;
        state.currentPage = 1;
        state.pdfFileName = file.name.replace(/\.pdf$/i, '');
        const area = getElement('pdfUpload');
        area.classList.add('has-file');
        (area.querySelector('p') as HTMLElement).textContent = file.name;
        (area.querySelector('small') as HTMLElement).textContent = state.pageCount + ' 页';
        showStatus('PDF 已加载: ' + file.name + ' (' + state.pageCount + ' 页)', 'success');
        tryShowEditor();
    } catch (err) {
        showStatus('PDF 加载失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
}

async function handleImgFile(file) {
    try {
        const dataUrl = await readAsDataUrl(file);
        const img = new Image();
        img.onload = function () {
            state.imgDataUrl = dataUrl;
            state.imgAspect = img.naturalWidth / img.naturalHeight;
            const area = getElement('imgUpload');
            area.classList.add('has-file');
            (area.querySelector('p') as HTMLElement).textContent = file.name;
            (area.querySelector('small') as HTMLElement).textContent = img.naturalWidth + ' x ' + img.naturalHeight + ' px';
            showStatus('图片已加载', 'success');
            // Add default rule if none exist
            if (state.rules.length === 0) addRule();
            updateExportBtn();
            tryShowEditor();
        };
        img.src = dataUrl;
    } catch (err) {
        showStatus('图片加载失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
}

function readAsDataUrl(file) {
    return new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            if (typeof r.result !== 'string') {
                reject(new Error('图片读取失败'));
                return;
            }
            resolve(r.result);
        };
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

// ==================== Rules ====================

function createRule(overrides?: Partial<StampRule>) {
    const defaults: StampRule = {
        id: state.nextRuleId++,
        mode: 'all',       // 'all' | 'odd' | 'even' | 'range'
        rangeStr: '',
        xMm: 10,
        yMm: 10,
        wMm: 30,
        hMm: state.imgAspect ? Math.round(30 / state.imgAspect * 10) / 10 : 30,
        opacity: 1,
        lockRatio: true
    };
    return Object.assign(defaults, overrides || {});
}

function addRule(overrides?: Partial<StampRule>) {
    const rule = createRule(overrides);
    state.rules.push(rule);
    state.activeRuleId = rule.id;
    renderRules();
    updateOverlay();
    updateExportBtn();
}

function removeRule(id) {
    state.rules = state.rules.filter(r => r.id !== id);
    if (state.activeRuleId === id) {
        state.activeRuleId = state.rules.length > 0 ? state.rules[0].id : null;
    }
    renderRules();
    updateOverlay();
    updateExportBtn();
}

function duplicateRule(id) {
    const src = state.rules.find(r => r.id === id);
    if (!src) return;
    const { id: _id, ...copy } = src;
    addRule(copy);
}

function getActiveRule() {
    return state.rules.find(r => r.id === state.activeRuleId) || null;
}

function renderRules() {
    const list = document.getElementById('ruleList');
    if (state.rules.length === 0) {
        list.innerHTML = '<div class="text-muted small text-center py-3">暂无规则，点击上方"添加规则"</div>';
        return;
    }
    list.innerHTML = state.rules.map((rule, idx) => {
        const active = rule.id === state.activeRuleId;
        const modeLabels = { all: '全部页面', odd: '奇数页', even: '偶数页', range: '指定页码' };
        return '<div class="rule-card' + (active ? ' active' : '') + '" data-rule-id="' + rule.id + '">' +
            '<div class="rule-header">' +
                '<span class="fw-bold small">规则 ' + (idx + 1) + ' <span class="badge bg-secondary">' + modeLabels[rule.mode] + '</span></span>' +
                '<div class="rule-actions">' +
                    '<button class="btn btn-outline-secondary btn-sm" onclick="duplicateRule(' + rule.id + ')" title="复制规则">复制</button> ' +
                    '<button class="btn btn-outline-danger btn-sm" onclick="removeRule(' + rule.id + ')" title="删除规则">删除</button>' +
                '</div>' +
            '</div>' +
            '<div class="row g-2 align-items-end">' +
                '<div class="col-auto">' +
                    '<label class="form-label small mb-0">页面</label>' +
                    '<select class="form-select form-select-sm" style="width:auto" onchange="onRuleFieldChange(' + rule.id + ',\'mode\',this.value)">' +
                        '<option value="all"' + (rule.mode === 'all' ? ' selected' : '') + '>全部</option>' +
                        '<option value="odd"' + (rule.mode === 'odd' ? ' selected' : '') + '>奇数页</option>' +
                        '<option value="even"' + (rule.mode === 'even' ? ' selected' : '') + '>偶数页</option>' +
                        '<option value="range"' + (rule.mode === 'range' ? ' selected' : '') + '>指定</option>' +
                    '</select>' +
                '</div>' +
                (rule.mode === 'range' ? '<div class="col"><input type="text" class="form-control form-control-sm" placeholder="1,3,5-10" value="' + esc(rule.rangeStr) + '" onchange="onRuleFieldChange(' + rule.id + ',\'rangeStr\',this.value)"></div>' : '') +
            '</div>' +
            '<div class="row g-2 align-items-end mt-1">' +
                '<div class="col-auto"><label class="form-label small mb-0">X</label><input type="number" class="form-control form-control-sm pos-input" step="0.5" value="' + r2(rule.xMm) + '" onchange="onRuleFieldChange(' + rule.id + ',\'xMm\',this.value)" onfocus="setActiveRule(' + rule.id + ')"></div>' +
                '<div class="col-auto"><label class="form-label small mb-0">Y</label><input type="number" class="form-control form-control-sm pos-input" step="0.5" value="' + r2(rule.yMm) + '" onchange="onRuleFieldChange(' + rule.id + ',\'yMm\',this.value)" onfocus="setActiveRule(' + rule.id + ')"></div>' +
                '<div class="col-auto"><label class="form-label small mb-0">宽</label><input type="number" class="form-control form-control-sm pos-input" step="0.5" value="' + r2(rule.wMm) + '" onchange="onRuleFieldChange(' + rule.id + ',\'wMm\',this.value)" onfocus="setActiveRule(' + rule.id + ')"></div>' +
                '<div class="col-auto"><label class="form-label small mb-0">高</label><input type="number" class="form-control form-control-sm pos-input" step="0.5" value="' + r2(rule.hMm) + '" onchange="onRuleFieldChange(' + rule.id + ',\'hMm\',this.value)" onfocus="setActiveRule(' + rule.id + ')"></div>' +
            '</div>' +
            '<div class="d-flex align-items-center gap-3 mt-2">' +
                '<div class="form-check"><input class="form-check-input" type="checkbox"' + (rule.lockRatio ? ' checked' : '') + ' onchange="onRuleFieldChange(' + rule.id + ',\'lockRatio\',this.checked)"><label class="form-check-label small">锁定比例</label></div>' +
                '<label class="small text-muted mb-0">透明度</label>' +
                '<input type="range" class="form-range" min="0.1" max="1" step="0.05" value="' + rule.opacity + '" style="width:80px" oninput="onRuleFieldChange(' + rule.id + ',\'opacity\',this.value)">' +
            '</div>' +
        '</div>';
    }).join('');

    // Click to activate
    list.querySelectorAll('.rule-card').forEach(card => {
        card.addEventListener('click', function (e) {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.tagName === 'INPUT')) return;
            setActiveRule(parseInt(this.dataset.ruleId));
        });
    });
}

function setActiveRule(id) {
    if (state.activeRuleId === id) return;
    state.activeRuleId = id;
    renderRules();
    updateOverlay();
}

function onRuleFieldChange(ruleId, field, value) {
    const rule = state.rules.find(r => r.id === ruleId);
    if (!rule) return;
    if (field === 'mode' || field === 'rangeStr') {
        rule[field] = value;
        renderRules();
    } else if (field === 'lockRatio') {
        rule.lockRatio = !!value;
    } else {
        rule[field] = parseFloat(value) || 0;
        // Lock ratio linkage for width/height inputs
        if (rule.lockRatio && state.imgAspect) {
            if (field === 'wMm') {
                rule.hMm = rule.wMm / state.imgAspect;
                renderRules();
            } else if (field === 'hMm') {
                rule.wMm = rule.hMm * state.imgAspect;
                renderRules();
            }
        }
    }
    if (state.activeRuleId === ruleId) updateOverlay();
    if (state.previewMode) renderPreviewOverlays();
}

function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function r2(v) { return Math.round(v * 100) / 100; }

// ==================== Editor / Canvas ====================

async function tryShowEditor() {
    if (!state.pdfDoc) return;
    document.getElementById('editorSection').classList.remove('hidden');
    updateExportBtn();
    await renderPage();
    updateOverlay();
}

async function renderPage() {
    const page = await state.pdfDoc.getPage(state.currentPage);
    const vp0 = page.getViewport({ scale: 1 });
    state.pageWidth = vp0.width;
    state.pageHeight = vp0.height;
    const wrap = getElement('canvasWrap');
    const maxW = wrap.parentElement.clientWidth - 30;
    state.renderScale = Math.min(maxW / vp0.width, 2);
    const vp = page.getViewport({ scale: state.renderScale });
    const canvas = getElement<HTMLCanvasElement>('pdfCanvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: getCanvasContext(canvas), viewport: vp }).promise;
    getElement<HTMLInputElement>('pageJump').value = String(state.currentPage);
    getElement<HTMLInputElement>('pageJump').max = String(state.pageCount);
    getElement('pageTotal').textContent = String(state.pageCount);
    if (state.previewMode) renderPreviewOverlays();
}

function updateOverlay() {
    const overlay = getElement('imgOverlay');
    // In preview mode, hide the editable overlay
    if (state.previewMode) { overlay.classList.add('hidden'); return; }

    const rule = getActiveRule();
    if (!rule || !state.imgDataUrl) { overlay.classList.add('hidden'); return; }

    // Only show overlay if current page matches this rule
    if (!ruleMatchesPage(rule, state.currentPage)) {
        overlay.classList.add('hidden');
        getElement('canvasHint').textContent = '当前规则不适用于第 ' + state.currentPage + ' 页';
        return;
    }

    overlay.classList.remove('hidden');
    getElement('canvasHint').textContent = '拖拽图片定位，拖拽角点缩放';

    const img = getElement<HTMLImageElement>('overlayImg');
    if (img.src !== state.imgDataUrl) img.src = state.imgDataUrl;

    const s = state.renderScale * MM2PT;
    overlay.style.left = (rule.xMm * s) + 'px';
    overlay.style.top = (rule.yMm * s) + 'px';
    overlay.style.width = (rule.wMm * s) + 'px';
    overlay.style.height = (rule.hMm * s) + 'px';
    img.style.opacity = String(rule.opacity);
}

function updateExportBtn() {
    const btn = getElement<HTMLButtonElement>('exportBtn');
    const hint = getElement('exportHint');
    if (!state.imgDataUrl) {
        btn.disabled = true;
        hint.textContent = '请先上传图片';
    } else if (state.rules.length === 0) {
        btn.disabled = true;
        hint.textContent = '请添加至少一条规则';
    } else {
        btn.disabled = false;
        hint.textContent = state.rules.length + ' 条规则';
    }
}

// ==================== Preview Mode ====================

function onPreviewToggle() {
    state.previewMode = getElement<HTMLInputElement>('previewMode').checked;
    const overlay = getElement('imgOverlay');
    if (state.previewMode) {
        overlay.classList.add('hidden');
        renderPreviewOverlays();
    } else {
        clearPreviewOverlays();
        updateOverlay();
    }
}

function renderPreviewOverlays() {
    clearPreviewOverlays();
    if (!state.imgDataUrl) return;
    const wrap = document.getElementById('canvasWrap');
    const s = state.renderScale * MM2PT;
    const pageNum = state.currentPage;

    for (const rule of state.rules) {
        if (!ruleMatchesPage(rule, pageNum)) continue;
        const div = document.createElement('div');
        div.className = 'preview-overlay';
        div.style.left = (rule.xMm * s) + 'px';
        div.style.top = (rule.yMm * s) + 'px';
        div.style.width = (rule.wMm * s) + 'px';
        div.style.height = (rule.hMm * s) + 'px';
        const img = document.createElement('img');
        img.src = state.imgDataUrl;
        img.style.opacity = String(rule.opacity);
        img.alt = '';
        div.appendChild(img);
        wrap.appendChild(div);
    }
}

function clearPreviewOverlays() {
    document.querySelectorAll('#canvasWrap .preview-overlay').forEach(el => el.remove());
}

// ==================== Page Navigation ====================

async function changePage(delta) {
    const next = state.currentPage + delta;
    if (next < 1 || next > state.pageCount) return;
    state.currentPage = next;
    await renderPage();
    updateOverlay();
}

async function onPageJump() {
    let val = parseInt(getElement<HTMLInputElement>('pageJump').value, 10) || 1;
    val = Math.max(1, Math.min(val, state.pageCount));
    state.currentPage = val;
    await renderPage();
    updateOverlay();
}

// ==================== Drag & Resize ====================

function setupDrag() {
    const wrap = getElement('canvasWrap');
    const overlay = getElement('imgOverlay');
    let mode = null;
    let startX, startY, startLeft, startTop, startW, startH;

    overlay.addEventListener('mousedown', onStart);
    overlay.addEventListener('touchstart', onStart, { passive: false });

    function onStart(e) {
        if (state.previewMode) return;
        e.preventDefault();
        const target = e.target as HTMLElement;
        mode = target.classList.contains('resize-handle') ? 'resize-' + target.dataset.dir : 'move';
        const pos = getEventPos(e);
        startX = pos.x; startY = pos.y;
        startLeft = parseFloat(overlay.style.left) || 0;
        startTop = parseFloat(overlay.style.top) || 0;
        startW = parseFloat(overlay.style.width) || 50;
        startH = parseFloat(overlay.style.height) || 50;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    function onMove(e) {
        if (!mode) return;
        e.preventDefault();
        const rule = getActiveRule();
        if (!rule) return;
        const pos = getEventPos(e);
        const dx = pos.x - startX;
        const dy = pos.y - startY;
        const s = state.renderScale * MM2PT;

        if (mode === 'move') {
            const canvas = getElement<HTMLCanvasElement>('pdfCanvas');
            let newL = Math.max(0, Math.min(startLeft + dx, canvas.width - startW));
            let newT = Math.max(0, Math.min(startTop + dy, canvas.height - startH));
            overlay.style.left = newL + 'px';
            overlay.style.top = newT + 'px';
            rule.xMm = newL / s;
            rule.yMm = newT / s;
        } else {
            let newL = startLeft, newT = startTop, newW = startW, newH = startH;
            const dir = mode.split('-')[1];
            const lock = rule.lockRatio;
            if (dir === 'br') { newW = Math.max(10, startW + dx); newH = lock ? newW / state.imgAspect : Math.max(10, startH + dy); }
            else if (dir === 'bl') { newW = Math.max(10, startW - dx); newH = lock ? newW / state.imgAspect : Math.max(10, startH + dy); newL = startLeft + (startW - newW); }
            else if (dir === 'tr') { newW = Math.max(10, startW + dx); newH = lock ? newW / state.imgAspect : Math.max(10, startH - dy); newT = startTop + (startH - newH); }
            else if (dir === 'tl') { newW = Math.max(10, startW - dx); newH = lock ? newW / state.imgAspect : Math.max(10, startH - dy); newL = startLeft + (startW - newW); newT = startTop + (startH - newH); }
            overlay.style.left = newL + 'px'; overlay.style.top = newT + 'px';
            overlay.style.width = newW + 'px'; overlay.style.height = newH + 'px';
            rule.xMm = newL / s; rule.yMm = newT / s;
            rule.wMm = newW / s; rule.hMm = newH / s;
        }
        renderRules(); // sync input values
    }

    function onEnd() {
        mode = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    }

    function getEventPos(e) {
        const rect = wrap.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
}

// ==================== Rule Matching ====================

function ruleMatchesPage(rule, pageNum) {
    if (rule.mode === 'all') return true;
    if (rule.mode === 'odd') return pageNum % 2 === 1;
    if (rule.mode === 'even') return pageNum % 2 === 0;
    if (rule.mode === 'range') {
        const pages = parseRange(rule.rangeStr, state.pageCount);
        return pages.includes(pageNum);
    }
    return false;
}

function getRulesForPage(pageNum) {
    return state.rules.filter(r => ruleMatchesPage(r, pageNum));
}

function parseRange(str, max) {
    if (!str || !str.trim()) return [];
    const pages = new Set<number>();
    for (const part of str.split(',')) {
        const t = part.trim();
        if (!t) continue;
        if (t.includes('-')) {
            const [a, b] = t.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(a) && !isNaN(b)) { for (let i = Math.max(1, a); i <= Math.min(max, b); i++) pages.add(i); }
        } else {
            const n = parseInt(t);
            if (!isNaN(n) && n >= 1 && n <= max) pages.add(n);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

// ==================== Export ====================

async function doExport() {
    if (!state.pdfArrayBuffer || !state.imgDataUrl || state.rules.length === 0) return;

    showStatus('导出中...', 'info', 0);

    try {
        const pdfDoc = await PDFDocument.load(state.pdfArrayBuffer);
        const imgBytes = await fetch(state.imgDataUrl).then(r => r.arrayBuffer());
        const embeddedImg = state.imgDataUrl.includes('image/png')
            ? await pdfDoc.embedPng(imgBytes)
            : await pdfDoc.embedJpg(imgBytes);

        const totalPages = pdfDoc.getPageCount();
        let stampCount = 0;

        for (let i = 0; i < totalPages; i++) {
            const pageNum = i + 1;
            const matchingRules = getRulesForPage(pageNum);
            if (matchingRules.length === 0) continue;

            const page = pdfDoc.getPage(i);
            const { height } = page.getSize();

            for (const rule of matchingRules) {
                const xPt = rule.xMm * MM2PT;
                const wPt = rule.wMm * MM2PT;
                const hPt = rule.hMm * MM2PT;
                const yPt = height - rule.yMm * MM2PT - hPt;

                page.drawImage(embeddedImg, {
                    x: xPt, y: yPt, width: wPt, height: hPt, opacity: rule.opacity
                });
                stampCount++;
            }

            showStatus('处理中 ' + pageNum + ' / ' + totalPages + ' 页', 'info', pageNum / totalPages * 100);
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
        }

        showStatus('正在生成文件...', 'info', 100);
        const pdfBytes = await pdfDoc.save();
        download(new Blob([pdfBytes], { type: 'application/pdf' }), state.pdfFileName + '_stamped.pdf');
        showStatus('导出完成 (共添加 ' + stampCount + ' 个水印)', 'success');
    } catch (err) {
        showStatus('导出失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
}

function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}
