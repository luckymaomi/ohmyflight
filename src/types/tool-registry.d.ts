type ToolCategory = "common" | "other";
type ToolSectionCategory = ToolCategory;

interface ToolItem {
  name: string;
  desc: string;
  entry?: string;
  url?: string;
}

interface WorkflowItem {
  name: string;
  desc: string;
  entry?: string;
  url?: string;
}

interface ToolSection {
  category: ToolSectionCategory;
  categoryName: string;
  items: ToolItem[];
}

interface ToolStatsItem {
  key: string;
  name: string;
  value: number;
}

interface Window {
  workflows?: WorkflowItem[];
}
