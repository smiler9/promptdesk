"use client";

import { useRef, useState } from "react";
import {
  createTaskChecklistItem,
  deleteTaskChecklistItem,
  toggleTaskChecklistItem,
  updateTaskChecklistItem,
} from "@/lib/actions";

type ChecklistItem = {
  id: string;
  content: string;
  isDone: boolean;
  order: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export default function TaskChecklist({
  taskId,
  items,
}: {
  taskId: string;
  items: ChecklistItem[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);
  const orderedItems = [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  const total = orderedItems.length;
  const done = orderedItems.filter((item) => item.isDone).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-medium text-slate-300">Checklist</h2>
          <p className="text-xs text-slate-500 mt-1">
            {total === 0
              ? "세부 작업이 없습니다."
              : `${done}/${total} done · ${percent}%`}
          </p>
        </div>
        {total > 0 && (
          <div className="w-28 h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      <form
        ref={addFormRef}
        action={async (formData) => {
          await createTaskChecklistItem(formData);
          addFormRef.current?.reset();
        }}
        className="flex gap-2 mb-4"
      >
        <input type="hidden" name="taskId" value={taskId} />
        <input
          name="content"
          required
          placeholder="체크리스트 항목 추가"
          className="flex-1 min-w-0 text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <button className="px-3 py-2 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white shrink-0">
          추가
        </button>
      </form>

      {orderedItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-800 px-3 py-4 text-xs text-slate-600">
          Task를 작은 완료 단위로 나눠서 기록하세요.
        </div>
      ) : (
        <ul className="space-y-2">
          {orderedItems.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-md border border-slate-800 bg-slate-900/30 px-3 py-2"
            >
              <form action={toggleTaskChecklistItem} className="shrink-0 pt-0.5">
                <input type="hidden" name="id" value={item.id} />
                <button
                  className={`h-5 w-5 rounded border text-[11px] font-semibold ${
                    item.isDone
                      ? "border-emerald-500 bg-emerald-500 text-emerald-950"
                      : "border-slate-600 hover:border-slate-400"
                  }`}
                  title={item.isDone ? "미완료로 변경" : "완료로 변경"}
                  aria-pressed={item.isDone}
                >
                  {item.isDone ? "✓" : ""}
                </button>
              </form>

              {editingId === item.id ? (
                <form
                  action={async (formData) => {
                    await updateTaskChecklistItem(formData);
                    setEditingId(null);
                  }}
                  className="flex-1 flex gap-2"
                >
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="content"
                    required
                    defaultValue={item.content}
                    autoFocus
                    className="flex-1 min-w-0 text-sm rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                  />
                  <button className="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white shrink-0">
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2 py-1 text-xs rounded border border-slate-700 hover:bg-slate-800 shrink-0"
                  >
                    취소
                  </button>
                </form>
              ) : (
                <>
                  <div
                    className={`flex-1 min-w-0 text-sm ${
                      item.isDone
                        ? "text-slate-500 line-through"
                        : "text-slate-200"
                    }`}
                  >
                    {item.content}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(item.id)}
                    className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 shrink-0"
                  >
                    수정
                  </button>
                  <form
                    action={deleteTaskChecklistItem}
                    onSubmit={(e) => {
                      if (!confirm("이 체크리스트 항목을 삭제할까요?")) {
                        e.preventDefault();
                      }
                    }}
                    className="shrink-0"
                  >
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-xs px-2 py-1 rounded border border-rose-800/60 text-rose-300 hover:bg-rose-900/30">
                      삭제
                    </button>
                  </form>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
