interface WorkflowItem {
    id: string;
    name: string;
    entries: string[];
}

const workflows: WorkflowItem[] = [
    {
        id: "lock-entry",
        name: "锁班",
        entries: ["text-joiner", "crew-match-name-id", "lock-entry-helper", "training-workbench"]
    },
    {
        id: "manual-review",
        name: "手册",
        entries: ["pdf-stamp", "proof-king", "audit-king"]
    },
    {
        id: "qualification-operations",
        name: "资质运行",
        entries: [
            "hotel-bill-check",
            "focus-crew",
            "crew-flight-stats",
            "flight-stats-helper",
            "qualification-query-helper"
        ]
    }
];

window.workflows = workflows;
