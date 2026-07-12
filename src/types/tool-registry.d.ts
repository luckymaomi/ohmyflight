type ToolStatus = "done" | "wip";
type ToolCategory = "heavy" | "light" | "automation";

interface ToolItem {
  name: string;
  desc: string;
  entry: string;
  status: ToolStatus;
  category: ToolCategory;
}

interface SkillItem {
  name: string;
  description: string;
  source: string;
  path: string;
}

