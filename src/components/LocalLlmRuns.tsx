"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  convertLocalLLMRunToErrorLog,
  convertLocalLLMRunToLog,
  convertLocalLLMRunToPrompt,
} from "@/lib/actions";

type LocalLLMRun = {
  id: string;
  model: string;
  prompt: string;
  response: string | null;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ConversionAction = "log" | "prompt" | "error";
type ConversionResult = {
  ok?: boolean;
  message?: string;
  error?: string;
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function excerpt(value: string | null | undefined, length = 180) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "내용 없음";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function formatDuration(value: number | null) {
  if (value === null) return "시간 미기록";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}s`;
}

export default function LocalLlmRuns({ runs }: { runs: LocalLLMRun[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Record<string, ConversionResult>>(
    {}
  );
  const [pending, setPending] = useState<string | null>(null);

  async function convert(runId: string, action: ConversionAction) {
    const pendingKey = `${runId}:${action}`;
    setPending(pendingKey);
    const formData = new FormData();
    formData.set("id", runId);

    try {
      const result =
        action === "log"
          ? await convertLocalLLMRunToLog(formData)
          : action === "prompt"
            ? await convertLocalLLMRunToPrompt(formData)
            : await convertLocalLLMRunToErrorLog(formData);

      setMessages((current) => ({ ...current, [runId]: result }));
      if (!result.error) router.refresh();
    } catch {
      setMessages((current) => ({
        ...current,
        [runId]: { error: "변환 중 오류가 발생했습니다." },
      }));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Local LLM Runs ({runs.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Task에서 실행한 Ollama 요청과 응답 기록
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="text-xs text-slate-600 py-4 text-center">
          저장된 Local LLM 실행 기록이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {runs.map((run, index) => (
            <article
              key={run.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {index === 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-600/80 text-emerald-50">
                        최신
                      </span>
                    )}
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded ${
                        run.status === "SUCCESS"
                          ? "bg-emerald-600/80 text-emerald-50"
                          : "bg-rose-600/80 text-rose-50"
                      }`}
                    >
                      {run.status}
                    </span>
                    <span className="mono text-[11px] text-slate-400">
                      {run.model}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDuration(run.durationMs)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    생성 {formatDate(run.createdAt)}
                    {" · "}
                    수정 {formatDate(run.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <div className="text-[11px] text-slate-500 mb-1">Prompt</div>
                  <p className="text-xs text-slate-300 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2">
                    {excerpt(run.prompt)}
                  </p>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 mb-1">
                    {run.status === "SUCCESS" ? "Response" : "Error"}
                  </div>
                  <p className="text-xs text-slate-300 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2">
                    {run.status === "SUCCESS"
                      ? excerpt(run.response)
                      : excerpt(run.errorMessage)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => convert(run.id, "log")}
                  disabled={!run.response?.trim() || pending === `${run.id}:log`}
                  className="text-[11px] px-2 py-1 rounded border border-indigo-700/60 text-indigo-200 hover:bg-indigo-900/30 disabled:opacity-50"
                >
                  {pending === `${run.id}:log`
                    ? "저장 중..."
                    : "응답을 로그로 저장"}
                </button>
                <button
                  type="button"
                  onClick={() => convert(run.id, "prompt")}
                  disabled={
                    !run.response?.trim() || pending === `${run.id}:prompt`
                  }
                  className="text-[11px] px-2 py-1 rounded border border-amber-700/60 text-amber-200 hover:bg-amber-900/30 disabled:opacity-50"
                >
                  {pending === `${run.id}:prompt`
                    ? "저장 중..."
                    : "응답을 프롬프트로 저장"}
                </button>
                {run.status === "ERROR" && (
                  <button
                    type="button"
                    onClick={() => convert(run.id, "error")}
                    disabled={
                      (!run.errorMessage?.trim() && !run.response?.trim()) ||
                      pending === `${run.id}:error`
                    }
                    className="text-[11px] px-2 py-1 rounded border border-rose-700/60 text-rose-200 hover:bg-rose-900/30 disabled:opacity-50"
                  >
                    {pending === `${run.id}:error`
                      ? "저장 중..."
                      : "에러 로그로 저장"}
                  </button>
                )}
                {messages[run.id] && (
                  <span
                    className={`text-[11px] ${
                      messages[run.id].error
                        ? "text-rose-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {messages[run.id].error ?? messages[run.id].message}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
