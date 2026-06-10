type HealthPosterExportFormat = "png" | "jpg" | "webp";

type HealthPosterPoint = {
    title: string;
    body: string;
};

type HealthPosterData = {
    title: string;
    subtitle: string;
    points: HealthPosterPoint[];
};

type HealthPosterTemplate = {
    id: string;
    name: string;
    note: string;
    className: string;
    primary: string;
    secondary: string;
    accent: string;
    background: string;
};

type HealthPosterLogicApi = {
    posterWidth: number;
    posterHeight: number;
    exportFormats: HealthPosterExportFormat[];
    createDefaultPosterData: () => HealthPosterData;
    normalizePosterData: (data: Partial<HealthPosterData>) => HealthPosterData;
    formatKnowledgeLabel: (index: number) => string;
    createExportFilename: (title: string, format: HealthPosterExportFormat) => string;
    getMimeType: (format: HealthPosterExportFormat) => string;
};

type HealthPosterRuntime = Window & {
    HealthPosterTemplates?: HealthPosterTemplate[];
    HealthPosterLogic?: HealthPosterLogicApi;
    html2canvas?: (
        element: HTMLElement,
        options?: {
            backgroundColor?: string | null;
            width?: number;
            height?: number;
            scale?: number;
            useCORS?: boolean;
            imageTimeout?: number;
        }
    ) => Promise<HTMLCanvasElement>;
};
