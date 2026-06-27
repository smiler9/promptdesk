"use client";

import { LOG_META, STATUS_META, type LogType, type TaskStatus } from "@/lib/constants";

type Timestamp = Date | string;

type ExportProject = {
  id: string;
  name: string;
  description: string | null;
  isPinned?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type ExportDecision = {
  id: string;
  title: string;
  content: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type ExportPrompt = {
  id: string;
  content: string;
  targetAI: string;
  isGenerated: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type ExportLog = {
  id: string;
  type: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type ExportReport = {
  id: string;
  taskId: string;
  summary: string;
  changedFiles: string | null;
  commandsRun: string | null;
  testResults: string | null;
  buildResult: string | null;
  commitHash: string | null;
  pushedToRemote: boolean;
  nextSteps: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type ExportGitCommit = {
  id: string;
  projectId: string;
  taskId: string | null;
  reportId: string | null;
  commitHash: string;
  commitMessage: string;
  branchName: string;
  remoteUrl: string | null;
  pushedToRemote: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  task?: { id: string; title: string } | null;
  report?: { id: string; summary: string } | null;
};

type ExportTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  isPinned?: boolean;
  status: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  prompts: ExportPrompt[];
  logs: ExportLog[];
  reports: ExportReport[];
  gitCommits: ExportGitCommit[];
};

type TimelineEntry = {
  type: string;
  title: string;
  summary: string;
  taskTitle?: string;
  createdAt: string;
};

function toDate(value: Timestamp) {
  return value instanceof Date ? value : new Date(value);
}

function toIso(value: Timestamp) {
  return toDate(value).toISOString();
}

function formatDate(value: Timestamp) {
  return toDate(value).toLocaleString("ko-KR");
}

function excerpt(value: string | null | undefined, length = 180) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "project"
  );
}

function dateStamp() {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function codeBlock(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) return "_없음_";
  return `\`\`\`text\n${text.replace(/```/g, "'''")}\n\`\`\``;
}

function buildTimeline({
  decisions,
  tasks,
  gitCommits,
}: {
  decisions: ExportDecision[];
  tasks: ExportTask[];
  gitCommits: ExportGitCommit[];
}) {
  const entries: TimelineEntry[] = [];

  for (const task of tasks) {
    const status = STATUS_META[task.status as TaskStatus];
    entries.push({
      type: "Task",
      title: task.title,
      summary: `작업 생성. 상태: ${status?.label ?? task.status}`,
      taskTitle: task.title,
      createdAt: toIso(task.createdAt),
    });

    if (toDate(task.updatedAt).getTime() !== toDate(task.createdAt).getTime()) {
      entries.push({
        type: "Task",
        title: task.title,
        summary: `작업 수정. 상태: ${status?.label ?? task.status}`,
        taskTitle: task.title,
        createdAt: toIso(task.updatedAt),
      });
    }

    for (const prompt of task.prompts) {
      entries.push({
        type: "Prompt",
        title: `${prompt.targetAI} 프롬프트`,
        summary: excerpt(prompt.content),
        taskTitle: task.title,
        createdAt: toIso(prompt.createdAt),
      });
    }

    for (const log of task.logs) {
      const meta = LOG_META[log.type as LogType] ?? LOG_META.NOTE;
      entries.push({
        type: meta.label,
        title: `${meta.label} 기록`,
        summary: excerpt(log.content),
        taskTitle: task.title,
        createdAt: toIso(log.createdAt),
      });
    }

    for (const report of task.reports) {
      entries.push({
        type: "Execution Report",
        title: "실행 리포트",
        summary: excerpt(report.summary),
        taskTitle: task.title,
        createdAt: toIso(report.createdAt),
      });
    }
  }

  for (const decision of decisions) {
    entries.push({
      type: "Decision",
      title: decision.title,
      summary: excerpt(decision.content) || "결정 사항 생성",
      createdAt: toIso(decision.createdAt),
    });
  }

  for (const commit of gitCommits) {
    entries.push({
      type: "Git Commit",
      title: commit.commitMessage,
      summary: `${commit.commitHash.slice(0, 10)} · ${commit.branchName} · ${
        commit.pushedToRemote ? "pushed" : "local"
      }`,
      taskTitle: commit.task?.title,
      createdAt: toIso(commit.createdAt),
    });
  }

  return entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function buildJsonExport({
  project,
  decisions,
  tasks,
  gitCommits,
}: {
  project: ExportProject;
  decisions: ExportDecision[];
  tasks: ExportTask[];
  gitCommits: ExportGitCommit[];
}) {
  return {
    exportedAt: new Date().toISOString(),
    project: {
      ...project,
      createdAt: toIso(project.createdAt),
      updatedAt: toIso(project.updatedAt),
    },
    decisions: decisions.map((decision) => ({
      ...decision,
      createdAt: toIso(decision.createdAt),
      updatedAt: toIso(decision.updatedAt),
    })),
    tasks: tasks.map((task) => ({
      ...task,
      createdAt: toIso(task.createdAt),
      updatedAt: toIso(task.updatedAt),
      prompts: task.prompts.map((prompt) => ({
        ...prompt,
        createdAt: toIso(prompt.createdAt),
        updatedAt: toIso(prompt.updatedAt),
      })),
      logs: task.logs.map((log) => ({
        ...log,
        createdAt: toIso(log.createdAt),
        updatedAt: toIso(log.updatedAt),
      })),
      reports: task.reports.map((report) => ({
        ...report,
        createdAt: toIso(report.createdAt),
        updatedAt: toIso(report.updatedAt),
      })),
      gitCommits: task.gitCommits.map((commit) => ({
        ...commit,
        createdAt: toIso(commit.createdAt),
        updatedAt: toIso(commit.updatedAt),
      })),
    })),
    gitCommits: gitCommits.map((commit) => ({
      ...commit,
      createdAt: toIso(commit.createdAt),
      updatedAt: toIso(commit.updatedAt),
    })),
    timeline: buildTimeline({ decisions, tasks, gitCommits }),
  };
}

function buildMarkdownExport({
  project,
  decisions,
  tasks,
  gitCommits,
}: {
  project: ExportProject;
  decisions: ExportDecision[];
  tasks: ExportTask[];
  gitCommits: ExportGitCommit[];
}) {
  const timeline = buildTimeline({ decisions, tasks, gitCommits });
  const lines: string[] = [];

  lines.push(`# ${project.name}`);
  lines.push("");
  lines.push(`- Exported: ${formatDate(new Date())}`);
  lines.push(`- Project ID: ${project.id}`);
  lines.push(`- Created: ${formatDate(project.createdAt)}`);
  lines.push(`- Updated: ${formatDate(project.updatedAt)}`);
  lines.push(`- Pinned: ${project.isPinned ? "yes" : "no"}`);
  lines.push(`- Description: ${project.description || "없음"}`);
  lines.push("");

  lines.push("## Decisions");
  lines.push("");
  if (decisions.length === 0) {
    lines.push("_기록된 결정 사항이 없습니다._");
  } else {
    for (const decision of decisions) {
      lines.push(`### ${decision.title}`);
      lines.push("");
      lines.push(`- Created: ${formatDate(decision.createdAt)}`);
      lines.push("");
      lines.push(decision.content || "_상세 내용 없음_");
      lines.push("");
    }
  }

  lines.push("## Tasks");
  lines.push("");
  if (tasks.length === 0) {
    lines.push("_작업이 없습니다._");
  } else {
    for (const task of tasks) {
      const status = STATUS_META[task.status as TaskStatus];
      lines.push(`### ${task.title}`);
      lines.push("");
      lines.push(`- Status: ${status?.label ?? task.status}`);
      lines.push(`- Created: ${formatDate(task.createdAt)}`);
      lines.push(`- Updated: ${formatDate(task.updatedAt)}`);
      lines.push(`- Pinned: ${task.isPinned ? "yes" : "no"}`);
      lines.push(`- Description: ${task.description || "없음"}`);
      lines.push("");

      lines.push("#### Prompts");
      lines.push("");
      if (task.prompts.length === 0) {
        lines.push("_저장된 프롬프트가 없습니다._");
      } else {
        for (const prompt of task.prompts) {
          lines.push(`- ${formatDate(prompt.createdAt)} · ${prompt.targetAI}`);
          lines.push("");
          lines.push(codeBlock(prompt.content));
          lines.push("");
        }
      }

      lines.push("#### Logs");
      lines.push("");
      if (task.logs.length === 0) {
        lines.push("_저장된 로그가 없습니다._");
      } else {
        for (const log of task.logs) {
          const meta = LOG_META[log.type as LogType] ?? LOG_META.NOTE;
          lines.push(`- ${formatDate(log.createdAt)} · ${meta.label}`);
          lines.push("");
          lines.push(codeBlock(log.content));
          lines.push("");
        }
      }

      lines.push("#### Execution Reports");
      lines.push("");
      if (task.reports.length === 0) {
        lines.push("_저장된 실행 리포트가 없습니다._");
      } else {
        for (const report of task.reports) {
          lines.push(`##### ${formatDate(report.createdAt)}`);
          lines.push("");
          lines.push(`- Summary: ${report.summary}`);
          lines.push(`- Commit Hash: ${report.commitHash || "없음"}`);
          lines.push(
            `- Pushed To Remote: ${report.pushedToRemote ? "yes" : "no"}`
          );
          lines.push("");
          lines.push("Changed Files");
          lines.push(codeBlock(report.changedFiles));
          lines.push("Commands Run");
          lines.push(codeBlock(report.commandsRun));
          lines.push("Test Results");
          lines.push(codeBlock(report.testResults));
          lines.push("Build Result");
          lines.push(codeBlock(report.buildResult));
          lines.push("Next Steps");
          lines.push(codeBlock(report.nextSteps));
          lines.push("");
        }
      }

      lines.push("#### Git Commits");
      lines.push("");
      if (task.gitCommits.length === 0) {
        lines.push("_연결된 Git 커밋이 없습니다._");
      } else {
        for (const commit of task.gitCommits) {
          lines.push(
            `- \`${commit.commitHash.slice(0, 10)}\` ${commit.commitMessage}`
          );
          lines.push(`  - Branch: ${commit.branchName}`);
          lines.push(`  - Remote: ${commit.remoteUrl || "없음"}`);
          lines.push(
            `  - Pushed: ${commit.pushedToRemote ? "yes" : "no"}`
          );
        }
      }
      lines.push("");
    }
  }

  lines.push("## Git Commit Records");
  lines.push("");
  if (gitCommits.length === 0) {
    lines.push("_저장된 Git 커밋 기록이 없습니다._");
  } else {
    for (const commit of gitCommits) {
      lines.push(`- \`${commit.commitHash.slice(0, 10)}\` ${commit.commitMessage}`);
      lines.push(`  - Branch: ${commit.branchName}`);
      lines.push(`  - Task: ${commit.task?.title || "없음"}`);
      lines.push(`  - Remote: ${commit.remoteUrl || "없음"}`);
      lines.push(`  - Pushed: ${commit.pushedToRemote ? "yes" : "no"}`);
    }
  }
  lines.push("");

  lines.push("## Timeline Summary");
  lines.push("");
  if (timeline.length === 0) {
    lines.push("_표시할 활동이 없습니다._");
  } else {
    for (const event of timeline) {
      lines.push(
        `- ${formatDate(event.createdAt)} · ${event.type} · ${event.title}${
          event.taskTitle ? ` (${event.taskTitle})` : ""
        }`
      );
      if (event.summary) lines.push(`  - ${event.summary}`);
    }
  }

  return lines.join("\n");
}

function downloadFile({
  fileName,
  content,
  type,
}: {
  fileName: string;
  content: string;
  type: string;
}) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ProjectExport({
  project,
  decisions,
  tasks,
  gitCommits,
}: {
  project: ExportProject;
  decisions: ExportDecision[];
  tasks: ExportTask[];
  gitCommits: ExportGitCommit[];
}) {
  const baseName = `promptdesk-${safeFileName(project.name)}-${dateStamp()}`;

  function exportMarkdown() {
    downloadFile({
      fileName: `${baseName}.md`,
      content: buildMarkdownExport({ project, decisions, tasks, gitCommits }),
      type: "text/markdown;charset=utf-8",
    });
  }

  function exportJson() {
    downloadFile({
      fileName: `${baseName}.json`,
      content: JSON.stringify(
        buildJsonExport({ project, decisions, tasks, gitCommits }),
        null,
        2
      ),
      type: "application/json;charset=utf-8",
    });
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-medium text-slate-300">Export</h2>
          <p className="text-xs text-slate-500 mt-1">
            프로젝트 개발 기록 전체를 Markdown 또는 JSON으로 저장합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportMarkdown}
            className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Export Markdown
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            Export JSON
          </button>
        </div>
      </div>
    </section>
  );
}
