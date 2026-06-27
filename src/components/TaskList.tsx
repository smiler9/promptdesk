"use client";

import Link from "next/link";
import { useState } from "react";
import { createTask, toggleTaskPin, updateTaskStatus } from "@/lib/actions";
import {
  PRIORITY_META,
  STATUS_META,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/constants";

type Task = {
  id: string;
  title: string;
  description: string | null;
  isPinned: boolean;
  priority: string;
  status: string;
  tags: { id: string; name: string; color: string | null }[];
  _count: { prompts: number; logs: number };
};
type TaskSort = "order" | "updated" | "created";

export default function TaskList({
  projectId,
  tasks,
  query,
  status,
  priority,
  sort,
}: {
  projectId: string;
  tasks: Task[];
  query: string;
  status: "ALL" | TaskStatus;
  priority: "ALL" | TaskPriority;
  sort: TaskSort;
}) {
  const [adding, setAdding] = useState(false);
  const hasFilters =
    query !== "" || status !== "ALL" || priority !== "ALL" || sort !== "order";

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

      <form
        method="get"
        className="grid grid-cols-1 md:grid-cols-[1fr_150px_150px_150px_auto] gap-2 mb-3"
      >
        <input
          name="taskQ"
          defaultValue={query}
          placeholder="작업 제목/목표 검색..."
          className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <select
          name="taskStatus"
          defaultValue={status}
          className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        >
          <option value="ALL">전체 상태</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <select
          name="taskPriority"
          defaultValue={priority}
          className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        >
          <option value="ALL">전체 우선순위</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_META[p].label}
            </option>
          ))}
        </select>
        <select
          name="taskSort"
          defaultValue={sort}
          className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        >
          <option value="order">기본순</option>
          <option value="updated">최근 수정순</option>
          <option value="created">최근 생성순</option>
        </select>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
            적용
          </button>
          {hasFilters && (
            <Link
              href={`/projects/${projectId}`}
              className="px-3 py-2 rounded-md border border-slate-700 hover:bg-slate-800 text-sm text-slate-300"
            >
              초기화
            </Link>
          )}
        </div>
      </form>

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
        <p className="text-xs text-slate-600">
          {hasFilters ? "조건에 맞는 작업이 없습니다." : "작업이 없습니다."}
        </p>
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
                    <option
                      key={s}
                      value={s}
                      className="bg-slate-900 text-slate-100"
                    >
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </form>

              <Link
                href={`/tasks/${t.id}`}
                className="flex-1 min-w-0 hover:text-indigo-300"
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                      PRIORITY_META[t.priority as TaskPriority]?.cls ??
                      PRIORITY_META.MEDIUM.cls
                    }`}
                  >
                    {PRIORITY_META[t.priority as TaskPriority]?.label ??
                      t.priority}
                  </span>
                  <div className="text-sm truncate">{t.title}</div>
                  {t.isPinned && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-600/80 text-amber-50">
                      고정
                    </span>
                  )}
                </div>
                {t.description && (
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {t.description}
                  </div>
                )}
                {t.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {t.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-700 text-slate-300"
                        style={
                          tag.color
                            ? { borderColor: tag.color, color: tag.color }
                            : undefined
                        }
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>

              <span className="text-[11px] text-slate-500 shrink-0">
                프롬프트 {t._count.prompts} · 로그 {t._count.logs}
              </span>
              <form action={toggleTaskPin} className="shrink-0">
                <input type="hidden" name="id" value={t.id} />
                <button
                  className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300"
                  title={t.isPinned ? "핀 해제" : "핀 고정"}
                >
                  {t.isPinned ? "해제" : "고정"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
