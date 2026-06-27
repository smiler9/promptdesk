import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TaskHeader from "@/components/TaskHeader";
import TaskWorkspace from "@/components/TaskWorkspace";
import TaskChecklist from "@/components/TaskChecklist";
import NextAiPrompt from "@/components/NextAiPrompt";
import LocalLlmAssistant from "@/components/LocalLlmAssistant";
import LocalLlmRuns from "@/components/LocalLlmRuns";
import TaskExecutionReports from "@/components/TaskExecutionReports";
import GitCommitRecords from "@/components/GitCommitRecords";

export const dynamic = "force-dynamic";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, templates] = await Promise.all([
    prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        tags: { orderBy: { name: "asc" } },
        checklistItems: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
        prompts: { orderBy: { createdAt: "desc" } },
        logs: { orderBy: { createdAt: "desc" } },
        reports: { orderBy: { createdAt: "desc" } },
        localLLMRuns: { orderBy: { createdAt: "desc" } },
        gitCommits: {
          orderBy: { createdAt: "desc" },
          include: {
            task: { select: { id: true, title: true } },
            report: { select: { id: true, summary: true } },
          },
        },
      },
    }),
    prisma.promptTemplate.findMany({
      orderBy: [{ isPinned: "desc" }, { category: "asc" }, { title: "asc" }],
    }),
  ]);

  if (!task) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          대시보드
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${task.project.id}`}
          className="hover:text-slate-300"
        >
          {task.project.name}
        </Link>
      </div>

      <div className="mt-3">
        <TaskHeader
          id={task.id}
          title={task.title}
          description={task.description}
          status={task.status}
          priority={task.priority}
          tags={task.tags}
        />
      </div>

      <div className="mt-6">
        <TaskChecklist taskId={task.id} items={task.checklistItems} />
      </div>

      <div className="mt-6">
        <NextAiPrompt
          taskId={task.id}
          projectName={task.project.name}
          title={task.title}
          description={task.description}
          status={task.status}
          priority={task.priority}
          tags={task.tags}
          prompts={task.prompts}
          logs={task.logs}
          reports={task.reports}
          localLLMRuns={task.localLLMRuns}
          checklistItems={task.checklistItems}
          gitCommits={task.gitCommits}
        />
      </div>

      <div className="mt-6">
        <LocalLlmAssistant
          taskId={task.id}
          projectName={task.project.name}
          title={task.title}
          description={task.description}
          status={task.status}
          priority={task.priority}
          tags={task.tags}
          prompts={task.prompts}
          logs={task.logs}
          reports={task.reports}
          checklistItems={task.checklistItems}
          gitCommits={task.gitCommits}
        />
      </div>

      <div className="mt-6">
        <LocalLlmRuns runs={task.localLLMRuns} />
      </div>

      <div className="mt-6">
        <TaskWorkspace
          taskId={task.id}
          prompts={task.prompts}
          logs={task.logs}
          templates={templates}
        />
      </div>

      <div className="mt-6">
        <TaskExecutionReports taskId={task.id} reports={task.reports} />
      </div>

      <div className="mt-6">
        <GitCommitRecords
          projectId={task.project.id}
          records={task.gitCommits}
          reports={task.reports.map((report) => ({
            id: report.id,
            taskId: task.id,
            summary: report.summary,
          }))}
          lockedTaskId={task.id}
        />
      </div>
    </div>
  );
}
