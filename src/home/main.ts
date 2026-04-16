// 页面加载后初始化首页
document.addEventListener('DOMContentLoaded', initHome);

function initHome() {
    initBackground();
    initToolStats();
}

function initBackground() {
    const app = document.getElementById('mainApp');
    const video = document.getElementById('bgVideo');

    if (!(app instanceof HTMLElement) || !(video instanceof HTMLVideoElement)) {
        return;
    }

    if (CONFIG.bgType === 'video') {
        video.src = CONFIG.bgVideo;
        video.style.display = 'block';
        app.style.backgroundImage = 'none';
    } else {
        video.style.display = 'none';
        video.src = '';
        app.style.backgroundImage = `url('${CONFIG.bgImage}')`;
    }
}

function initToolStats() {
    const toolSections = getToolSections();
    if (!toolSections.length) return;

    const stats = toolSections.map((section, index) => ({
        key: section.category || `section-${index}`,
        name: section.categoryName || section.category || `分类 ${index + 1}`,
        value: Array.isArray(section.items) ? section.items.length : 0
    }));

    renderToolStats(stats);
}

function getToolSections(): ToolSection[] {
    if (typeof tools !== 'undefined' && Array.isArray(tools)) {
        return tools;
    }
    if (Array.isArray(globalThis.tools)) {
        return globalThis.tools;
    }
    return [];
}

function renderToolStats(stats: ToolStatsItem[]) {
    const totalNode = document.getElementById('toolStatsTotal');
    const gridNode = document.getElementById('toolStatsGrid');
    const barsNode = document.getElementById('toolStatsBars');
    const labelsNode = document.getElementById('toolStatsLabels');

    if (
        !(totalNode instanceof HTMLElement)
        || !(gridNode instanceof SVGElement)
        || !(barsNode instanceof SVGElement)
        || !(labelsNode instanceof SVGElement)
        || !stats.length
    ) {
        return;
    }

    const total = stats.reduce((sum, item) => sum + item.value, 0);
    totalNode.textContent = String(total);

    const width = 360;
    const height = 220;
    const padding = { top: 24, right: 14, bottom: 48, left: 14 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...stats.map((item) => item.value), 1);
    const step = innerWidth / stats.length;

    const bars = stats.map((item, index) => {
        const x = padding.left + step * index + step / 2;
        const stemHeight = Math.max(16, (item.value / maxValue) * innerHeight);
        const y = padding.top + innerHeight - stemHeight;
        return { ...item, x, y, stemHeight };
    });

    gridNode.innerHTML = [0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + innerHeight * ratio;
        return `<line class="hero-stats-grid-line" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>`;
    }).join('');

    barsNode.innerHTML = bars.map((bar) => `
        <g>
            <line class="hero-stats-stem" x1="${bar.x}" y1="${padding.top + innerHeight}" x2="${bar.x}" y2="${bar.y}"></line>
            <circle class="hero-stats-dot" cx="${bar.x}" cy="${bar.y}" r="6.5"></circle>
            <text class="hero-stats-value" x="${bar.x}" y="${bar.y - 12}">${bar.value}</text>
        </g>
    `).join('');

    labelsNode.innerHTML = bars.map((bar) => `
        <text class="hero-stats-name" x="${bar.x}" y="${height - 18}">${escapeHtml(bar.name)}</text>
    `).join('');
}

function escapeHtml(value: unknown) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
