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

export const LOG_TYPES = ["RESPONSE", "ERROR", "NOTE"] as const;
export type LogType = (typeof LOG_TYPES)[number];

export const STATUS_META: Record<
  TaskStatus,
  { label: string; cls: string }
> = {
  TODO: { label: "TODO", cls: "bg-slate-700 text-slate-200" },
  IN_PROGRESS: { label: "IN PROGRESS", cls: "bg-blue-600/80 text-blue-50" },
  DONE: { label: "DONE", cls: "bg-emerald-600/80 text-emerald-50" },
  BLOCKED: { label: "BLOCKED", cls: "bg-rose-600/80 text-rose-50" },
};

export const LOG_META: Record<LogType, { label: string; cls: string }> = {
  RESPONSE: { label: "AI 응답", cls: "bg-indigo-600/80 text-indigo-50" },
  ERROR: { label: "에러", cls: "bg-rose-600/80 text-rose-50" },
  NOTE: { label: "메모", cls: "bg-slate-600 text-slate-100" },
};
