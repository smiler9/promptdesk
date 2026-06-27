import { notFound } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProjectHeader from "@/components/ProjectHeader";
import TaskList from "@/components/TaskList";
import DecisionPanel from "@/components/DecisionPanel";
import ProjectTimeline from "@/components/ProjectTimeline";
import GitCommitRecords from "@/components/GitCommitRecords";
import ProjectExport from "@/components/ProjectExport";
import { TASK_STATUSES, type TaskStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

type ProjectSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
type TaskSort = "order" | "updated" | "created";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function stringQueryParams(params: Record<string, string | string[] | undefined>) {
  const query: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(params)) {
    const value = firstParam(rawValue).trim();
    if (value) query[key] = value;
  }
  return query;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: ProjectSearchParams;
}) {
  const { id } = await params;
  const queryParams = await searchParams;
  const taskQuery = firstParam(queryParams.taskQ).trim();
  const statusParam = firstParam(queryParams.taskStatus);
  const taskStatus = TASK_STATUSES.includes(statusParam as TaskStatus)
    ? (statusParam as TaskStatus)
    : "ALL";
  const sortParam = firstParam(queryParams.taskSort);
  const taskSort: TaskSort =
    sortParam === "updated" || sortParam === "created" ? sortParam : "order";
  const showAllTimeline = firstParam(queryParams.timeline) === "all";
  const currentQuery = stringQueryParams(queryParams);

  const taskFilters: Prisma.TaskWhereInput[] = [];
  if (taskQuery) {
    taskFilters.push({
      OR: [
        { title: { contains: taskQuery } },
        { description: { contains: taskQuery } },
      ],
    });
  }
  if (taskStatus !== "ALL") {
    taskFilters.push({ status: taskStatus });
  }

  const [project, timelineTasks] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        decisions: { orderBy: { createdAt: "desc" } },
        gitCommits: {
          orderBy: { createdAt: "desc" },
          include: {
            task: { select: { id: true, title: true } },
            report: { select: { id: true, summary: true } },
          },
        },
        tasks: {
          where: taskFilters.length > 0 ? { AND: taskFilters } : undefined,
          orderBy:
            taskSort === "updated"
              ? { updatedAt: "desc" }
              : taskSort === "created"
                  ? { createdAt: "desc" }
                  : { order: "asc" },
          include: { _count: { select: { prompts: true, logs: true } } },
        },
      },
    }),
    prisma.task.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        projectId: true,
        title: true,
        description: true,
        status: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        prompts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            targetAI: true,
            isGenerated: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            content: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        reports: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            summary: true,
            taskId: true,
            changedFiles: true,
            commandsRun: true,
            buildResult: true,
            testResults: true,
            commitHash: true,
            pushedToRemote: true,
            nextSteps: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        gitCommits: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            projectId: true,
            taskId: true,
            reportId: true,
            commitHash: true,
            commitMessage: true,
            branchName: true,
            remoteUrl: true,
            pushedToRemote: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
  ]);

  if (!project) notFound();
  const timelineReports = timelineTasks.flatMap((task) =>
    task.reports.map((report) => ({
      id: report.id,
      taskId: report.taskId,
      summary: report.summary,
    }))
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
        ← 대시보드
      </Link>

      <div className="mt-3">
        <ProjectHeader
          id={project.id}
          name={project.name}
          description={project.description}
        />
      </div>

      <div className="mt-4">
        <ProjectExport
          project={project}
          tasks={timelineTasks}
          decisions={project.decisions}
          gitCommits={project.gitCommits}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <TaskList
            projectId={project.id}
            tasks={project.tasks}
            query={taskQuery}
            status={taskStatus}
            sort={taskSort}
          />
        </div>
        <div>
          <DecisionPanel
            projectId={project.id}
            decisions={project.decisions}
          />
        </div>
      </div>

      <div className="mt-4">
        <GitCommitRecords
          projectId={project.id}
          records={project.gitCommits}
          tasks={timelineTasks}
          reports={timelineReports}
        />
      </div>

      <div className="mt-4">
        <ProjectTimeline
          projectId={project.id}
          decisions={project.decisions}
          tasks={timelineTasks}
          gitCommits={project.gitCommits}
          showAll={showAllTimeline}
          currentQuery={currentQuery}
        />
      </div>
    </div>
  );
}
