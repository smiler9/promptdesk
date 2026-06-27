"use client";

import { useState } from "react";
import { updateProject, deleteProject } from "@/lib/actions";

export default function ProjectHeader({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateProject(fd);
          setEditing(false);
        }}
        className="space-y-2 mb-2"
      >
        <input type="hidden" name="id" value={id} />
        <input
          name="name"
          defaultValue={name}
          required
          className="w-full text-xl font-semibold rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5"
        />
        <textarea
          name="description"
          defaultValue={description ?? ""}
          rows={2}
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
    );
  }

  return (
    <div className="flex items-start justify-between mb-2">
      <div>
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {description || "설명 없음"}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-700 hover:bg-slate-800"
        >
          수정
        </button>
        <form
          action={deleteProject}
          onSubmit={(e) => {
            if (!confirm("이 프로젝트와 모든 작업을 삭제할까요?"))
              e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button className="px-3 py-1.5 text-sm rounded-md border border-rose-800/60 text-rose-300 hover:bg-rose-900/30">
            삭제
          </button>
        </form>
      </div>
    </div>
  );
}
