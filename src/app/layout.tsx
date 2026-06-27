import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "PromptDesk",
  description: "AI 코딩 프로젝트 매니저",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = await prisma.project.findMany({
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    select: { id: true, name: true, isPinned: true },
    take: 30,
  });

  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen">
          {/* 좌측 사이드바 */}
          <aside className="w-60 shrink-0 border-r border-slate-800 bg-[#0d1320] flex flex-col">
            <div className="px-4 py-4 border-b border-slate-800">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-indigo-400 text-lg">▚</span>
                <span className="font-semibold tracking-tight">PromptDesk</span>
              </Link>
              <p className="text-[11px] text-slate-500 mt-1">
                AI 코딩 프로젝트 매니저
              </p>
            </div>

            <nav className="px-2 py-3 space-y-1">
              <Link
                href="/"
                className="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/60"
              >
                ▤ 대시보드
              </Link>
              <Link
                href="/search"
                className="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/60"
              >
                ⌕ 전체 검색
              </Link>
              <Link
                href="/templates"
                className="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800/60"
              >
                ▣ 템플릿
              </Link>
            </nav>

            <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-slate-500">
              프로젝트
            </div>
            <div className="px-2 flex-1 overflow-y-auto space-y-0.5">
              {projects.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-600">
                  아직 프로젝트가 없습니다
                </p>
              )}
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-800/60"
                >
                  <span className="truncate">{p.name}</span>
                  {p.isPinned && (
                    <span className="shrink-0 text-[10px] text-amber-300">
                      Pin
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="p-2 border-t border-slate-800">
              <Link
                href="/?new=1"
                className="block text-center px-3 py-2 rounded-md text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                + 새 프로젝트
              </Link>
            </div>
          </aside>

          <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
