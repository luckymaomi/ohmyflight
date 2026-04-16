// 应用打包器
// 将生成的HTML、Word模板、依赖库打包成zip（完全离线可用）

const AppPackager = {
    // 加载库文件内容
    loadLibFile: async (path) => {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error(`无法加载 ${path}`);
        return await resp.text();
    },

    // 打包应用
    package: async (config, appName, htmlContent, templateFile) => {
        const zip = new JSZip();
        
        // 生成文件名（去除特殊字符）
        const safeName = appName.replace(/[\\/:*?"<>|]/g, '_');
        
        // 1. 添加HTML文件
        zip.file(`${safeName}.html`, htmlContent);
        
        // 2. 添加Word模板
        const templateData = await templateFile.arrayBuffer();
        zip.file(templateFile.name, templateData);
        
        // 3. 添加依赖库文件
        const libsFolder = zip.folder('libs');
        try {
            const pizzipContent = await AppPackager.loadLibFile('../../../libs/pizzip.min.js');
            libsFolder.file('pizzip.min.js', pizzipContent);
            
            const docxContent = await AppPackager.loadLibFile('../../../libs/docxtemplater.min.js');
            libsFolder.file('docxtemplater.min.js', docxContent);
        } catch (e) {
            console.error('加载库文件失败:', e);
            alert('打包失败：无法加载依赖库文件');
            return;
        }
        
        // 4. 生成说明文档
        const readme = AppPackager.generateReadme(appName, safeName, templateFile.name);
        zip.file('使用说明.txt', readme);
        
        // 5. 生成配置备份（方便以后修改）
        const configBackup = AppPackager.generateConfigBackup(config);
        zip.file('配置备份.json', configBackup);
        
        // 生成zip文件
        const blob = await zip.generateAsync({ type: 'blob' });
        
        // 下载
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    // 生成说明文档
    generateReadme: (appName, safeName, templateFileName) => {
        return `${appName} - 使用说明
========================================

【文件清单】
- ${safeName}.html    填写页面
- ${templateFileName}    Word模板
- 使用说明.txt    本文件
- 配置备份.json    配置数据备份

【使用方法】
1. 将 ${safeName}.html 和 ${templateFileName} 放在同一文件夹
2. 用浏览器打开 ${safeName}.html
3. 填写表单内容
4. 点击"导出Word文档"

【注意事项】
- HTML、Word模板、libs文件夹必须放在同一目录
- 如果提示模板未找到，点击上传模板文件即可
- 推荐使用Chrome或Edge浏览器
- 完全离线可用，无需联网

【目录结构】
解压后保持以下结构：
├── ${safeName}.html
├── ${templateFileName}
└── libs/
    ├── pizzip.min.js
    └── docxtemplater.min.js

生成时间：${new Date().toLocaleString('zh-CN')}
`;
    },
    
    // 生成配置备份
    generateConfigBackup: (config) => {
        return JSON.stringify(config, null, 2);
    }
};
