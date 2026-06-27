// 앱 레벨 상수 (SQLite enum 미사용 → 여기서 검증)

export const TARGET_AIS = [
  "ChatGPT",
  "Claude",
  "Codex",
  "Claude Code",
  "Other",
] as const;
export type TargetAI = (typeof TARGET_AIS)[number];

export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const LOG_TYPES = ["RESPONSE", "ERROR", "NOTE"] as const;
export type LogType = (typeof LOG_TYPES)[number];

export const TEMPLATE_CATEGORIES = [
  "Bugfix",
  "Feature",
  "Refactor",
  "Test",
  "Docs",
  "Review",
  "Deploy",
  "Other",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const STATUS_META: Record<
  TaskStatus,
  { label: string; cls: string }
> = {
  TODO: { label: "TODO", cls: "bg-slate-700 text-slate-200" },
  IN_PROGRESS: { label: "IN PROGRESS", cls: "bg-blue-600/80 text-blue-50" },
  DONE: { label: "DONE", cls: "bg-emerald-600/80 text-emerald-50" },
  BLOCKED: { label: "BLOCKED", cls: "bg-rose-600/80 text-rose-50" },
};

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; cls: string }
> = {
  LOW: { label: "LOW", cls: "bg-slate-700 text-slate-200" },
  MEDIUM: { label: "MEDIUM", cls: "bg-sky-600/80 text-sky-50" },
  HIGH: { label: "HIGH", cls: "bg-amber-600/80 text-amber-50" },
  URGENT: { label: "URGENT", cls: "bg-rose-600/80 text-rose-50" },
};

export const LOG_META: Record<LogType, { label: string; cls: string }> = {
  RESPONSE: { label: "AI 응답", cls: "bg-indigo-600/80 text-indigo-50" },
  ERROR: { label: "에러", cls: "bg-rose-600/80 text-rose-50" },
  NOTE: { label: "메모", cls: "bg-slate-600 text-slate-100" },
};

export const TEMPLATE_CATEGORY_META: Record<
  TemplateCategory,
  { label: string; cls: string }
> = {
  Bugfix: { label: "Bugfix", cls: "bg-rose-600/80 text-rose-50" },
  Feature: { label: "Feature", cls: "bg-indigo-600/80 text-indigo-50" },
  Refactor: { label: "Refactor", cls: "bg-sky-600/80 text-sky-50" },
  Test: { label: "Test", cls: "bg-emerald-600/80 text-emerald-50" },
  Docs: { label: "Docs", cls: "bg-amber-600/80 text-amber-50" },
  Review: { label: "Review", cls: "bg-violet-600/80 text-violet-50" },
  Deploy: { label: "Deploy", cls: "bg-cyan-600/80 text-cyan-50" },
  Other: { label: "Other", cls: "bg-slate-600 text-slate-100" },
};
