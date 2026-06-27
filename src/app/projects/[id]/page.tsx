import { notFound } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ProjectHeader from "@/components/ProjectHeader";
import TaskList from "@/components/TaskList";
import DecisionPanel from "@/components/DecisionPanel";
import { TASK_STATUSES, type TaskStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

type ProjectSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
type TaskSort = "order" | "updated" | "created";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
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

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      decisions: { orderBy: { createdAt: "desc" } },
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
  });

  if (!project) notFound();

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
    </div>
  );
}
