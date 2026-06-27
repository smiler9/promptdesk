"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resyncProjectLocalMetadata } from "@/lib/localProjectActions";

type ProjectLocalSync = {
  id: string;
  name: string;
  localPath: string | null;
  lastSyncedAt: Date | string | null;
  description: string | null;
};

function formatDate(value: Date | string | null) {
  if (!value) return "아직 동기화 기록 없음";
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function descriptionLine(description: string | null, label: string) {
  const prefix = `${label}:`;
  const line = description
    ?.split("\n")
    .find((item) => item.trim().startsWith(prefix));
  return line?.slice(prefix.length).trim() || "";
}

function signalBadges(project: ProjectLocalSync) {
  const rawSignals = descriptionLine(project.description, "Signals");
  const signals =
    rawSignals && rawSignals !== "none"
      ? rawSignals.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  const readme = descriptionLine(project.description, "README");
  const packageJson = descriptionLine(project.description, "package.json");
  const git = descriptionLine(project.description, "Git");
  if (readme === "yes") signals.push("README");
  if (packageJson === "yes") signals.push("package.json");
  if (git === "yes") signals.push(".git");
  return [...new Set(signals)];
}

export default function ProjectLocalSyncInfo({
  project,
}: {
  project: ProjectLocalSync;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const detectedName = descriptionLine(project.description, "Name") || project.name;
  const stack = descriptionLine(project.description, "Stack") || "감지 안 됨";
  const signals = signalBadges(project);

  if (!project.localPath) {
    return (
      <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
        <h2 className="text-sm font-medium text-slate-300">
          Local Project
        </h2>
        <p className="text-xs text-slate-600 mt-2">
          아직 연결된 로컬 프로젝트 경로가 없습니다.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          진행률은 PromptDesk Task 기준으로 계산됩니다. Local Sync는 프로젝트 폴더
          메타데이터를 연결하며, Task는 직접 생성하거나 별도 기능으로 생성해야 합니다.
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
          <p className="text-xs text-slate-500 mt-1">
            로컬 프로젝트 메타데이터 연결 상태
          </p>
        </div>
        <form
          action={async (formData) => {
            setMessage(null);
            setIsError(false);
            const result = await resyncProjectLocalMetadata(formData);
            if (result?.error) {
              setMessage(result.error);
              setIsError(true);
              return;
            }
            setMessage(result?.message ?? "다시 동기화했습니다.");
            router.refresh();
          }}
        >
          <input type="hidden" name="projectId" value={project.id} />
          <button className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300">
            다시 동기화
          </button>
        </form>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
          <div className="text-slate-500 mb-1">localPath</div>
          <div className="break-all text-slate-300">{project.localPath}</div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
          <div className="text-slate-500 mb-1">lastSyncedAt</div>
          <div className="text-slate-300">{formatDate(project.lastSyncedAt)}</div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
          <div className="text-slate-500 mb-1">감지된 프로젝트명</div>
          <div className="text-slate-300">{detectedName}</div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2">
          <div className="text-slate-500 mb-1">감지된 스택</div>
          <div className="text-slate-300">{stack}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] text-slate-500 mb-1">감지된 파일 신호</div>
        {signals.length === 0 ? (
          <span className="text-xs text-slate-600">감지된 파일 신호 없음</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {signals.map((signal) => (
              <span
                key={signal}
                className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200"
              >
                {signal}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-500">
        진행률은 PromptDesk Task 기준으로 계산됩니다. Local Sync는 프로젝트 폴더
        메타데이터를 연결하며, Task는 직접 생성하거나 별도 기능으로 생성해야 합니다.
      </div>

      {message && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-xs ${
            isError
              ? "border-rose-800/60 bg-rose-950/30 text-rose-100"
              : "border-emerald-800/60 bg-emerald-950/30 text-emerald-100"
          }`}
        >
          {message}
        </div>
      )}
    </section>
  );
}
