import Link from "next/link";
import CopyButton from "./CopyButton";
import {
  PRIORITY_META,
  TASK_PRIORITIES,
  STATUS_META,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";

type SummaryPrompt = {
  id: string;
};

type SummaryLog = {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
};

type SummaryReport = {
  id: string;
  summary: string;
  pushedToRemote: boolean;
  createdAt: Date;
};

type SummaryChecklistItem = {
  id: string;
  isDone: boolean;
};

type SummaryTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  prompts: SummaryPrompt[];
  logs: SummaryLog[];
  reports: SummaryReport[];
  checklistItems: SummaryChecklistItem[];
};

type SummaryGitCommit = {
  id: string;
  taskId: string | null;
  commitHash: string;
  commitMessage: string;
  branchName: string;
  pushedToRemote: boolean;
  createdAt: Date;
  task?: { id: string; title: string } | null;
};

type RecentLog = SummaryLog & {
  taskId: string;
  taskTitle: string;
};

type RecentReport = SummaryReport & {
  taskId: string;
  taskTitle: string;
};

function formatDate(value: Date) {
  return value.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function excerpt(value: string | null | undefined, length = 80) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "요약 없음";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function shortHash(hash: string) {
  return hash.length > 10 ? hash.slice(0, 10) : hash;
}

function markdownLine(label: string, value: string | number) {
  return `- ${label}: ${value}`;
}

function buildMarkdown({
  projectName,
  totalTasks,
  statusCounts,
  completionRate,
  promptCount,
  logCount,
  errorLogCount,
  decisionCount,
  reportCount,
  commitCount,
  pinnedTaskCount,
  priorityCounts,
  checklistTotal,
  checklistDone,
  checklistOpen,
  recentTask,
  recentLog,
  recentReport,
  recentCommit,
  blockedCount,
  unpushedReportCount,
  urgentTaskCount,
}: {
  projectName: string;
  totalTasks: number;
  statusCounts: Record<TaskStatus, number>;
  completionRate: number;
  promptCount: number;
  logCount: number;
  errorLogCount: number;
  decisionCount: number;
  reportCount: number;
  commitCount: number;
  pinnedTaskCount: number;
  priorityCounts: Record<TaskPriority, number>;
  checklistTotal: number;
  checklistDone: number;
  checklistOpen: number;
  recentTask?: SummaryTask;
  recentLog?: RecentLog;
  recentReport?: RecentReport;
  recentCommit?: SummaryGitCommit;
  blockedCount: number;
  unpushedReportCount: number;
  urgentTaskCount: number;
}) {
  const lines: string[] = [];
  lines.push(`# 프로젝트 상태 요약: ${projectName}`);
  lines.push("");
  lines.push("## 집계");
  lines.push(markdownLine("전체 Task", totalTasks));
  for (const status of TASK_STATUSES) {
    lines.push(markdownLine(status, statusCounts[status]));
  }
  lines.push(markdownLine("완료율", `${completionRate}%`));
  lines.push(markdownLine("프롬프트", promptCount));
  lines.push(markdownLine("로그", logCount));
  lines.push(markdownLine("에러 로그", errorLogCount));
  lines.push(markdownLine("결정사항", decisionCount));
  lines.push(markdownLine("실행 리포트", reportCount));
  lines.push(markdownLine("Git 커밋 기록", commitCount));
  lines.push(markdownLine("고정 Task", pinnedTaskCount));
  lines.push(markdownLine("체크리스트 전체", checklistTotal));
  lines.push(markdownLine("체크리스트 완료", checklistDone));
  lines.push(markdownLine("체크리스트 미완료", checklistOpen));
  for (const priority of TASK_PRIORITIES) {
    lines.push(markdownLine(priority, priorityCounts[priority]));
  }
  lines.push("");
  lines.push("## 최근 활동");
  lines.push(
    markdownLine(
      "최근 Task",
      recentTask
        ? `${recentTask.title} (${recentTask.status}, ${formatDate(
            recentTask.updatedAt
          )})`
        : "없음"
    )
  );
  lines.push(
    markdownLine(
      "최근 Log",
      recentLog
        ? `${recentLog.taskTitle} / ${recentLog.type}: ${excerpt(
            recentLog.content
          )} (${formatDate(recentLog.createdAt)})`
        : "없음"
    )
  );
  lines.push(
    markdownLine(
      "최근 실행 리포트",
      recentReport
        ? `${recentReport.taskTitle}: ${excerpt(recentReport.summary)} (${formatDate(
            recentReport.createdAt
          )})`
        : "없음"
    )
  );
  lines.push(
    markdownLine(
      "최근 Git 커밋",
      recentCommit
        ? `${shortHash(recentCommit.commitHash)} ${recentCommit.commitMessage} (${formatDate(
            recentCommit.createdAt
          )})`
        : "없음"
    )
  );
  lines.push("");
  lines.push("## 위험 신호");
  if (
    blockedCount === 0 &&
    errorLogCount === 0 &&
    unpushedReportCount === 0 &&
    urgentTaskCount === 0
  ) {
    lines.push("- 위험 신호 없음");
  } else {
    if (blockedCount > 0) lines.push(markdownLine("BLOCKED Task", blockedCount));
    if (urgentTaskCount > 0) lines.push(markdownLine("URGENT Task", urgentTaskCount));
    if (errorLogCount > 0) lines.push(markdownLine("ERROR 로그", errorLogCount));
    if (unpushedReportCount > 0) {
      lines.push(markdownLine("원격 push 미완료 리포트", unpushedReportCount));
    }
  }
  return lines.join("\n");
}

export default function ProjectStatusSummary({
  projectName,
  tasks,
  decisionCount,
  gitCommits,
}: {
  projectName: string;
  tasks: SummaryTask[];
  decisionCount: number;
  gitCommits: SummaryGitCommit[];
}) {
  const statusCounts = TASK_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<TaskStatus, number>
  );
  const priorityCounts = TASK_PRIORITIES.reduce(
    (acc, priority) => ({ ...acc, [priority]: 0 }),
    {} as Record<TaskPriority, number>
  );

  for (const task of tasks) {
    if (TASK_STATUSES.includes(task.status as TaskStatus)) {
      statusCounts[task.status as TaskStatus] += 1;
    }
    if (TASK_PRIORITIES.includes(task.priority as TaskPriority)) {
      priorityCounts[task.priority as TaskPriority] += 1;
    }
  }

  const totalTasks = tasks.length;
  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round((statusCounts.DONE / totalTasks) * 100);
  const promptCount = tasks.reduce((sum, task) => sum + task.prompts.length, 0);
  const logs = tasks.flatMap((task) =>
    task.logs.map((log) => ({
      ...log,
      taskId: task.id,
      taskTitle: task.title,
    }))
  );
  const reports = tasks.flatMap((task) =>
    task.reports.map((report) => ({
      ...report,
      taskId: task.id,
      taskTitle: task.title,
    }))
  );
  const logCount = logs.length;
  const errorLogCount = logs.filter((log) => log.type === "ERROR").length;
  const reportCount = reports.length;
  const commitCount = gitCommits.length;
  const pinnedTaskCount = tasks.filter((task) => task.isPinned).length;
  const checklistItems = tasks.flatMap((task) => task.checklistItems);
  const checklistTotal = checklistItems.length;
  const checklistDone = checklistItems.filter((item) => item.isDone).length;
  const checklistOpen = checklistTotal - checklistDone;
  const highUrgentTaskCount = priorityCounts.HIGH + priorityCounts.URGENT;
  const unpushedReportCount = reports.filter(
    (report) => !report.pushedToRemote
  ).length;

  const recentTask = [...tasks].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  )[0];
  const recentLog = [...logs].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];
  const recentReport = [...reports].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];
  const recentCommit = [...gitCommits].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];

  const markdown = buildMarkdown({
    projectName,
    totalTasks,
    statusCounts,
    completionRate,
    promptCount,
    logCount,
    errorLogCount,
    decisionCount,
    reportCount,
    commitCount,
    pinnedTaskCount,
    priorityCounts,
    checklistTotal,
    checklistDone,
    checklistOpen,
    recentTask,
    recentLog,
    recentReport,
    recentCommit,
    blockedCount: statusCounts.BLOCKED,
    unpushedReportCount,
    urgentTaskCount: priorityCounts.URGENT,
  });

  const summaryStats = [
    { label: "전체 Task", value: totalTasks },
    { label: "완료율", value: `${completionRate}%` },
    { label: "프롬프트", value: promptCount },
    { label: "로그", value: logCount },
    { label: "에러 로그", value: errorLogCount },
    { label: "결정사항", value: decisionCount },
    { label: "실행 리포트", value: reportCount },
    { label: "Git 커밋", value: commitCount },
    { label: "고정 Task", value: pinnedTaskCount },
    { label: "HIGH/URGENT", value: highUrgentTaskCount },
    { label: "체크리스트 전체", value: checklistTotal },
    { label: "체크리스트 완료", value: checklistDone },
    { label: "체크리스트 미완료", value: checklistOpen },
  ];
  const risks = [
    statusCounts.BLOCKED > 0
      ? `BLOCKED Task ${statusCounts.BLOCKED}개`
      : null,
    priorityCounts.URGENT > 0 ? `URGENT Task ${priorityCounts.URGENT}개` : null,
    errorLogCount > 0 ? `ERROR 로그 ${errorLogCount}개` : null,
    unpushedReportCount > 0
      ? `원격 push 미완료 리포트 ${unpushedReportCount}개`
      : null,
  ].filter((risk): risk is string => Boolean(risk));

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            프로젝트 상태 요약
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            현재 프로젝트의 작업, 기록, 위험 신호 요약
          </p>
        </div>
        <CopyButton text={markdown} label="Markdown 복사" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2"
          >
            <div className="text-lg font-semibold">{stat.value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {TASK_STATUSES.map((status) => (
          <div
            key={status}
            className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2"
          >
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                STATUS_META[status].cls
              }`}
            >
              {STATUS_META[status].label}
            </span>
            <div className="text-lg font-semibold mt-2">
              {statusCounts[status]}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {TASK_PRIORITIES.map((priority) => (
          <div
            key={priority}
            className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2"
          >
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                PRIORITY_META[priority].cls
              }`}
            >
              {PRIORITY_META[priority].label}
            </span>
            <div className="text-lg font-semibold mt-2">
              {priorityCounts[priority]}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
          <h3 className="text-xs font-medium text-slate-400 mb-2">
            최근 활동 요약
          </h3>
          <div className="space-y-2 text-xs">
            <RecentTaskLine task={recentTask} />
            <RecentLogLine log={recentLog} />
            <RecentReportLine report={recentReport} />
            <RecentCommitLine commit={recentCommit} />
          </div>
        </div>

        <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
          <h3 className="text-xs font-medium text-slate-400 mb-2">
            위험 신호
          </h3>
          {risks.length === 0 ? (
            <p className="text-xs text-emerald-300">현재 위험 신호 없음</p>
          ) : (
            <div className="space-y-2">
              {risks.map((risk) => (
                <div
                  key={risk}
                  className="rounded-md border border-amber-700/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-100"
                >
                  {risk}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RecentTaskLine({ task }: { task?: SummaryTask }) {
  if (!task) {
    return <div className="text-slate-600">최근 Task 없음</div>;
  }
  return (
    <Link href={`/tasks/${task.id}`} className="block hover:text-indigo-300">
      <span className="text-slate-500">최근 Task</span>
      <div className="truncate">
        {task.title} · {task.status} · {formatDate(task.updatedAt)}
      </div>
    </Link>
  );
}

function RecentLogLine({ log }: { log?: RecentLog }) {
  if (!log) {
    return <div className="text-slate-600">최근 Log 없음</div>;
  }
  return (
    <Link href={`/tasks/${log.taskId}`} className="block hover:text-indigo-300">
      <span className="text-slate-500">최근 Log</span>
      <div className="truncate">
        {log.taskTitle} · {log.type} · {excerpt(log.content, 56)}
      </div>
    </Link>
  );
}

function RecentReportLine({ report }: { report?: RecentReport }) {
  if (!report) {
    return <div className="text-slate-600">최근 실행 리포트 없음</div>;
  }
  return (
    <Link
      href={`/tasks/${report.taskId}`}
      className="block hover:text-indigo-300"
    >
      <span className="text-slate-500">최근 실행 리포트</span>
      <div className="truncate">
        {report.taskTitle} · {excerpt(report.summary, 56)}
      </div>
    </Link>
  );
}

function RecentCommitLine({ commit }: { commit?: SummaryGitCommit }) {
  if (!commit) {
    return <div className="text-slate-600">최근 Git 커밋 없음</div>;
  }
  const href = commit.taskId ? `/tasks/${commit.taskId}` : "#";
  return (
    <Link href={href} className="block hover:text-indigo-300">
      <span className="text-slate-500">최근 Git 커밋</span>
      <div className="truncate">
        {shortHash(commit.commitHash)} · {commit.commitMessage} ·{" "}
        {commit.branchName}
      </div>
    </Link>
  );
}
