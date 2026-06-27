"use client";

import { resyncProjectLocalMetadata } from "@/lib/localProjectActions";

type ProjectLocalSync = {
  id: string;
  localPath: string | null;
  description: string | null;
};

export default function ProjectLocalSyncInfo({
  project,
}: {
  project: ProjectLocalSync;
}) {
  if (!project.localPath) {
    return (
      <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
        <h2 className="text-sm font-medium text-slate-300">
          Local Project
        </h2>
        <p className="text-xs text-slate-600 mt-2">
          아직 연결된 로컬 프로젝트 경로가 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-slate-300">
            Local Project
          </h2>
          <p className="text-xs text-slate-500 mt-1 break-all">
            {project.localPath}
          </p>
        </div>
        <form action={resyncProjectLocalMetadata}>
          <input type="hidden" name="projectId" value={project.id} />
          <button className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300">
            다시 동기화
          </button>
        </form>
      </div>

      {project.description && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
          {project.description}
        </pre>
      )}
    </section>
  );
}
