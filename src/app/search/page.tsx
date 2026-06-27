import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SearchResult = {
  id: string;
  type: "Project" | "Task" | "Prompt" | "Log" | "Decision" | "Report" | "Commit";
  href: string;
  title: string;
  summary: string;
  projectName?: string;
  taskName?: string;
  createdAt: Date;
  updatedAt: Date;
};

const TYPE_META: Record<SearchResult["type"], { label: string; cls: string }> = {
  Project: { label: "Project", cls: "bg-slate-700 text-slate-200" },
  Task: { label: "Task", cls: "bg-blue-600/80 text-blue-50" },
  Prompt: { label: "Prompt", cls: "bg-indigo-600/80 text-indigo-50" },
  Log: { label: "Log", cls: "bg-sky-600/80 text-sky-50" },
  Decision: { label: "Decision", cls: "bg-amber-600/80 text-amber-50" },
  Report: { label: "Report", cls: "bg-emerald-600/80 text-emerald-50" },
  Commit: { label: "Commit", cls: "bg-violet-600/80 text-violet-50" },
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function excerpt(value: string | null | undefined, length = 180) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function formatDate(value: Date) {
  return value.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function runGlobalSearch(query: string) {
  const [
    projects,
    tasks,
    prompts,
    logs,
    decisions,
    reports,
    gitCommits,
  ] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.prompt.findMany({
      where: {
        OR: [
          { content: { contains: query } },
          { targetAI: { contains: query } },
        ],
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.logEntry.findMany({
      where: {
        OR: [{ content: { contains: query } }, { type: { contains: query } }],
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.decision.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.taskExecutionReport.findMany({
      where: {
        OR: [
          { summary: { contains: query } },
          { changedFiles: { contains: query } },
          { commandsRun: { contains: query } },
          { testResults: { contains: query } },
          { buildResult: { contains: query } },
          { commitHash: { contains: query } },
          { nextSteps: { contains: query } },
        ],
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.gitCommitRecord.findMany({
      where: {
        OR: [
          { commitHash: { contains: query } },
          { commitMessage: { contains: query } },
          { branchName: { contains: query } },
          { remoteUrl: { contains: query } },
        ],
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const results: SearchResult[] = [
    ...projects.map((project) => ({
      id: project.id,
      type: "Project" as const,
      href: `/projects/${project.id}`,
      title: project.name,
      summary: excerpt(project.description) || "프로젝트",
      projectName: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })),
    ...tasks.map((task) => ({
      id: task.id,
      type: "Task" as const,
      href: `/tasks/${task.id}`,
      title: task.title,
      summary: excerpt(task.description) || `상태: ${task.status}`,
      projectName: task.project.name,
      taskName: task.title,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })),
    ...prompts.map((prompt) => ({
      id: prompt.id,
      type: "Prompt" as const,
      href: `/tasks/${prompt.task.id}`,
      title: `${prompt.targetAI} 프롬프트`,
      summary: excerpt(prompt.content),
      projectName: prompt.task.project.name,
      taskName: prompt.task.title,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    })),
    ...logs.map((log) => ({
      id: log.id,
      type: "Log" as const,
      href: `/tasks/${log.task.id}`,
      title: `${log.type} 로그`,
      summary: excerpt(log.content),
      projectName: log.task.project.name,
      taskName: log.task.title,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    })),
    ...decisions.map((decision) => ({
      id: decision.id,
      type: "Decision" as const,
      href: `/projects/${decision.project.id}`,
      title: decision.title,
      summary: excerpt(decision.content) || "결정 사항",
      projectName: decision.project.name,
      createdAt: decision.createdAt,
      updatedAt: decision.updatedAt,
    })),
    ...reports.map((report) => ({
      id: report.id,
      type: "Report" as const,
      href: `/tasks/${report.task.id}`,
      title: "실행 리포트",
      summary: excerpt(
        [
          report.summary,
          report.changedFiles,
          report.commandsRun,
          report.testResults,
          report.buildResult,
          report.commitHash,
          report.nextSteps,
        ]
          .filter(Boolean)
          .join("\n")
      ),
      projectName: report.task.project.name,
      taskName: report.task.title,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
    ...gitCommits.map((commit) => ({
      id: commit.id,
      type: "Commit" as const,
      href: commit.taskId ? `/tasks/${commit.taskId}` : `/projects/${commit.projectId}`,
      title: commit.commitMessage,
      summary: excerpt(
        `${commit.commitHash.slice(0, 10)} · ${commit.branchName}${
          commit.remoteUrl ? ` · ${commit.remoteUrl}` : ""
        }`
      ),
      projectName: commit.project.name,
      taskName: commit.task?.title,
      createdAt: commit.createdAt,
      updatedAt: commit.updatedAt,
    })),
  ];

  return results.sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = firstParam(params.q).trim();
  const results = query ? await runGlobalSearch(query) : [];
  const hasQuery = query.length > 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">전체 검색</h1>
          <p className="text-sm text-slate-500 mt-1">
            프로젝트, 작업, 프롬프트, 로그, 결정사항, 실행 리포트, Git 커밋 기록 검색
          </p>
        </div>
        <Link
          href="/"
          className="px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800 text-sm text-slate-300"
        >
          대시보드
        </Link>
      </div>

      <form
        action="/search"
        className="mb-6 rounded-lg border border-slate-800 bg-[#0d1320] p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="검색어를 입력하세요..."
            className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
          />
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
              검색
            </button>
            {hasQuery && (
              <Link
                href="/search"
                className="px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800 text-sm text-slate-300"
              >
                초기화
              </Link>
            )}
          </div>
        </div>
      </form>

      {!hasQuery ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center">
          <div className="text-sm font-medium text-slate-300">
            검색어를 입력하면 전체 개발 기록에서 관련 항목을 찾습니다.
          </div>
          <p className="text-sm text-slate-500 mt-2">
            현재 스키마에 저장된 프로젝트 설명, 작업 설명, 프롬프트, 로그, 결정사항, 리포트, 커밋 기록을 함께 검색합니다.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center text-slate-500">
          &quot;{query}&quot;에 대한 검색 결과가 없습니다.
        </div>
      ) : (
        <div>
          <div className="text-sm text-slate-400 mb-3">
            검색 결과 {results.length}개
          </div>
          <div className="space-y-3">
            {results.map((result) => {
              const meta = TYPE_META[result.type];
              return (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="block rounded-lg border border-slate-800 bg-[#0d1320] p-4 hover:border-indigo-600/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        <h2 className="text-sm font-medium truncate">
                          {result.title}
                        </h2>
                      </div>
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                        {result.summary || "요약 없음"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-slate-600">
                      <div>수정 {formatDate(result.updatedAt)}</div>
                      <div>생성 {formatDate(result.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-slate-500">
                    {result.projectName && (
                      <span className="rounded bg-slate-900 px-2 py-1">
                        프로젝트: {result.projectName}
                      </span>
                    )}
                    {result.taskName && (
                      <span className="rounded bg-slate-900 px-2 py-1">
                        Task: {result.taskName}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
