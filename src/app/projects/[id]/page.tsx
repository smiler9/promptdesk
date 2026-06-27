import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProjectHeader from "@/components/ProjectHeader";
import TaskList from "@/components/TaskList";
import DecisionPanel from "@/components/DecisionPanel";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      decisions: { orderBy: { createdAt: "desc" } },
      tasks: {
        orderBy: { order: "asc" },
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
          <TaskList projectId={project.id} tasks={project.tasks} />
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
