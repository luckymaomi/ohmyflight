type ToolStatus = "done" | "wip";

interface ToolItem {
  name: string;
  desc: string;
  entry: string;
  status: ToolStatus;
}

