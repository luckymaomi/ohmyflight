type SuperTrainingWorkbook = import("xlsx-js-style").WorkBook;

interface SuperTrainingSheetRow {
  rowNumber: number;
  cells: unknown[];
}

interface SuperTrainingRecordedInfo {
  rows: SuperTrainingSheetRow[];
}

interface SuperTrainingProjectAnalysis {
  canonical: string;
  peopleColumnIndex: number;
  recordedInfo?: SuperTrainingRecordedInfo | null;
  recordedMonths: string[];
  pendingMonths: string[];
  availableMonths: string[];
  pendingRowCount: number;
  recordedRowCount: number;
  peopleHeader?: string;
  sheetName?: string;
}

interface SuperTrainingPeopleInfo {
  name: string;
  rows: SuperTrainingSheetRow[];
}

interface SuperTrainingAnalysis {
  peopleInfo: SuperTrainingPeopleInfo;
  projects: SuperTrainingProjectAnalysis[];
  availableMonths: string[];
  sheetNames: string[];
  projectMap: Map<string, SuperTrainingProjectAnalysis>;
}

interface SuperTrainingAppCopy {
  defaultExportButton: string;
  defaultOverview: string;
  defaultProjectCards: string;
  defaultDetailTable: string;
  defaultSkippedTable: string;
  defaultResultSummary: string;
  defaultStatus: string;
  defaultWaiting: string;
}

interface SuperTrainingAppState {
  sourceFileName: string;
  workbook: SuperTrainingWorkbook | null;
  analysis: SuperTrainingAnalysis | null;
  busy: boolean;
  pendingExport: SuperTrainingWorkbook | null;
  pendingExportName: string;
  pendingExportLabel: string;
  updateSelectedProjects: string[];
  scheduleSelectedProjects: string[];
}

interface SuperTrainingUpdatedRowEntry {
  rowNumber: number;
  columns: Set<number>;
}

interface SuperTrainingAppElements {
  workbookFile: HTMLInputElement;
  workbookOverview: HTMLElement;
  statusLine: HTMLElement;
  updateValiditySheetSelect: HTMLSelectElement;
  updateProjectGroup: HTMLElement;
  updateProjectSelectAll: HTMLInputElement;
  updateProjectSummary: HTMLElement;
  updateProjectList: HTMLElement;
  updateMonthSelect: HTMLSelectElement;
  scheduleValiditySheetSelect: HTMLSelectElement;
  scheduleProjectGroup: HTMLElement;
  scheduleProjectSelectAll: HTMLInputElement;
  scheduleProjectSummary: HTMLElement;
  scheduleProjectList: HTMLElement;
  scheduleStartDateInput: HTMLInputElement;
  scheduleEndDateInput: HTMLInputElement;
  updateValidityButton: HTMLButtonElement;
  generateScheduleButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  resultSummary: HTMLElement;
  statsGrid: HTMLElement;
  detailTableTitle: HTMLElement;
  detailTableHead: HTMLTableSectionElement;
  detailTableBody: HTMLTableSectionElement;
  skippedDetails: HTMLDetailsElement;
  skippedSummaryLabel: HTMLElement;
  skippedTableHead: HTMLTableSectionElement;
  skippedTableBody: HTMLTableSectionElement;
  projectCards: HTMLElement;
}

interface SuperTrainingAppRuntime {
  copy: SuperTrainingAppCopy;
  state: SuperTrainingAppState;
  elements: SuperTrainingAppElements;
}

interface Window {
  SuperTrainingApp: SuperTrainingAppRuntime;
}
