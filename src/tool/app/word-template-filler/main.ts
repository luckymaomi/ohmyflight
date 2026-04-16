// Word模板填充器 - 主逻辑
// 协调各模块，处理用户交互

const App = {
    config: null as WordTemplateAppConfig | null,
    templateFile: null as File | null,

    requireElement: <T extends HTMLElement>(id: string, Type: { new(): T }): T => {
        const element = document.getElementById(id);
        if (!(element instanceof Type)) {
            throw new Error(`页面缺少必要元素：${id}`);
        }
        return element;
    },

    init: () => {
        const configFile = App.requireElement('configFile', HTMLInputElement);
        const templateFile = App.requireElement('templateFile', HTMLInputElement);
        const appName = App.requireElement('appName', HTMLInputElement);
        const generateBtn = App.requireElement('generateBtn', HTMLButtonElement);
        
        configFile.addEventListener('change', App.handleConfigUpload);
        templateFile.addEventListener('change', App.handleTemplateUpload);
        appName.addEventListener('input', App.checkReady);
        generateBtn.addEventListener('click', App.handleGenerate);
    },

    // 处理配置文件上传
    handleConfigUpload: async (e: Event) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;

        const file = target.files?.[0];
        if (!file) return;

        App.updateStatus('config', '解析中...');

        try {
            App.config = await ConfigParser.parse(file);
            App.updateStatus('config', `已加载: ${file.name} (${App.config.fields.length}个字段)`, false, true);
            App.requireElement('configBox', HTMLElement).classList.add('loaded');
            
            // 显示字段预览
            App.showFieldPreview();
            App.checkReady();
        } catch (error) {
            App.updateStatus('config', '解析失败: ' + error.message, true);
            console.error(error);
        }
    },

    // 处理模板文件上传
    handleTemplateUpload: (e: Event) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;

        const file = target.files?.[0];
        if (!file) return;

        App.templateFile = file;
        App.updateStatus('template', `已加载: ${file.name}`, false, true);
        App.requireElement('templateBox', HTMLElement).classList.add('loaded');
        App.checkReady();
    },

    // 显示字段预览
    showFieldPreview: () => {
        if (!App.config) return;

        const typeLabels = {
            text: '文本',
            textarea: '多行文本',
            date: '日期',
            boolean: '是/否',
            radio: '单选',
            checkbox: '多选',
            loop: '列表'
        };

        let html = '';
        App.config.fields.forEach(field => {
            const typeLabel = typeLabels[field.type] || field.type;
            let extra = '';
            if (field.type === 'radio' || field.type === 'checkbox') {
                extra = ` (${field.options})`;
            } else if (field.type === 'loop') {
                const subFields = App.config.loopFields[field.name] || [];
                extra = ` (${subFields.length}个子字段)`;
            }
            html += `<div class="field-item">
                <span class="name">${field.label} ({${field.name}})</span>
                <span class="type">${typeLabel}${extra}</span>
            </div>`;
        });

        App.requireElement('fieldList', HTMLElement).innerHTML = html;
        App.requireElement('previewSection', HTMLElement).style.display = 'block';
    },

    // 检查是否可以生成
    checkReady: () => {
        const appName = App.requireElement('appName', HTMLInputElement).value.trim();
        const ready = Boolean(App.config && App.templateFile && appName);
        App.requireElement('generateBtn', HTMLButtonElement).disabled = !ready;
    },

    // 更新状态显示
    updateStatus: (type, message, isError = false, isSuccess = false) => {
        const elId = type + 'Status';
        const el = document.getElementById(elId);
        if (el) {
            el.textContent = message;
            el.className = 'status';
            if (isError) el.classList.add('error');
            if (isSuccess) el.classList.add('success');
        } else {
            console.warn('找不到状态元素:', elId);
        }
    },

    // 处理生成
    handleGenerate: async () => {
        const appNameInput = App.requireElement('appName', HTMLInputElement);
        const generateBtn = App.requireElement('generateBtn', HTMLButtonElement);
        const appName = appNameInput.value.trim();
        
        if (!App.config || !App.templateFile || !appName) {
            alert('请完成所有步骤');
            return;
        }

        try {
            generateBtn.disabled = true;
            generateBtn.textContent = '生成中...';

            // 生成HTML
            const htmlContent = HtmlGenerator.generate(App.config, appName, App.templateFile.name);

            // 打包下载
            await AppPackager.package(App.config, appName, htmlContent, App.templateFile);

            generateBtn.textContent = '生成成功！';
            setTimeout(() => {
                generateBtn.textContent = '生成应用';
                generateBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error(error);
            alert('生成失败: ' + error.message);
            generateBtn.textContent = '生成应用';
            generateBtn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
