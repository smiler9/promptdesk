import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  STATUS_META,
  TASK_STATUSES,
  type TaskStatus,
} from "@/lib/constants";
import NewProjectModal from "@/components/NewProjectModal";

export const dynamic = "force-dynamic";

type DashboardSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
type ProjectSort = "updated" | "created";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function progress(tasks: { status: string }[]) {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const params = await searchParams;
  const query = firstParam(params.q).trim();
  const statusParam = firstParam(params.status);
  const projectStatus = TASK_STATUSES.includes(statusParam as TaskStatus)
    ? (statusParam as TaskStatus)
    : "ALL";
  const sortParam = firstParam(params.sort);
  const projectSort: ProjectSort =
    sortParam === "created" ? "created" : "updated";

  const projectFilters: Prisma.ProjectWhereInput[] = [];
  if (query) {
    projectFilters.push({
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
      ],
    });
  }
  if (projectStatus !== "ALL") {
    projectFilters.push({ tasks: { some: { status: projectStatus } } });
  }

  const projects = await prisma.project.findMany({
    where: projectFilters.length > 0 ? { AND: projectFilters } : undefined,
    orderBy:
      projectSort === "created"
        ? { createdAt: "desc" }
        : { updatedAt: "desc" },
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
  const hasFilters =
    query !== "" || projectStatus !== "ALL" || projectSort !== "updated";

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

      <form
        action="/"
        className="mb-6 rounded-lg border border-slate-800 bg-[#0d1320] p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px_auto] gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="프로젝트 이름/설명 검색..."
            className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
          />
          <select
            name="status"
            defaultValue={projectStatus}
            className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
          >
            <option value="ALL">전체 상태</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={projectSort}
            className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
          >
            <option value="updated">최근 수정순</option>
            <option value="created">최근 생성순</option>
          </select>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
              적용
            </button>
            {hasFilters && (
              <Link
                href="/"
                className="px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800 text-sm text-slate-300"
              >
                초기화
              </Link>
            )}
          </div>
        </div>
      </form>

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
        프로젝트 {hasFilters && `(${projects.length})`}
      </h2>
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center text-slate-500">
          {hasFilters
            ? "조건에 맞는 프로젝트가 없습니다."
            : "아직 프로젝트가 없습니다. 우측 상단에서 새 프로젝트를 만들어보세요."}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const pct = progress(p.tasks);
            const counts = (
              ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as TaskStatus[]
            ).map((s) => ({
                s,
                n: p.tasks.filter((t) => t.status === s).length,
              }));
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
                    <span className="text-[10px] text-slate-600">
                      작업 없음
                    </span>
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
