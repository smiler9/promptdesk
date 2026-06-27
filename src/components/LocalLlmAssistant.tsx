"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CopyButton from "./CopyButton";
import {
  loadOllamaModels,
  runOllamaGenerate,
} from "@/lib/ollamaActions";
import { createLocalLLMRun } from "@/lib/actions";
import type { OllamaModel } from "@/lib/ollama";
import { buildTemplatePrompt } from "@/lib/nextPrompt";

type Timestamp = Date | string;

type PromptSummary = {
  id: string;
  content: string;
  targetAI: string;
  isGenerated: boolean;
  createdAt: Timestamp;
};

type LogSummary = {
  id: string;
  type: string;
  content: string;
  createdAt: Timestamp;
};

type TagSummary = {
  id: string;
  name: string;
  color: string | null;
};

type ChecklistSummary = {
  id: string;
  content: string;
  isDone: boolean;
  order: number;
  createdAt: Timestamp;
};

type ReportSummary = {
  id: string;
  summary: string;
  changedFiles: string | null;
  commandsRun: string | null;
  testResults: string | null;
  buildResult: string | null;
  commitHash: string | null;
  pushedToRemote: boolean;
  nextSteps: string | null;
  createdAt: Timestamp;
};

type GitCommitSummary = {
  id: string;
  commitHash: string;
  commitMessage: string;
  branchName: string;
  remoteUrl: string | null;
  pushedToRemote: boolean;
  createdAt: Timestamp;
};

function formatDuration(ns: number | undefined) {
  if (!ns) return null;
  const seconds = ns / 1_000_000_000;
  return `${seconds.toFixed(seconds >= 10 ? 1 : 2)}s`;
}

export default function LocalLlmAssistant({
  taskId,
  projectName,
  title,
  description,
  status,
  priority,
  tags,
  prompts,
  logs,
  reports,
  checklistItems,
  gitCommits,
}: {
  taskId: string;
  projectName: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  tags: TagSummary[];
  prompts: PromptSummary[];
  logs: LogSummary[];
  reports: ReportSummary[];
  checklistItems: ChecklistSummary[];
  gitCommits: GitCommitSummary[];
}) {
  const router = useRouter();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [responseModel, setResponseModel] = useState("");
  const [responseDuration, setResponseDuration] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState<"models" | "run" | null>(null);

  const generatedNextPrompt = useMemo(
    () =>
      buildTemplatePrompt({
        projectName,
        taskTitle: title,
        taskStatus: status,
        priority,
        tags,
        taskDescription: description,
        prompts,
        logs,
        recentErrors: logs.filter((log) => log.type === "ERROR"),
        recentResponses: logs.filter((log) => log.type === "RESPONSE"),
        reports,
        checklistItems,
        gitCommits,
        decisions: [],
        promptType: logs.some((log) => log.type === "ERROR")
          ? "Fix Error"
          : "Continue Implementation",
        targetAI: "Ollama Local LLM",
      }),
    [
      projectName,
      title,
      status,
      priority,
      tags,
      description,
      prompts,
      logs,
      reports,
      checklistItems,
      gitCommits,
    ]
  );

  async function loadModels() {
    setLoading("models");
    setMessage(null);
    const result = await loadOllamaModels();
    const loadedModels = result.data?.models ?? [];
    setModels(loadedModels);
    if (!selectedModel && loadedModels.length > 0) {
      setSelectedModel(loadedModels[0].name);
    }
    setOk(result.ok);
    setMessage(result.message);
    setLoading(null);
  }

  async function runPrompt() {
    setLoading("run");
    setResponse("");
    setResponseModel("");
    setResponseDuration(null);
    setDurationMs(null);
    setMessage(null);
    setLastErrorMessage(null);
    setSaved(false);
    const result = await runOllamaGenerate({
      model: selectedModel,
      prompt,
    });
    setOk(result.ok);
    setMessage(result.message);
    if (result.data) {
      setResponse(result.data.response);
      setResponseModel(result.data.model);
      setResponseDuration(formatDuration(result.data.total_duration));
      setDurationMs(
        result.data.total_duration
          ? Math.round(result.data.total_duration / 1_000_000)
          : null
      );
    } else if (!result.ok) {
      setLastErrorMessage(result.message);
    }
    setLoading(null);
  }

  async function saveRun() {
    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("model", responseModel || selectedModel);
    formData.set("prompt", prompt);
    formData.set("response", response);
    formData.set("status", ok ? "SUCCESS" : "ERROR");
    if (lastErrorMessage) formData.set("errorMessage", lastErrorMessage);
    if (durationMs !== null) formData.set("durationMs", String(durationMs));
    const result = await createLocalLLMRun(formData);
    if (result?.error) {
      setOk(false);
      setMessage(result.error);
      return;
    }
    setSaved(true);
    setMessage("Local LLM 실행 기록을 저장했습니다.");
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Local LLM Assistant
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ollama 로컬 모델로 프롬프트를 실행합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={loadModels}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-800 disabled:opacity-60 text-slate-300"
        >
          {loading === "models" ? "불러오는 중..." : "모델 목록 불러오기"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2">
        <select
          value={selectedModel}
          onChange={(event) => setSelectedModel(event.target.value)}
          className="text-sm rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        >
          <option value="">모델 선택</option>
          {models.map((model) => (
            <option key={model.name} value={model.name}>
              {model.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setPrompt(generatedNextPrompt)}
          className="text-sm rounded-md border border-slate-700 hover:bg-slate-800 px-3 py-2 text-slate-300"
        >
          Next AI Prompt 불러오기
        </button>
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={10}
        placeholder="Ollama에 보낼 프롬프트를 입력하세요."
        className="mt-3 w-full mono text-xs rounded-md border border-slate-700 bg-slate-950 px-3 py-2 leading-relaxed"
      />

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={runPrompt}
          disabled={loading !== null || !selectedModel || !prompt.trim()}
          className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white"
        >
          {loading === "run" ? "실행 중..." : "Run Local LLM"}
        </button>
        {(response || lastErrorMessage) && (
          <button
            type="button"
            onClick={saveRun}
            disabled={saved || !selectedModel || !prompt.trim()}
            className="text-xs px-3 py-1.5 rounded-md border border-emerald-700/60 text-emerald-200 hover:bg-emerald-900/30 disabled:opacity-60"
          >
            {saved ? "저장됨" : "실행 기록 저장"}
          </button>
        )}
        {prompt && <CopyButton text={prompt} label="프롬프트 복사" />}
      </div>

      {message && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            ok
              ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-100"
              : "border-amber-800/60 bg-amber-950/30 text-amber-100"
          }`}
        >
          {message}
        </div>
      )}

      {response && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-xs text-slate-500">
              {responseModel || selectedModel}
              {responseDuration ? ` · ${responseDuration}` : ""}
            </div>
            <CopyButton text={response} label="응답 복사" />
          </div>
          <pre className="whitespace-pre-wrap rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-200">
            {response}
          </pre>
        </div>
      )}
    </section>
  );
}
