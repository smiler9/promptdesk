import Link from "next/link";
import {
  LOG_META,
  STATUS_META,
  type LogType,
  type TaskStatus,
} from "@/lib/constants";

type TimelineDecision = {
  id: string;
  title: string;
  content: string | null;
  createdAt: Date;
};

type TimelineTask = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  prompts: {
    id: string;
    content: string;
    targetAI: string;
    isGenerated: boolean;
    createdAt: Date;
  }[];
  logs: {
    id: string;
    type: string;
    content: string;
    createdAt: Date;
  }[];
  reports: {
    id: string;
    summary: string;
    buildResult: string | null;
    testResults: string | null;
    commitHash: string | null;
    pushedToRemote: boolean;
    createdAt: Date;
  }[];
};

type TimelineEvent = {
  id: string;
  type: "TASK" | "PROMPT" | "LOG" | "DECISION" | "REPORT" | "COMMIT";
  badge: string;
  badgeClass: string;
  title: string;
  summary: string;
  date: Date;
  task?: { id: string; title: string };
};

type TimelineGitCommit = {
  id: string;
  taskId: string | null;
  commitHash: string;
  commitMessage: string;
  branchName: string;
  pushedToRemote: boolean;
  createdAt: Date;
  task?: { id: string; title: string } | null;
};

const EVENT_BADGES: Record<
  TimelineEvent["type"],
  { label: string; cls: string }
> = {
  TASK: { label: "Task", cls: "bg-slate-700 text-slate-200" },
  PROMPT: { label: "Prompt", cls: "bg-indigo-600/80 text-indigo-50" },
  LOG: { label: "Log", cls: "bg-sky-600/80 text-sky-50" },
  DECISION: { label: "Decision", cls: "bg-amber-600/80 text-amber-50" },
  REPORT: { label: "Report", cls: "bg-emerald-600/80 text-emerald-50" },
  COMMIT: { label: "Commit", cls: "bg-violet-600/80 text-violet-50" },
};

function excerpt(value: string | null | undefined, length = 180) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function buildTimelineEvents({
  decisions,
  tasks,
  gitCommits,
}: {
  decisions: TimelineDecision[];
  tasks: TimelineTask[];
  gitCommits: TimelineGitCommit[];
}) {
  const events: TimelineEvent[] = [];

  for (const task of tasks) {
    const status = STATUS_META[task.status as TaskStatus];
    events.push({
      id: `task-created-${task.id}`,
      type: "TASK",
      badge: "Task 생성",
      badgeClass: EVENT_BADGES.TASK.cls,
      title: task.title,
      summary: `작업이 생성되었습니다. 현재 상태: ${status?.label ?? task.status}`,
      date: task.createdAt,
      task: { id: task.id, title: task.title },
    });

    if (task.updatedAt.getTime() !== task.createdAt.getTime()) {
      events.push({
        id: `task-updated-${task.id}`,
        type: "TASK",
        badge: "Task 수정",
        badgeClass: EVENT_BADGES.TASK.cls,
        title: task.title,
        summary: `작업이 수정되었습니다. 현재 상태: ${
          status?.label ?? task.status
        }`,
        date: task.updatedAt,
        task: { id: task.id, title: task.title },
      });
    }

    for (const prompt of task.prompts) {
      events.push({
        id: `prompt-${prompt.id}`,
        type: "PROMPT",
        badge: prompt.isGenerated ? "Prompt 생성" : "Prompt",
        badgeClass: EVENT_BADGES.PROMPT.cls,
        title: `${prompt.targetAI} 프롬프트 저장`,
        summary: excerpt(prompt.content),
        date: prompt.createdAt,
        task: { id: task.id, title: task.title },
      });
    }

    for (const log of task.logs) {
      const meta = LOG_META[log.type as LogType] ?? LOG_META.NOTE;
      events.push({
        id: `log-${log.id}`,
        type: "LOG",
        badge: meta.label,
        badgeClass: meta.cls,
        title: `${meta.label} 기록`,
        summary: excerpt(log.content),
        date: log.createdAt,
        task: { id: task.id, title: task.title },
      });
    }

    for (const report of task.reports) {
      const statusText = report.pushedToRemote ? "원격 push 완료" : "로컬 기록";
      const commitText = report.commitHash ? ` · ${report.commitHash}` : "";
      events.push({
        id: `report-${report.id}`,
        type: "REPORT",
        badge: EVENT_BADGES.REPORT.label,
        badgeClass: EVENT_BADGES.REPORT.cls,
        title: `실행 리포트 생성`,
        summary: excerpt(`${report.summary}\n${statusText}${commitText}`),
        date: report.createdAt,
        task: { id: task.id, title: task.title },
      });
    }
  }

  for (const decision of decisions) {
    events.push({
      id: `decision-${decision.id}`,
      type: "DECISION",
      badge: EVENT_BADGES.DECISION.label,
      badgeClass: EVENT_BADGES.DECISION.cls,
      title: decision.title,
      summary: excerpt(decision.content) || "결정 사항이 생성되었습니다.",
      date: decision.createdAt,
    });
  }

  for (const commit of gitCommits) {
    const pushed = commit.pushedToRemote ? "원격 push 완료" : "로컬 기록";
    events.push({
      id: `commit-${commit.id}`,
      type: "COMMIT",
      badge: EVENT_BADGES.COMMIT.label,
      badgeClass: EVENT_BADGES.COMMIT.cls,
      title: commit.commitMessage,
      summary: excerpt(
        `${commit.commitHash.slice(0, 10)} · ${commit.branchName} · ${pushed}`
      ),
      date: commit.createdAt,
      task: commit.task ?? undefined,
    });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default function ProjectTimeline({
  projectId,
  decisions,
  tasks,
  gitCommits,
  showAll,
  currentQuery,
}: {
  projectId: string;
  decisions: TimelineDecision[];
  tasks: TimelineTask[];
  gitCommits: TimelineGitCommit[];
  showAll: boolean;
  currentQuery: Record<string, string>;
}) {
  const events = buildTimelineEvents({ decisions, tasks, gitCommits });
  const visibleEvents = showAll ? events : events.slice(0, 20);
  const hasMore = events.length > visibleEvents.length;
  const nextQuery = new URLSearchParams(currentQuery);
  const resetQuery = new URLSearchParams(currentQuery);
  nextQuery.set("timeline", "all");
  resetQuery.delete("timeline");

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Timeline ({events.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            프로젝트 활동을 최신순으로 모아봅니다.
          </p>
        </div>
        {hasMore && (
          <Link
            href={`/projects/${projectId}?${nextQuery.toString()}`}
            className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            전체 보기
          </Link>
        )}
        {showAll && events.length > 20 && (
          <Link
            href={`/projects/${projectId}${
              resetQuery.toString() ? `?${resetQuery.toString()}` : ""
            }`}
            className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            최근 20개
          </Link>
        )}
      </div>

      {visibleEvents.length === 0 ? (
        <p className="text-xs text-slate-600 py-4 text-center">
          표시할 활동이 없습니다.
        </p>
      ) : (
        <ol className="space-y-2">
          {visibleEvents.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded ${event.badgeClass}`}
                    >
                      {event.badge}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {event.title}
                    </span>
                  </div>
                  {event.task && (
                    <Link
                      href={`/tasks/${event.task.id}`}
                      className="inline-block text-[11px] text-indigo-300 hover:text-indigo-200 mt-1"
                    >
                      {event.task.title}
                    </Link>
                  )}
                  {event.summary && (
                    <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">
                      {event.summary}
                    </p>
                  )}
                </div>
                <time className="text-[11px] text-slate-500 shrink-0">
                  {event.date.toLocaleString("ko-KR")}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
