type XlsxGlobal = typeof import("xlsx-js-style");
type TrainingToolsNamespace = Record<string, any>;
type TrainingToolNamespace = Record<string, any>;

interface SiteConfig {
  bgType: "none" | "image" | "video";
  bgImage: string;
  bgVideo: string;
}

interface WordTemplateFieldConfig {
  name: string;
  label: string;
  type: string;
  options: string;
  defaultValue: string;
  required: boolean;
  placeholder: string;
  format: string;
  subSheet: string;
  rows: number;
}

interface WordTemplateAppConfig {
  fields: WordTemplateFieldConfig[];
  loopFields: Record<string, WordTemplateFieldConfig[]>;
}

interface Window {
  tools: ToolItem[];
  skills: SkillItem[];
  XLSX: XlsxGlobal;
  TrainingTools: TrainingToolsNamespace;
  TrainingTool: TrainingToolNamespace;
  OhmyflightTheme?: {
    getTheme(): "light" | "dark";
    setTheme(theme: "light" | "dark"): "light" | "dark";
    toggleTheme(): "light" | "dark";
    storageKey: string;
  };
}

declare var tools: ToolItem[];
declare var skills: SkillItem[];

declare const CONFIG: SiteConfig;
declare const XLSX: XlsxGlobal;
declare const JSZip: any;
declare const ConfigParser: {
  parse(file: File): Promise<WordTemplateAppConfig>;
  parseWorkbook(workbook: import("xlsx-js-style").WorkBook): WordTemplateAppConfig;
  parseFieldRow(row: Record<string, unknown>): WordTemplateFieldConfig | null;
  normalizeType(type: unknown): string;
};
declare const HtmlGenerator: {
  generate(config: WordTemplateAppConfig, appName: string, templateFileName: string): string;
};
declare const AppPackager: {
  package(config: WordTemplateAppConfig, appName: string, htmlContent: string, templateFile: File): Promise<void>;
};
