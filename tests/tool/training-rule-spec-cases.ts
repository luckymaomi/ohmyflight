export type TrainingRuleType =
  | "基准月"
  | "3个月窗口"
  | "3个月窗口（前一日截止）"
  | "最新日期";

export type TrainingRounding = "月底" | "当日";

export type RenewalSpecJudgement =
  | "首次/无旧值"
  | "命中窗口"
  | "提前/窗口外"
  | "超期"
  | "无窗口";

export type ScheduleSpecStatus =
  | "命中窗口"
  | "本阶段到期"
  | "已过期"
  | "有效未到窗口"
  | "阶段外未到期";

export interface TrainingRuleDefinition {
  project: string;
  aliases: string[];
  ruleType: TrainingRuleType;
  validityValue: number;
  validityUnit: "日历月" | "年";
  baseMonthFlex: number;
  rounding: TrainingRounding;
}

export interface RenewalRuleCase {
  project: string;
  scenario: string;
  oldExpiry: string | null;
  trainingDate: string;
  expectedJudgement: RenewalSpecJudgement;
  expectedNewExpiry: string;
  expectedWindowStart?: string;
  expectedWindowEnd?: string;
}

export interface ScheduleRuleCase {
  project: string;
  scenario: string;
  oldExpiry: string;
  stageStart: string;
  stageEnd: string;
  expectedStatus: ScheduleSpecStatus;
}

export const TRAINING_RULE_DEFINITIONS: TrainingRuleDefinition[] = [
  {
    project: "应急训练",
    aliases: ["应急训练", "EP-飞行人员应急复训"],
    ruleType: "基准月",
    validityValue: 24,
    validityUnit: "日历月",
    baseMonthFlex: 1,
    rounding: "月底"
  },
  {
    project: "危险品",
    aliases: ["危险品", "DGET-危险品培训"],
    ruleType: "3个月窗口（前一日截止）",
    validityValue: 2,
    validityUnit: "年",
    baseMonthFlex: 0,
    rounding: "当日"
  },
  {
    project: "航空安保",
    aliases: ["航空安保"],
    ruleType: "最新日期",
    validityValue: 24,
    validityUnit: "日历月",
    baseMonthFlex: 0,
    rounding: "月底"
  },
  {
    project: "疲劳管理",
    aliases: ["疲劳管理"],
    ruleType: "最新日期",
    validityValue: 24,
    validityUnit: "日历月",
    baseMonthFlex: 0,
    rounding: "月底"
  },
  {
    project: "飞行作风",
    aliases: ["飞行作风"],
    ruleType: "最新日期",
    validityValue: 24,
    validityUnit: "日历月",
    baseMonthFlex: 0,
    rounding: "月底"
  },
  {
    project: "英语能力",
    aliases: ["英语能力", "LG_STUDY-英语语言学习/考试"],
    ruleType: "3个月窗口",
    validityValue: 3,
    validityUnit: "年",
    baseMonthFlex: 0,
    rounding: "当日"
  },
  {
    project: "汉语能力",
    aliases: ["汉语能力", "LG_STUDY-汉语语言学习/考试"],
    ruleType: "3个月窗口",
    validityValue: 6,
    validityUnit: "年",
    baseMonthFlex: 0,
    rounding: "当日"
  }
];

export const TRAINING_RENEWAL_CASES: RenewalRuleCase[] = [
  { project: "应急训练", scenario: "首次培训", oldExpiry: null, trainingDate: "2000-01-01", expectedJudgement: "首次/无旧值", expectedNewExpiry: "2002-02-28" },
  { project: "应急训练", scenario: "窗口起点复训", oldExpiry: "2002-02-28", trainingDate: "2001-12-01", expectedJudgement: "命中窗口", expectedNewExpiry: "2004-02-29", expectedWindowStart: "2001-12-01", expectedWindowEnd: "2002-02-28" },
  { project: "应急训练", scenario: "窗口中间复训", oldExpiry: "2002-02-28", trainingDate: "2002-01-15", expectedJudgement: "命中窗口", expectedNewExpiry: "2004-02-29", expectedWindowStart: "2001-12-01", expectedWindowEnd: "2002-02-28" },
  { project: "应急训练", scenario: "窗口终点复训", oldExpiry: "2002-02-28", trainingDate: "2002-02-28", expectedJudgement: "命中窗口", expectedNewExpiry: "2004-02-29", expectedWindowStart: "2001-12-01", expectedWindowEnd: "2002-02-28" },
  { project: "应急训练", scenario: "提前太多复训", oldExpiry: "2002-02-28", trainingDate: "2001-11-30", expectedJudgement: "提前/窗口外", expectedNewExpiry: "2003-12-31", expectedWindowStart: "2001-12-01", expectedWindowEnd: "2002-02-28" },
  { project: "应急训练", scenario: "窗口后补训", oldExpiry: "2002-02-28", trainingDate: "2002-03-01", expectedJudgement: "超期", expectedNewExpiry: "2004-04-30", expectedWindowStart: "2001-12-01", expectedWindowEnd: "2002-02-28" },
  { project: "危险品", scenario: "首次培训", oldExpiry: null, trainingDate: "2000-01-01", expectedJudgement: "首次/无旧值", expectedNewExpiry: "2002-01-01" },
  { project: "危险品", scenario: "窗口起点复训", oldExpiry: "2027-06-15", trainingDate: "2027-03-15", expectedJudgement: "命中窗口", expectedNewExpiry: "2029-06-15", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-14" },
  { project: "危险品", scenario: "窗口终点复训", oldExpiry: "2027-06-15", trainingDate: "2027-06-14", expectedJudgement: "命中窗口", expectedNewExpiry: "2029-06-15", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-14" },
  { project: "危险品", scenario: "失效日当天补训", oldExpiry: "2027-06-15", trainingDate: "2027-06-15", expectedJudgement: "超期", expectedNewExpiry: "2029-06-15", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-14" },
  { project: "危险品", scenario: "提前太多复训", oldExpiry: "2027-06-15", trainingDate: "2027-03-14", expectedJudgement: "提前/窗口外", expectedNewExpiry: "2029-03-14", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-14" },
  { project: "英语能力", scenario: "窗口起点续考", oldExpiry: "2027-06-15", trainingDate: "2027-03-15", expectedJudgement: "命中窗口", expectedNewExpiry: "2030-06-15", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-15" },
  { project: "英语能力", scenario: "失效日当天续考", oldExpiry: "2027-06-15", trainingDate: "2027-06-15", expectedJudgement: "命中窗口", expectedNewExpiry: "2030-06-15", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-15" },
  { project: "英语能力", scenario: "提前太多续考", oldExpiry: "2027-06-15", trainingDate: "2027-03-14", expectedJudgement: "提前/窗口外", expectedNewExpiry: "2030-03-14", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-15" },
  { project: "汉语能力", scenario: "窗口内续考", oldExpiry: "2027-06-15", trainingDate: "2027-05-20", expectedJudgement: "命中窗口", expectedNewExpiry: "2033-06-15", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-15" },
  { project: "汉语能力", scenario: "失效日当天续考", oldExpiry: "2027-06-15", trainingDate: "2027-06-15", expectedJudgement: "命中窗口", expectedNewExpiry: "2033-06-15", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-15" },
  { project: "汉语能力", scenario: "超期后续考", oldExpiry: "2027-06-15", trainingDate: "2027-06-16", expectedJudgement: "超期", expectedNewExpiry: "2033-06-16", expectedWindowStart: "2027-03-15", expectedWindowEnd: "2027-06-15" },
  { project: "航空安保", scenario: "首次培训", oldExpiry: null, trainingDate: "2000-01-01", expectedJudgement: "首次/无旧值", expectedNewExpiry: "2002-01-31" },
  { project: "航空安保", scenario: "有效期内复训", oldExpiry: "2002-01-31", trainingDate: "2001-12-20", expectedJudgement: "无窗口", expectedNewExpiry: "2003-12-31" },
  { project: "疲劳管理", scenario: "提前复训", oldExpiry: "2002-01-31", trainingDate: "2000-06-15", expectedJudgement: "无窗口", expectedNewExpiry: "2002-06-30" },
  { project: "疲劳管理", scenario: "到期当天复训", oldExpiry: "2002-01-31", trainingDate: "2002-01-31", expectedJudgement: "无窗口", expectedNewExpiry: "2004-01-31" },
  { project: "飞行作风", scenario: "过期后补训", oldExpiry: "2002-01-31", trainingDate: "2002-03-01", expectedJudgement: "超期", expectedNewExpiry: "2004-03-31" },
  { project: "飞行作风", scenario: "再次复训", oldExpiry: "2004-03-31", trainingDate: "2003-05-10", expectedJudgement: "无窗口", expectedNewExpiry: "2005-05-31" }
];

export const TRAINING_SCHEDULE_CASES: ScheduleRuleCase[] = [
  { project: "危险品", scenario: "窗口起点进入预排阶段", oldExpiry: "2027-06-15", stageStart: "2027-03-15", stageEnd: "2027-03-31", expectedStatus: "命中窗口" },
  { project: "危险品", scenario: "失效日当天进入预排阶段", oldExpiry: "2027-06-15", stageStart: "2027-06-15", stageEnd: "2027-06-30", expectedStatus: "已过期" },
  { project: "危险品", scenario: "窗口前阶段", oldExpiry: "2027-06-15", stageStart: "2027-03-01", stageEnd: "2027-03-14", expectedStatus: "有效未到窗口" },
  { project: "英语能力", scenario: "失效日当天仍在窗口内", oldExpiry: "2027-06-15", stageStart: "2027-06-15", stageEnd: "2027-06-30", expectedStatus: "命中窗口" },
  { project: "航空安保", scenario: "无窗口项目在本阶段到期", oldExpiry: "2026-04-30", stageStart: "2026-04-01", stageEnd: "2026-04-30", expectedStatus: "本阶段到期" },
  { project: "航空安保", scenario: "无窗口项目在阶段外未到期", oldExpiry: "2026-05-31", stageStart: "2026-04-01", stageEnd: "2026-04-30", expectedStatus: "阶段外未到期" }
];
