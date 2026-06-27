"use client";

import { useState } from "react";
import { createDecision, deleteDecision } from "@/lib/actions";

type Decision = {
  id: string;
  title: string;
  content: string | null;
};

export default function DecisionPanel({
  projectId,
  decisions,
}: {
  projectId: string;
  decisions: Decision[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">결정 사항</h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
        >
          {adding ? "닫기" : "+ 추가"}
        </button>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await createDecision(fd);
            setAdding(false);
          }}
          className="space-y-2 mb-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input
            name="title"
            required
            placeholder="결정 제목 (예: SQLite enum 미사용)"
            className="w-full text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5"
          />
          <textarea
            name="content"
            rows={2}
            placeholder="상세 내용 (선택)"
            className="w-full text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5"
          />
          <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white">
            저장
          </button>
        </form>
      )}

      {decisions.length === 0 ? (
        <p className="text-xs text-slate-600">기록된 결정이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {decisions.map((d) => (
            <li
              key={d.id}
              className="rounded-md border border-slate-800 px-3 py-2 flex items-start justify-between gap-2"
            >
              <div>
                <div className="text-sm font-medium">{d.title}</div>
                {d.content && (
                  <div className="text-xs text-slate-400 mt-0.5 whitespace-pre-wrap">
                    {d.content}
                  </div>
                )}
              </div>
              <form action={deleteDecision}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <button className="text-xs text-slate-500 hover:text-rose-400">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
