"use client";

import { useState, useMemo } from "react";
import PromptCard from "./PromptCard";
import LogCard from "./LogCard";
import {
  createPrompt,
  createLog,
  generateNextPrompt,
} from "@/lib/actions";
import {
  TARGET_AIS,
  LOG_TYPES,
  LOG_META,
  TEMPLATE_CATEGORY_META,
  type LogType,
  type TargetAI,
  type TemplateCategory,
} from "@/lib/constants";

type Prompt = {
  id: string;
  content: string;
  targetAI: string;
  isGenerated: boolean;
  createdAt: Date;
};
type Log = {
  id: string;
  type: string;
  content: string;
  createdAt: Date;
};
type PromptTemplate = {
  id: string;
  title: string;
  description: string | null;
  targetAI: string;
  category: string;
  content: string;
};

export default function TaskWorkspace({
  taskId,
  prompts,
  logs,
  templates,
}: {
  taskId: string;
  prompts: Prompt[];
  logs: Log[];
  templates: PromptTemplate[];
}) {
  const [tab, setTab] = useState<"prompts" | "logs">("prompts");
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [query, setQuery] = useState("");
  const [logFilter, setLogFilter] = useState<"ALL" | LogType>("ALL");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [promptTargetAI, setPromptTargetAI] =
    useState<TargetAI>("Claude Code");
  const [promptContent, setPromptContent] = useState("");

  const filteredPrompts = useMemo(
    () =>
      prompts.filter((p) =>
        query ? p.content.toLowerCase().includes(query.toLowerCase()) : true
      ),
    [prompts, query]
  );

  const filteredLogs = useMemo(
    () =>
      logs.filter((l) => {
        const okType = logFilter === "ALL" || l.type === logFilter;
        const okQ = query
          ? l.content.toLowerCase().includes(query.toLowerCase())
          : true;
        return okType && okQ;
      }),
    [logs, query, logFilter]
  );

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const targetAI = TARGET_AIS.includes(template.targetAI as TargetAI)
      ? (template.targetAI as TargetAI)
      : "Claude Code";
    setPromptTargetAI(targetAI);
    setPromptContent(template.content);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1320]">
      {/* 탭 + 검색 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-900 rounded-md p-0.5">
          <button
            onClick={() => setTab("prompts")}
            className={`text-sm px-3 py-1 rounded ${
              tab === "prompts"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            프롬프트 ({prompts.length})
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`text-sm px-3 py-1 rounded ${
              tab === "logs"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            응답·에러·메모 ({logs.length})
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="내용 검색…"
          className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 w-48"
        />
      </div>

      <div className="p-4 space-y-3">
        {tab === "prompts" ? (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPromptForm((v) => !v)}
                className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {showPromptForm ? "닫기" : "+ 프롬프트 저장"}
              </button>
              <form action={generateNextPrompt}>
                <input type="hidden" name="taskId" value={taskId} />
                <button className="text-sm px-3 py-1.5 rounded-md border border-amber-700/60 text-amber-200 hover:bg-amber-900/30">
                  ⚡ 다음 프롬프트 생성
                </button>
              </form>
            </div>

            {showPromptForm && (
              <form
                action={async (fd) => {
                  await createPrompt(fd);
                  setPromptContent("");
                  setPromptTargetAI("Claude Code");
                  setSelectedTemplateId("");
                  setShowPromptForm(false);
                }}
                className="space-y-2 rounded-lg border border-slate-800 p-3"
              >
                <input type="hidden" name="taskId" value={taskId} />
                {templates.length > 0 && (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                    className="w-full text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
                  >
                    <option value="">템플릿 선택...</option>
                    {templates.map((template) => {
                      const category =
                        TEMPLATE_CATEGORY_META[
                          template.category as TemplateCategory
                        ] ?? TEMPLATE_CATEGORY_META.Other;
                      return (
                        <option key={template.id} value={template.id}>
                          [{category.label}] {template.title}
                        </option>
                      );
                    })}
                  </select>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    name="targetAI"
                    value={promptTargetAI}
                    onChange={(e) =>
                      setPromptTargetAI(e.target.value as TargetAI)
                    }
                    className="text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
                  >
                    {TARGET_AIS.map((ai) => (
                      <option key={ai} value={ai}>
                        {ai}
                      </option>
                    ))}
                  </select>
                  {selectedTemplateId && (
                    <span className="text-[11px] text-slate-500">
                      템플릿 내용이 작성 영역에 불러와졌습니다.
                    </span>
                  )}
                </div>
                <textarea
                  name="content"
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  required
                  rows={6}
                  placeholder="AI에게 보낸 프롬프트를 붙여넣으세요…"
                  className="w-full mono text-xs rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                />
                <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white">
                  저장
                </button>
              </form>
            )}

            {filteredPrompts.length === 0 ? (
              <p className="text-xs text-slate-600 py-4 text-center">
                저장된 프롬프트가 없습니다.
              </p>
            ) : (
              filteredPrompts.map((p) => (
                <PromptCard key={p.id} prompt={p} taskId={taskId} />
              ))
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowLogForm((v) => !v)}
                className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {showLogForm ? "닫기" : "+ 로그 추가"}
              </button>
              <div className="flex gap-1">
                {(["ALL", ...LOG_TYPES] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`text-[11px] px-2 py-1 rounded border ${
                      logFilter === f
                        ? "border-indigo-500 text-indigo-200"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    {f === "ALL" ? "전체" : LOG_META[f].label}
                  </button>
                ))}
              </div>
            </div>

            {showLogForm && (
              <form
                action={async (fd) => {
                  await createLog(fd);
                  setShowLogForm(false);
                }}
                className="space-y-2 rounded-lg border border-slate-800 p-3"
              >
                <input type="hidden" name="taskId" value={taskId} />
                <select
                  name="type"
                  defaultValue="RESPONSE"
                  className="text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
                >
                  {LOG_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {LOG_META[t].label}
                    </option>
                  ))}
                </select>
                <textarea
                  name="content"
                  required
                  rows={6}
                  placeholder="AI 응답 / 에러 로그 / 메모를 붙여넣으세요…"
                  className="w-full mono text-xs rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                />
                <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white">
                  저장
                </button>
              </form>
            )}

            {filteredLogs.length === 0 ? (
              <p className="text-xs text-slate-600 py-4 text-center">
                기록된 로그가 없습니다.
              </p>
            ) : (
              filteredLogs.map((l) => (
                <LogCard key={l.id} log={l} taskId={taskId} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
