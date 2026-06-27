"use client";

import { useMemo, useState } from "react";
import CopyButton from "./CopyButton";
import { createPrompt } from "@/lib/actions";
import {
  buildTemplatePrompt,
  NEXT_PROMPT_TYPE_OPTIONS,
  type NextPromptType,
} from "@/lib/nextPrompt";

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

export default function NextAiPrompt({
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
  const hasErrors = logs.some((log) => log.type === "ERROR");
  const [promptType, setPromptType] = useState<NextPromptType>(
    hasErrors ? "Fix Error" : "Continue Implementation"
  );
  const [targetAI, setTargetAI] = useState<"Codex" | "Claude Code">("Codex");
  const [saved, setSaved] = useState(false);

  const generatedPrompt = useMemo(
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
        promptType,
        targetAI,
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
      promptType,
      targetAI,
    ]
  );

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Next AI Prompt
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            프롬프트 {prompts.length} · 로그 {logs.length} · 리포트{" "}
            {reports.length} · 커밋 {gitCommits.length}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={promptType}
            onChange={(e) => {
              setPromptType(e.target.value as NextPromptType);
              setSaved(false);
            }}
            className="text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5"
          >
            {NEXT_PROMPT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={targetAI}
            onChange={(e) => {
              setTargetAI(e.target.value as "Codex" | "Claude Code");
              setSaved(false);
            }}
            className="text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5"
          >
            <option value="Codex">Codex</option>
            <option value="Claude Code">Claude Code</option>
          </select>
        </div>
      </div>

      <textarea
        readOnly
        value={generatedPrompt}
        rows={14}
        className="w-full mono text-xs rounded-md border border-slate-700 bg-slate-950 px-3 py-2 leading-relaxed"
      />

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <CopyButton text={generatedPrompt} label="프롬프트 복사" />
        <form
          action={async (formData) => {
            await createPrompt(formData);
            setSaved(true);
          }}
        >
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="targetAI" value={targetAI} />
          <input type="hidden" name="isGenerated" value="true" />
          <textarea
            name="content"
            value={generatedPrompt}
            readOnly
            className="hidden"
          />
          <button className="text-xs px-2 py-1 rounded border border-amber-700/60 text-amber-200 hover:bg-amber-900/30">
            프롬프트로 저장
          </button>
        </form>
        {saved && (
          <span className="text-xs text-emerald-300">
            생성된 프롬프트를 저장했습니다.
          </span>
        )}
      </div>
    </section>
  );
}
