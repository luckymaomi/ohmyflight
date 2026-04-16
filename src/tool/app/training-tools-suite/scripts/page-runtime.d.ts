interface TrainingToolsSuiteUiRuntime {
  requireElement<T extends Element>(id: string, Type: { new(): T }): T;
}

interface TrainingToolsSuiteScheduleState {
  ruleSheetName: string;
  validitySheetName: string;
  ruleMap: Map<string, any>;
  enabledRules: any[];
  result: any;
}

interface TrainingToolsSuiteScheduleElements {
  ruleFile: HTMLInputElement;
  validityFile: HTMLInputElement;
  projectSelect: HTMLSelectElement;
  stageStartInput: HTMLInputElement;
  stageEndInput: HTMLInputElement;
  runButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  statusLine: HTMLElement;
  ruleSummary: HTMLElement;
  statsGrid: HTMLElement;
  expiredBody: HTMLTableSectionElement;
  windowBody: HTMLTableSectionElement;
  stageDueBody: HTMLTableSectionElement;
  missingBody: HTMLTableSectionElement;
  ignoredBody: HTMLTableSectionElement;
}

interface TrainingToolsSuiteUpdateState {
  result: any;
  sourceFileName: string;
}

interface TrainingToolsSuiteUpdateElements {
  trainingFile: HTMLInputElement;
  validityFile: HTMLInputElement;
  runButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  statusLine: HTMLElement;
  statsGrid: HTMLElement;
  previewBody: HTMLTableSectionElement;
  skippedBody: HTMLTableSectionElement;
}

interface TrainingToolsSuiteConflictState {
  result: any;
  sourceFileName: string;
}

interface TrainingToolsSuiteConflictElements {
  sourceFile: HTMLInputElement;
  runButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  statusLine: HTMLElement;
  statsGrid: HTMLElement;
  conflictBody: HTMLTableSectionElement;
  skippedBody: HTMLTableSectionElement;
}

interface Window {
  TrainingToolsSuiteUi: TrainingToolsSuiteUiRuntime;
  TrainingToolsSuiteSchedule: {
    state: TrainingToolsSuiteScheduleState;
    elements: TrainingToolsSuiteScheduleElements;
  };
  TrainingToolsSuiteUpdate: {
    state: TrainingToolsSuiteUpdateState;
    elements: TrainingToolsSuiteUpdateElements;
  };
  TrainingToolsSuiteConflict: {
    state: TrainingToolsSuiteConflictState;
    elements: TrainingToolsSuiteConflictElements;
  };
}
