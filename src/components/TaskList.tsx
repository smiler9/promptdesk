"use client";

import Link from "next/link";
import { useState } from "react";
import { createTask, updateTaskStatus } from "@/lib/actions";
import { STATUS_META, TASK_STATUSES, type TaskStatus } from "@/lib/constants";

type Task = {
  id: string;
  title: string;
  status: string;
  _count: { prompts: number; logs: number };
};

export default function TaskList({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: Task[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">작업 단계</h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
        >
          {adding ? "닫기" : "+ 작업 추가"}
        </button>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await createTask(fd);
            setAdding(false);
          }}
          className="flex gap-2 mb-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input
            name="title"
            required
            autoFocus
            placeholder="작업 제목 (예: Prisma 스키마 작성)"
            className="flex-1 text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5"
          />
          <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white shrink-0">
            추가
          </button>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-xs text-slate-600">작업이 없습니다.</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-md border border-slate-800 px-3 py-2 hover:border-slate-700"
            >
              <form action={updateTaskStatus} className="shrink-0">
                <input type="hidden" name="id" value={t.id} />
                <select
                  name="status"
                  defaultValue={t.status}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className={`text-[11px] font-medium rounded px-1.5 py-1 border-0 cursor-pointer ${
                    STATUS_META[t.status as TaskStatus]?.cls ?? ""
                  }`}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-slate-900 text-slate-100">
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </form>

              <Link
                href={`/tasks/${t.id}`}
                className="flex-1 text-sm hover:text-indigo-300 truncate"
              >
                {t.title}
              </Link>

              <span className="text-[11px] text-slate-500 shrink-0">
                프롬프트 {t._count.prompts} · 로그 {t._count.logs}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
