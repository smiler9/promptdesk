"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";
import { updatePrompt, deletePrompt } from "@/lib/actions";
import { TARGET_AIS } from "@/lib/constants";

type Prompt = {
  id: string;
  content: string;
  targetAI: string;
  isGenerated: boolean;
  createdAt: Date;
};

export default function PromptCard({
  prompt,
  taskId,
}: {
  prompt: Prompt;
  taskId: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-600/80 text-indigo-50">
            {prompt.targetAI}
          </span>
          {prompt.isGenerated && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-600/70 text-amber-50">
              자동생성 초안
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {new Date(prompt.createdAt).toLocaleString("ko-KR")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton text={prompt.content} />
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
          >
            {editing ? "취소" : "편집"}
          </button>
          <form action={deletePrompt}>
            <input type="hidden" name="id" value={prompt.id} />
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
            await updatePrompt(fd);
            setEditing(false);
          }}
          className="p-3 space-y-2"
        >
          <input type="hidden" name="id" value={prompt.id} />
          <input type="hidden" name="taskId" value={taskId} />
          <select
            name="targetAI"
            defaultValue={prompt.targetAI}
            className="text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
          >
            {TARGET_AIS.map((ai) => (
              <option key={ai} value={ai}>
                {ai}
              </option>
            ))}
          </select>
          <textarea
            name="content"
            defaultValue={prompt.content}
            rows={8}
            className="w-full mono text-xs rounded-md border border-slate-700 bg-slate-950 px-3 py-2 leading-relaxed"
          />
          <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white">
            저장
          </button>
        </form>
      ) : (
        <pre className="mono text-xs text-slate-200 whitespace-pre-wrap p-3 leading-relaxed">
          {prompt.content}
        </pre>
      )}
    </div>
  );
}
