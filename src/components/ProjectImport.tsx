"use client";

import { useState } from "react";
import { importProjectFromJson } from "@/lib/actions";

export default function ProjectImport() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <section className="mb-6 rounded-lg border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Import Project
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            PromptDesk Export JSON 백업 파일을 새 프로젝트로 복원합니다.
          </p>
        </div>
        <form
          action={async (fd) => {
            setSubmitting(true);
            setError("");
            const result = await importProjectFromJson(fd);
            if (result?.error) {
              setError(result.error);
              setSubmitting(false);
            }
          }}
          className="flex items-center gap-2 flex-wrap"
        >
          <input
            type="file"
            name="projectFile"
            accept="application/json,.json"
            required
            className="max-w-64 text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:text-slate-200 hover:file:bg-slate-700"
          />
          <button
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 disabled:opacity-50"
          >
            {submitting ? "가져오는 중..." : "JSON 가져오기"}
          </button>
        </form>
      </div>
      {error && (
        <p className="mt-3 rounded-md border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
    </section>
  );
}
