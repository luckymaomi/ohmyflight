(function () {
    const runtime = window as HealthPosterRuntime;

    const templates: HealthPosterTemplate[] = [
        {
            id: "vitality",
            name: "活力健身",
            note: "适合运动、健身、体重管理类宣教",
            className: "template-vitality",
            primary: "#0b3b5a",
            secondary: "#0f9aa8",
            accent: "#ff7433",
            background: "#f3f7fa"
        },
        {
            id: "medical",
            name: "蓝白医疗",
            note: "适合健康提醒、疾病预防、就医科普",
            className: "template-medical",
            primary: "#114a7a",
            secondary: "#23a6d5",
            accent: "#36c38f",
            background: "#eef7fb"
        },
        {
            id: "fresh",
            name: "绿色清新",
            note: "适合饮食、睡眠、生活方式主题",
            className: "template-fresh",
            primary: "#24533d",
            secondary: "#7bbf68",
            accent: "#f3b24b",
            background: "#f2f8ef"
        },
        {
            id: "notice",
            name: "重点提示",
            note: "适合注意事项、禁忌、风险提示",
            className: "template-notice",
            primary: "#4b2a16",
            secondary: "#e36f2c",
            accent: "#185a72",
            background: "#fff3e8"
        },
        {
            id: "calm",
            name: "冷静科普",
            note: "适合长段知识解释和制度化宣教",
            className: "template-calm",
            primary: "#19324a",
            secondary: "#4f7fa5",
            accent: "#d99f45",
            background: "#f1f4f7"
        },
        {
            id: "clean",
            name: "简洁公告",
            note: "适合内容较多、需要快速阅读的清单",
            className: "template-clean",
            primary: "#23313f",
            secondary: "#5b8c94",
            accent: "#d85b45",
            background: "#ffffff"
        }
    ];

    runtime.HealthPosterTemplates = templates;
})();
