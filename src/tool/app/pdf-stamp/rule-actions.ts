(function () {
    const runtime = window.PdfStampApp || (window.PdfStampApp = {});

    function escapeHtml(value: unknown): string {
        return String(value || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function round2(value: number): number {
        return Math.round(value * 100) / 100;
    }

    function createRule(context: PdfStampAppContext, overrides?: Partial<PdfStampRule>): PdfStampRule {
        return context.logic.createRule(context.state.nextRuleId++, context.state.imgAspect, overrides);
    }

    function addRule(context: PdfStampAppContext, overrides?: Partial<PdfStampRule>): void {
        const rule = createRule(context, overrides);
        context.state.rules.push(rule);
        context.state.activeRuleId = rule.id;
        renderRules(context);
        context.runtime.CanvasActions.updateOverlay(context);
        context.updateExportBtn();
    }

    function removeRule(context: PdfStampAppContext, id: number): void {
        context.state.rules = context.state.rules.filter(rule => rule.id !== id);
        if (context.state.activeRuleId === id) {
            context.state.activeRuleId = context.state.rules.length > 0 ? context.state.rules[0].id : null;
        }
        renderRules(context);
        context.runtime.CanvasActions.updateOverlay(context);
        context.updateExportBtn();
    }

    function duplicateRule(context: PdfStampAppContext, id: number): void {
        const source = context.state.rules.find(rule => rule.id === id);
        if (!source) return;
        const { id: _id, ...copy } = source;
        addRule(context, copy);
    }

    function setActiveRule(context: PdfStampAppContext, id: number): void {
        if (context.state.activeRuleId === id) return;
        context.state.activeRuleId = id;
        renderRules(context);
        context.runtime.CanvasActions.updateOverlay(context);
    }

    function onRuleFieldChange(context: PdfStampAppContext, ruleId: number, field: keyof PdfStampRule, value: unknown): void {
        const rule = context.state.rules.find(item => item.id === ruleId);
        if (!rule) return;
        context.replaceRule(context.logic.updateRuleField(rule, field, value, context.state.imgAspect));
        if (field === 'mode' || field === 'rangeStr' || field === 'wMm' || field === 'hMm') {
            renderRules(context);
        }
        if (context.state.activeRuleId === ruleId) {
            context.runtime.CanvasActions.updateOverlay(context);
        }
        if (context.state.previewMode) {
            context.runtime.CanvasActions.renderPreviewOverlays(context);
        }
    }

    function renderRules(context: PdfStampAppContext): void {
        const list = context.getElement<HTMLElement>('ruleList');
        if (context.state.rules.length === 0) {
            list.innerHTML = '<div class="text-muted small text-center py-3">暂无规则，点击上方"添加规则"</div>';
            return;
        }

        list.innerHTML = context.state.rules.map((rule, index) => {
            const active = rule.id === context.state.activeRuleId;
            const modeLabels = { all: '全部页面', odd: '奇数页', even: '偶数页', range: '指定页码' };
            return '<div class="rule-card' + (active ? ' active' : '') + '" data-rule-id="' + rule.id + '">' +
                '<div class="rule-header">' +
                    '<span class="fw-bold small">规则 ' + (index + 1) + ' <span class="badge bg-secondary">' + modeLabels[rule.mode] + '</span></span>' +
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
                    (rule.mode === 'range' ? '<div class="col"><input type="text" class="form-control form-control-sm" placeholder="1,3,5-10" value="' + escapeHtml(rule.rangeStr) + '" onchange="onRuleFieldChange(' + rule.id + ',\'rangeStr\',this.value)"></div>' : '') +
                '</div>' +
                '<div class="row g-2 align-items-end mt-1">' +
                    '<div class="col-auto"><label class="form-label small mb-0">X</label><input type="number" class="form-control form-control-sm pos-input" step="0.5" value="' + round2(rule.xMm) + '" onchange="onRuleFieldChange(' + rule.id + ',\'xMm\',this.value)" onfocus="setActiveRule(' + rule.id + ')"></div>' +
                    '<div class="col-auto"><label class="form-label small mb-0">Y</label><input type="number" class="form-control form-control-sm pos-input" step="0.5" value="' + round2(rule.yMm) + '" onchange="onRuleFieldChange(' + rule.id + ',\'yMm\',this.value)" onfocus="setActiveRule(' + rule.id + ')"></div>' +
                    '<div class="col-auto"><label class="form-label small mb-0">宽</label><input type="number" class="form-control form-control-sm pos-input" step="0.5" value="' + round2(rule.wMm) + '" onchange="onRuleFieldChange(' + rule.id + ',\'wMm\',this.value)" onfocus="setActiveRule(' + rule.id + ')"></div>' +
                    '<div class="col-auto"><label class="form-label small mb-0">高</label><input type="number" class="form-control form-control-sm pos-input" step="0.5" value="' + round2(rule.hMm) + '" onchange="onRuleFieldChange(' + rule.id + ',\'hMm\',this.value)" onfocus="setActiveRule(' + rule.id + ')"></div>' +
                '</div>' +
                '<div class="d-flex align-items-center gap-3 mt-2">' +
                    '<div class="form-check"><input class="form-check-input" type="checkbox"' + (rule.lockRatio ? ' checked' : '') + ' onchange="onRuleFieldChange(' + rule.id + ',\'lockRatio\',this.checked)"><label class="form-check-label small">锁定比例</label></div>' +
                    '<label class="small text-muted mb-0">透明度</label>' +
                    '<input type="range" class="form-range" min="0.1" max="1" step="0.05" value="' + rule.opacity + '" style="width:80px" oninput="onRuleFieldChange(' + rule.id + ',\'opacity\',this.value)">' +
                '</div>' +
            '</div>';
        }).join('');

        list.querySelectorAll<HTMLElement>('.rule-card').forEach(card => {
            card.addEventListener('click', event => {
                const target = event.target as HTMLElement | null;
                if (target && (target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.tagName === 'INPUT')) return;
                setActiveRule(context, Number.parseInt(card.dataset.ruleId || '', 10));
            });
        });
    }

    function bindRuleActions(context: PdfStampAppContext): void {
        context.getElement<HTMLButtonElement>('addRuleBtn').addEventListener('click', () => addRule(context));
        (window as any).removeRule = (id: number) => removeRule(context, id);
        (window as any).duplicateRule = (id: number) => duplicateRule(context, id);
        (window as any).setActiveRule = (id: number) => setActiveRule(context, id);
        (window as any).onRuleFieldChange = (ruleId: number, field: keyof PdfStampRule, value: unknown) => onRuleFieldChange(context, ruleId, field, value);
    }

    runtime.RuleActions = {
        addRule,
        bindRuleActions,
        renderRules,
        setActiveRule
    };
})();
