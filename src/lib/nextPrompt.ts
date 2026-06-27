// 기능 9: "다음 프롬프트" 생성
// 외부 API 호출 없이 Task 컨텍스트를 로컬 템플릿으로 조합한다.

export const NEXT_PROMPT_TYPES = [
  "Continue Implementation",
  "Fix Error",
  "Add Tests",
  "Refactor",
  "Update Documentation",
  "Commit and Push",
] as const;

export type NextPromptType = (typeof NEXT_PROMPT_TYPES)[number];

export const NEXT_PROMPT_TYPE_OPTIONS = NEXT_PROMPT_TYPES.map((value) => ({
  value,
  label: value,
}));

type Timestamp = Date | string;
type PromptLike = {
  content: string;
  targetAI: string;
  createdAt: Timestamp;
  isGenerated?: boolean;
};
type LogLike = { type: string; content: string; createdAt: Timestamp };
type DecisionLike = { title: string; content: string | null };
type TagLike = { name: string; color?: string | null };
type ChecklistItemLike = {
  content: string;
  isDone: boolean;
  order?: number;
  createdAt?: Timestamp;
};
type ReportLike = {
  summary: string;
  changedFiles?: string | null;
  commandsRun?: string | null;
  testResults?: string | null;
  buildResult?: string | null;
  commitHash?: string | null;
  pushedToRemote: boolean;
  nextSteps?: string | null;
  createdAt: Timestamp;
};
type GitCommitLike = {
  commitHash: string;
  commitMessage: string;
  branchName: string;
  remoteUrl?: string | null;
  pushedToRemote: boolean;
  createdAt: Timestamp;
};
type LocalLLMRunLike = {
  model: string;
  prompt: string;
  response?: string | null;
  status: string;
  errorMessage?: string | null;
  durationMs?: number | null;
  createdAt: Timestamp;
};

export interface NextPromptContext {
  projectName?: string;
  taskTitle: string;
  taskStatus?: string;
  priority?: string;
  tags?: TagLike[];
  taskDescription?: string | null;
  prompts?: PromptLike[];
  lastPrompt?: PromptLike | null;
  logs?: LogLike[];
  recentErrors: LogLike[];
  recentResponses: LogLike[];
  reports?: ReportLike[];
  localLLMRuns?: LocalLLMRunLike[];
  checklistItems?: ChecklistItemLike[];
  gitCommits?: GitCommitLike[];
  decisions: DecisionLike[];
  promptType?: NextPromptType;
  targetAI?: "Codex" | "Claude Code" | string;
}

export function isNextPromptType(value: string): value is NextPromptType {
  return NEXT_PROMPT_TYPES.includes(value as NextPromptType);
}

function toDate(value: Timestamp | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Timestamp | undefined) {
  const date = toDate(value);
  if (!date) return "날짜 없음";
  return date.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function excerpt(value: string | null | undefined, length = 240) {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "내용 없음";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function shortHash(hash: string) {
  return hash.length > 10 ? hash.slice(0, 10) : hash;
}

function formatDurationMs(value: number | null | undefined) {
  if (typeof value !== "number") return "시간 미기록";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}s`;
}

function sortByCreatedDesc<T extends { createdAt?: Timestamp }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = toDate(a.createdAt)?.getTime() ?? 0;
    const bTime = toDate(b.createdAt)?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function typeInstructions(promptType: NextPromptType) {
  switch (promptType) {
    case "Fix Error":
      return [
        "Error 로그를 먼저 재현하고 원인을 특정해줘.",
        "최소 범위로 수정하고, 기존 기능이 깨지지 않았는지 검증해줘.",
        "수정 파일, 실행한 명령어, 테스트/빌드 결과를 보고해줘.",
      ];
    case "Add Tests":
      return [
        "현재 구현을 기준으로 필요한 테스트를 추가하거나 보강해줘.",
        "테스트가 어려운 영역은 검증 가능한 대체 확인 방법을 제시해줘.",
        "실행한 테스트 명령과 결과를 보고해줘.",
      ];
    case "Refactor":
      return [
        "동작을 유지하면서 중복과 복잡도를 줄이는 범위에서 리팩토링해줘.",
        "대규모 구조 변경은 피하고, 기존 패턴과 파일 경계를 유지해줘.",
        "리팩토링 전후로 검증한 명령과 결과를 보고해줘.",
      ];
    case "Update Documentation":
      return [
        "현재 구현 상태와 실제 명령어 기준으로 문서를 업데이트해줘.",
        "존재하지 않는 기능은 문서에 추가하지 말아줘.",
        "변경한 문서 파일과 검증 결과를 보고해줘.",
      ];
    case "Commit and Push":
      return [
        "먼저 git status, git diff --check, npm run build를 확인해줘.",
        "검증이 통과하면 적절한 커밋 메시지로 커밋하고 origin main에 push해줘.",
        "커밋 해시와 최종 git status를 보고해줘.",
      ];
    case "Continue Implementation":
    default:
      return [
        "현재 Task를 이어서 구현해줘.",
        "체크리스트 미완료 항목과 최근 실행 리포트의 next steps를 우선 참고해줘.",
        "수정 파일, 실행한 명령어, 테스트/빌드 결과, 다음 권장 작업을 보고해줘.",
      ];
  }
}

// 템플릿 기반 조합: Task 상태, 기록, 체크리스트, 커밋을 포함한 다음 작업 프롬프트.
export function buildTemplatePrompt(ctx: NextPromptContext): string {
  const lines: string[] = [];
  const promptType = ctx.promptType ?? "Continue Implementation";
  const targetAI = ctx.targetAI ?? "Codex";
  const prompts = sortByCreatedDesc(
    ctx.prompts ?? (ctx.lastPrompt ? [ctx.lastPrompt] : [])
  );
  const logs = sortByCreatedDesc([
    ...(ctx.logs ?? []),
    ...(ctx.logs ? [] : ctx.recentErrors),
    ...(ctx.logs ? [] : ctx.recentResponses),
  ]);
  const errors = logs.filter((log) => log.type === "ERROR");
  const reports = sortByCreatedDesc(ctx.reports ?? []);
  const localLLMRuns = sortByCreatedDesc(ctx.localLLMRuns ?? []);
  const checklistItems = [...(ctx.checklistItems ?? [])].sort((a, b) => {
    if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
    const aTime = toDate(a.createdAt)?.getTime() ?? 0;
    const bTime = toDate(b.createdAt)?.getTime() ?? 0;
    return aTime - bTime;
  });
  const gitCommits = sortByCreatedDesc(ctx.gitCommits ?? []);
  const doneChecklist = checklistItems.filter((item) => item.isDone).length;
  const checklistPercent =
    checklistItems.length === 0
      ? 0
      : Math.round((doneChecklist / checklistItems.length) * 100);

  lines.push(`# Next AI Prompt: ${promptType}`);
  lines.push("");
  lines.push(
    `당신은 ${targetAI}에서 작업하는 AI 코딩 에이전트입니다. 아래 PromptDesk 컨텍스트를 기준으로 다음 작업을 진행해줘.`
  );
  lines.push("");

  lines.push("## 작업 컨텍스트");
  if (ctx.projectName) lines.push(`- 프로젝트: ${ctx.projectName}`);
  lines.push(`- Task: ${ctx.taskTitle}`);
  if (ctx.taskStatus) lines.push(`- 상태: ${ctx.taskStatus}`);
  if (ctx.priority) lines.push(`- Priority: ${ctx.priority}`);
  lines.push(
    `- Tags: ${
      ctx.tags && ctx.tags.length > 0
        ? ctx.tags.map((tag) => `#${tag.name}`).join(", ")
        : "없음"
    }`
  );
  lines.push(`- 목표/설명: ${excerpt(ctx.taskDescription, 500)}`);
  lines.push("");

  lines.push("## 기존 Prompts 요약");
  if (prompts.length === 0) {
    lines.push("- 저장된 프롬프트 없음");
  } else {
    for (const prompt of prompts.slice(0, 5)) {
      lines.push(
        `- ${formatDate(prompt.createdAt)} · ${prompt.targetAI}${
          prompt.isGenerated ? " · 자동생성" : ""
        }: ${excerpt(prompt.content)}`
      );
    }
  }
  lines.push("");

  lines.push("## 최근 Logs 요약");
  if (logs.length === 0) {
    lines.push("- 저장된 로그 없음");
  } else {
    for (const log of logs.slice(0, 6)) {
      lines.push(
        `- ${formatDate(log.createdAt)} · ${log.type}: ${excerpt(log.content)}`
      );
    }
  }
  lines.push("");

  if (errors.length > 0) {
    lines.push("## Error 로그 - 우선 확인");
    for (const error of errors.slice(0, 3)) {
      lines.push(`### ${formatDate(error.createdAt)}`);
      lines.push("```text");
      lines.push(error.content.trim().slice(0, 1200));
      lines.push("```");
    }
    lines.push("");
  }

  lines.push("## Execution Reports 요약");
  if (reports.length === 0) {
    lines.push("- 저장된 실행 리포트 없음");
  } else {
    for (const report of reports.slice(0, 4)) {
      lines.push(`- ${formatDate(report.createdAt)}: ${excerpt(report.summary)}`);
      if (report.changedFiles) {
        lines.push(`  - 변경 파일: ${excerpt(report.changedFiles, 220)}`);
      }
      if (report.commandsRun) {
        lines.push(`  - 실행 명령: ${excerpt(report.commandsRun, 220)}`);
      }
      if (report.testResults) {
        lines.push(`  - 테스트: ${excerpt(report.testResults, 220)}`);
      }
      if (report.buildResult) {
        lines.push(`  - 빌드: ${excerpt(report.buildResult, 220)}`);
      }
      if (report.commitHash) {
        lines.push(`  - 커밋: ${shortHash(report.commitHash)}`);
      }
      lines.push(`  - 원격 push: ${report.pushedToRemote ? "yes" : "no"}`);
      if (report.nextSteps) {
        lines.push(`  - 다음 작업: ${excerpt(report.nextSteps, 220)}`);
      }
    }
  }
  lines.push("");

  lines.push("## Local LLM Runs 요약");
  if (localLLMRuns.length === 0) {
    lines.push("- 저장된 Local LLM 실행 기록 없음");
  } else {
    for (const run of localLLMRuns.slice(0, 5)) {
      const body =
        run.status === "ERROR"
          ? run.errorMessage || run.response
          : run.response || run.errorMessage;
      lines.push(
        `- ${formatDate(run.createdAt)} · ${run.model} · ${run.status} · ${formatDurationMs(
          run.durationMs
        )}: ${excerpt(body, 240)}`
      );
      lines.push(`  - 보낸 프롬프트: ${excerpt(run.prompt, 220)}`);
    }
  }
  lines.push("");

  lines.push("## Checklist 진행 상황");
  if (checklistItems.length === 0) {
    lines.push("- 체크리스트 항목 없음");
  } else {
    lines.push(
      `- 진행률: ${doneChecklist}/${checklistItems.length} done · ${checklistPercent}%`
    );
    const openItems = checklistItems.filter((item) => !item.isDone);
    const doneItems = checklistItems.filter((item) => item.isDone);
    if (openItems.length > 0) {
      lines.push("- 미완료 항목:");
      for (const item of openItems.slice(0, 8)) {
        lines.push(`  - [ ] ${item.content}`);
      }
    }
    if (doneItems.length > 0) {
      lines.push("- 완료 항목:");
      for (const item of doneItems.slice(0, 5)) {
        lines.push(`  - [x] ${item.content}`);
      }
    }
  }
  lines.push("");

  lines.push("## Git Commit Records 요약");
  if (gitCommits.length === 0) {
    lines.push("- 연결된 Git 커밋 기록 없음");
  } else {
    for (const commit of gitCommits.slice(0, 6)) {
      lines.push(
        `- ${shortHash(commit.commitHash)} · ${commit.commitMessage} · ${
          commit.branchName
        } · ${commit.pushedToRemote ? "pushed" : "local"}`
      );
      if (commit.remoteUrl) lines.push(`  - remote: ${commit.remoteUrl}`);
    }
  }
  lines.push("");

  if (ctx.decisions.length > 0) {
    lines.push("## 프로젝트 결정 사항");
    for (const d of ctx.decisions) {
      lines.push(`- ${d.title}${d.content ? `: ${d.content}` : ""}`);
    }
    lines.push("");
  }

  lines.push("## 다음 지시");
  for (const instruction of typeInstructions(promptType)) {
    lines.push(`- ${instruction}`);
  }
  lines.push("- 기존 Priority/Tags, Checklist, Import/Export, Project Status Summary 기능을 깨지 마.");
  lines.push("- 외부 AI API 연동은 하지 마.");
  lines.push("");
  lines.push("## 보고 형식");
  lines.push("- 수정 파일 목록");
  lines.push("- 실행한 명령어와 결과");
  lines.push("- 테스트/빌드 결과");
  lines.push("- git diff 요약");
  lines.push("- 다음 권장 작업");

  return lines.join("\n");
}

// 현재 MVP는 API 연동 제외이므로 템플릿 결과를 그대로 반환한다.
export async function generateWithAI(
  ctx: NextPromptContext
): Promise<string> {
  // TODO(확장): Anthropic/OpenAI 등 호출해 ctx 기반으로 정교한 다음 프롬프트 생성
  // const res = await fetch("https://api.anthropic.com/v1/messages", {...})
  return buildTemplatePrompt(ctx);
}
