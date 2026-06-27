"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createProject } from "@/lib/actions";

export default function NewProjectModal() {
  const params = useSearchParams();
  const router = useRouter();
  const open = params.get("new") === "1";
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0d1320] p-5">
        <h2 className="text-lg font-semibold mb-4">새 프로젝트</h2>
        <form
          action={async (fd) => {
            setSubmitting(true);
            await createProject(fd);
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              프로젝트 이름
            </label>
            <input
              name="name"
              autoFocus
              required
              placeholder="예: USP1 docking 파이프라인"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">설명</label>
            <textarea
              name="description"
              rows={3}
              placeholder="간단한 설명 (선택)"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-3 py-2 text-sm rounded-md border border-slate-700 hover:bg-slate-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50"
            >
              {submitting ? "생성 중…" : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
