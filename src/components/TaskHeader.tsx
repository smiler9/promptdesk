"use client";

import { useState } from "react";
import {
  createTaskTag,
  deleteTask,
  deleteTaskTag,
  updateTask,
  updateTaskPriority,
  updateTaskStatus,
} from "@/lib/actions";
import {
  PRIORITY_META,
  STATUS_META,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";

type TaskTag = {
  id: string;
  name: string;
  color: string | null;
};

export default function TaskHeader({
  id,
  title,
  description,
  status,
  priority,
  tags,
}: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  tags: TaskTag[];
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{title}</h1>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded ${
                    PRIORITY_META[priority as TaskPriority]?.cls ??
                    PRIORITY_META.MEDIUM.cls
                  }`}
                >
                  {PRIORITY_META[priority as TaskPriority]?.label ?? priority}
                </span>
              </div>
              {description && (
                <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">
                  {description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {tags.length === 0 ? (
                  <span className="text-xs text-slate-600">태그 없음</span>
                ) : (
                  tags.map((tag) => (
                    <form
                      key={tag.id}
                      action={deleteTaskTag}
                      className="inline-flex items-center gap-1"
                    >
                      <input type="hidden" name="id" value={tag.id} />
                      <input type="hidden" name="taskId" value={id} />
                      <span
                        className="text-xs px-2 py-1 rounded-full border border-slate-700 text-slate-300"
                        style={
                          tag.color
                            ? { borderColor: tag.color, color: tag.color }
                            : undefined
                        }
                      >
                        #{tag.name}
                      </span>
                      <button
                        className="text-[11px] text-slate-500 hover:text-rose-300"
                        title="태그 삭제"
                      >
                        삭제
                      </button>
                    </form>
                  ))
                )}
              </div>
              <form
                action={createTaskTag}
                className="mt-2 flex items-center gap-2 flex-wrap"
              >
                <input type="hidden" name="taskId" value={id} />
                <input
                  name="name"
                  placeholder="태그 추가: bug, frontend..."
                  className="w-56 text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5"
                />
                <select
                  name="color"
                  defaultValue=""
                  className="text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5"
                >
                  <option value="">기본색</option>
                  <option value="#38bdf8">sky</option>
                  <option value="#34d399">green</option>
                  <option value="#f59e0b">amber</option>
                  <option value="#f43f5e">rose</option>
                  <option value="#a78bfa">violet</option>
                </select>
                <button className="text-xs px-2 py-1.5 rounded border border-slate-700 hover:bg-slate-800">
                  태그 추가
                </button>
              </form>
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
            <form action={updateTaskPriority}>
              <input type="hidden" name="id" value={id} />
              <select
                name="priority"
                defaultValue={priority}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className={`text-xs font-medium rounded px-2 py-1.5 border-0 cursor-pointer ${
                  PRIORITY_META[priority as TaskPriority]?.cls ?? ""
                }`}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option
                    key={p}
                    value={p}
                    className="bg-slate-900 text-slate-100"
                  >
                    {PRIORITY_META[p].label}
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
