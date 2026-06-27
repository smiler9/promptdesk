"use client";

import { useState } from "react";
import {
  createProjectFromLocalSync,
  loadLocalProjectCandidates,
  searchLocalProjectCandidates,
  updateProjectFromLocalSync,
} from "@/lib/localProjectActions";

type Candidate = {
  name: string;
  localPath: string;
  stack: string | null;
  hasReadme: boolean;
  hasPackageJson: boolean;
  hasGit: boolean;
  signals: string[];
  source: "projects" | "search";
  matchedFiles?: { path: string; name: string; score: number | null }[];
  registeredProjectId: string | null;
  registeredProjectName: string | null;
};

type ExistingProject = {
  id: string;
  name: string;
  localPath: string | null;
};

function CandidateFields({ candidate }: { candidate: Candidate }) {
  return (
    <>
      <input type="hidden" name="name" value={candidate.name} />
      <input type="hidden" name="localPath" value={candidate.localPath} />
      <input type="hidden" name="stack" value={candidate.stack ?? ""} />
      <input
        type="hidden"
        name="hasReadme"
        value={candidate.hasReadme ? "true" : "false"}
      />
      <input
        type="hidden"
        name="hasPackageJson"
        value={candidate.hasPackageJson ? "true" : "false"}
      />
      <input
        type="hidden"
        name="hasGit"
        value={candidate.hasGit ? "true" : "false"}
      />
      <input
        type="hidden"
        name="signals"
        value={JSON.stringify(candidate.signals)}
      />
      <input type="hidden" name="source" value={candidate.source} />
    </>
  );
}

export default function LocalProjectSync({
  projects,
}: {
  projects: ExistingProject[];
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"list" | "search" | null>(null);
  const [mode, setMode] = useState<"idle" | "list" | "search">("idle");

  async function loadProjects() {
    setLoading("list");
    setError(null);
    const result = await loadLocalProjectCandidates();
    setCandidates(result.candidates);
    setError(result.error ?? null);
    setMode("list");
    setLoading(null);
  }

  return (
    <section className="mb-6 rounded-lg border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Local Project Sync
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ai-file-search JSON CLI로 로컬 개발 프로젝트를 찾아 Project에 연결합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={loadProjects}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-800 disabled:opacity-60 text-slate-300"
        >
          {loading === "list" ? "불러오는 중..." : "로컬 프로젝트 목록 불러오기"}
        </button>
      </div>

      <form
        action={async (formData) => {
          setLoading("search");
          setError(null);
          const result = await searchLocalProjectCandidates(formData);
          setCandidates(result.candidates);
          setError(result.error ?? null);
          setMode("search");
          setLoading(null);
        }}
        className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2"
      >
        <input
          name="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ai-file-search 검색어: promptdesk, README, prisma..."
          className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <button
          disabled={loading !== null}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium"
        >
          {loading === "search" ? "검색 중..." : "검색 실행"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-md border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          {error}
        </div>
      )}

      {mode !== "idle" && !error && candidates.length === 0 && (
        <div className="mt-3 rounded-md border border-dashed border-slate-700 px-3 py-4 text-sm text-slate-500">
          표시할 로컬 프로젝트 후보가 없습니다.
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mt-4 space-y-3">
          {candidates.map((candidate) => {
            const registered = Boolean(candidate.registeredProjectId);
            return (
              <div
                key={candidate.localPath}
                className="rounded-lg border border-slate-800 bg-slate-900/30 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium truncate">
                        {candidate.name}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">
                        {candidate.source === "search"
                          ? "search --json"
                          : "projects --json"}
                      </span>
                      {registered && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/80 text-emerald-50">
                          등록됨: {candidate.registeredProjectName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 break-all">
                      {candidate.localPath}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs text-slate-400">
                  <div>Stack: {candidate.stack || "감지 안 됨"}</div>
                  <div>
                    Signals:{" "}
                    {candidate.signals.length > 0
                      ? candidate.signals.join(", ")
                      : "없음"}
                  </div>
                  <div>README: {candidate.hasReadme ? "있음" : "없음"}</div>
                  <div>
                    package.json: {candidate.hasPackageJson ? "있음" : "없음"}
                  </div>
                  <div>Git: {candidate.hasGit ? "있음" : "없음"}</div>
                  {candidate.matchedFiles &&
                    candidate.matchedFiles.length > 0 && (
                      <div className="md:col-span-2">
                        Matched files:{" "}
                        {candidate.matchedFiles
                          .map((file) => file.name)
                          .join(", ")}
                      </div>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!registered && (
                    <form action={createProjectFromLocalSync}>
                      <CandidateFields candidate={candidate} />
                      <button className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white">
                        새 Project로 등록
                      </button>
                    </form>
                  )}

                  <form action={updateProjectFromLocalSync} className="flex gap-2">
                    <CandidateFields candidate={candidate} />
                    {registered ? (
                      <input
                        type="hidden"
                        name="projectId"
                        value={candidate.registeredProjectId ?? ""}
                      />
                    ) : (
                      <select
                        name="projectId"
                        required
                        defaultValue=""
                        className="text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
                      >
                        <option value="" disabled>
                          업데이트할 Project
                        </option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300">
                      기존 Project 업데이트
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
