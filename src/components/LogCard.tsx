"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";
import { updateLog, deleteLog } from "@/lib/actions";
import { LOG_META, type LogType } from "@/lib/constants";

type Log = {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
};

export default function LogCard({
  log,
  taskId,
}: {
  log: Log;
  taskId: string;
}) {
  const [editing, setEditing] = useState(false);
  const meta = LOG_META[log.type as LogType] ?? LOG_META.NOTE;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] px-1.5 py-0.5 rounded ${meta.cls}`}>
            {meta.label}
          </span>
          <span className="text-[11px] text-slate-500">
            {new Date(log.createdAt).toLocaleString("ko-KR")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton text={log.content} />
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
          >
            {editing ? "취소" : "편집"}
          </button>
          <form action={deleteLog}>
            <input type="hidden" name="id" value={log.id} />
            <input type="hidden" name="taskId" value={taskId} />
            <button className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-400">
              ✕
            </button>
          </form>
        </div>
      </div>

      {editing ? (
        <form
          action={async (fd) => {
            await updateLog(fd);
            setEditing(false);
          }}
          className="p-3 space-y-2"
        >
          <input type="hidden" name="id" value={log.id} />
          <input type="hidden" name="taskId" value={taskId} />
          <textarea
            name="content"
            defaultValue={log.content}
            rows={6}
            className="w-full mono text-xs rounded-md border border-slate-700 bg-slate-950 px-3 py-2 leading-relaxed"
          />
          <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white">
            저장
          </button>
        </form>
      ) : (
        <pre className="mono text-xs text-slate-200 whitespace-pre-wrap p-3 leading-relaxed">
          {log.content}
        </pre>
      )}
    </div>
  );
}
