import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { STATUS_META, type TaskStatus } from "@/lib/constants";
import NewProjectModal from "@/components/NewProjectModal";

export const dynamic = "force-dynamic";

function progress(tasks: { status: string }[]) {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

export default async function Dashboard() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { tasks: { select: { status: true } } },
  });

  const totalTasks = projects.reduce((a, p) => a + p.tasks.length, 0);
  const activeTasks = projects.reduce(
    (a, p) => a + p.tasks.filter((t) => t.status === "IN_PROGRESS").length,
    0
  );
  const blocked = projects.reduce(
    (a, p) => a + p.tasks.filter((t) => t.status === "BLOCKED").length,
    0
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Suspense>
        <NewProjectModal />
      </Suspense>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">대시보드</h1>
          <p className="text-sm text-slate-500 mt-1">
            최근 프로젝트와 진행 상태
          </p>
        </div>
        <Link
          href="/?new=1"
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
        >
          + 새 프로젝트
        </Link>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "프로젝트", value: projects.length },
          { label: "전체 작업", value: totalTasks },
          { label: "진행 중", value: activeTasks },
          { label: "차단됨", value: blocked },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-slate-800 bg-[#0d1320] px-4 py-3"
          >
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 프로젝트 카드 목록 */}
      <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">
        프로젝트
      </h2>
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center text-slate-500">
          아직 프로젝트가 없습니다. 우측 상단에서 새 프로젝트를 만들어보세요.
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const pct = progress(p.tasks);
            const counts = (["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as TaskStatus[]).map(
              (s) => ({
                s,
                n: p.tasks.filter((t) => t.status === s).length,
              })
            );
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-xl border border-slate-800 bg-[#0d1320] p-4 hover:border-indigo-600/60 transition-colors"
              >
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[2rem]">
                  {p.description || "설명 없음"}
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>진행률</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {counts
                    .filter((c) => c.n > 0)
                    .map((c) => (
                      <span
                        key={c.s}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_META[c.s].cls}`}
                      >
                        {STATUS_META[c.s].label} {c.n}
                      </span>
                    ))}
                  {p.tasks.length === 0 && (
                    <span className="text-[10px] text-slate-600">작업 없음</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
