"use client";

import { useState } from "react";
import { updateTask, updateTaskStatus, deleteTask } from "@/lib/actions";
import { STATUS_META, TASK_STATUSES, type TaskStatus } from "@/lib/constants";

export default function TaskHeader({
  id,
  title,
  description,
  status,
}: {
  id: string;
  title: string;
  description: string | null;
  status: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="mb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {editing ? (
            <form
              action={async (fd) => {
                await updateTask(fd);
                setEditing(false);
              }}
              className="space-y-2"
            >
              <input type="hidden" name="id" value={id} />
              <input
                name="title"
                defaultValue={title}
                required
                className="w-full text-xl font-semibold rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5"
              />
              <textarea
                name="description"
                defaultValue={description ?? ""}
                rows={2}
                placeholder="작업 설명 (선택)"
                className="w-full text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5"
              />
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white">
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-700 hover:bg-slate-800"
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-xl font-semibold">{title}</h1>
              {description && (
                <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">
                  {description}
                </p>
              )}
            </>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-2 shrink-0">
            <form action={updateTaskStatus}>
              <input type="hidden" name="id" value={id} />
              <select
                name="status"
                defaultValue={status}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className={`text-xs font-medium rounded px-2 py-1.5 border-0 cursor-pointer ${
                  STATUS_META[status as TaskStatus]?.cls ?? ""
                }`}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-slate-100">
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </form>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-700 hover:bg-slate-800"
            >
              수정
            </button>
            <form
              action={deleteTask}
              onSubmit={(e) => {
                if (!confirm("이 작업을 삭제할까요?")) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={id} />
              <button className="px-3 py-1.5 text-sm rounded-md border border-rose-800/60 text-rose-300 hover:bg-rose-900/30">
                삭제
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
