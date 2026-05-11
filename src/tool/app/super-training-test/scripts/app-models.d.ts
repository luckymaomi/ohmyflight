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
  sheetInfo?: any;
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
  workbenchResult: any;
  workbenchView: any;
  workbenchSelection: any;
  scheduledDistribution: any;
  crmAnnualResult: any;
  updateSelectedProjects: string[];
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
  workbenchProjectSelect: HTMLSelectElement;
  workbenchStatusSelect: HTMLSelectElement;
  workbenchMonthSelect: HTMLSelectElement;
  workbenchSearchInput: HTMLInputElement;
  workbenchStartDateInput: HTMLInputElement;
  workbenchEndDateInput: HTMLInputElement;
  workbenchStatusChart: HTMLElement;
  workbenchProjectChart: HTMLElement;
  workbenchMonthChart: HTMLElement;
  scheduledDistributionProjectSelect: HTMLSelectElement;
  scheduledDistributionMonthSelect: HTMLSelectElement;
  scheduledDistributionSummary: HTMLElement;
  scheduledDistributionDateChart: HTMLElement;
  crmYearInput: HTMLInputElement;
  crmSummary: HTMLElement;
  crmStatsGrid: HTMLElement;
  crmParticipationChart: HTMLElement;
  crmMonthlyChart: HTMLElement;
  crmMissingBody: HTMLTableSectionElement;
  exportCrmMissingButton: HTMLButtonElement;
  exportWorkbenchSelectionButton: HTMLButtonElement;
  exportWorkbenchViewButton: HTMLButtonElement;
  updateValidityButton: HTMLButtonElement;
  workbenchButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  resultSummary: HTMLElement;
  statsGrid: HTMLElement;
  workbenchProjectSummaryBody: HTMLTableSectionElement;
  workbenchSelectedPeopleTitle: HTMLElement;
  workbenchSelectedPeopleIntro: HTMLElement;
  workbenchSelectedPeople: HTMLElement;
  detailDetails: HTMLDetailsElement;
  detailSummaryLabel: HTMLElement;
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
  renderers: any;
  selection: any;
  controls: any;
  projects: any;
  workbenchController: any;
  actions: any;
  charts: any;
  resultTable: any;
  summaryView: any;
}

interface Window {
  SuperTrainingApp: SuperTrainingAppRuntime;
  echarts?: any;
}
