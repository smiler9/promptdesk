// 기능 9: "다음 프롬프트" 생성
// 두 경로를 모두 제공:
//  (A) buildTemplatePrompt — API 없이 컨텍스트를 조합한 템플릿 초안 (지금 동작)
//  (B) generateWithAI       — 추후 외부 AI 연동을 끼울 확장 자리 (stub)

type PromptLike = { content: string; targetAI: string; createdAt: Date };
type LogLike = { type: string; content: string; createdAt: Date };
type DecisionLike = { title: string; content: string | null };

export interface NextPromptContext {
  taskTitle: string;
  lastPrompt?: PromptLike | null;
  recentErrors: LogLike[];
  recentResponses: LogLike[];
  decisions: DecisionLike[];
}

// (A) 템플릿 기반 조합 — 이전 프롬프트 + 최근 에러 + 결정사항을 끼워넣는다
export function buildTemplatePrompt(ctx: NextPromptContext): string {
  const lines: string[] = [];

  lines.push(`# 작업: ${ctx.taskTitle}`);
  lines.push("");
  lines.push("이전 단계 이어서 다음 작업을 진행해줘.");
  lines.push("");

  if (ctx.lastPrompt) {
    lines.push("## 직전 프롬프트");
    lines.push("```");
    lines.push(ctx.lastPrompt.content.trim());
    lines.push("```");
    lines.push("");
  }

  if (ctx.recentResponses.length > 0) {
    lines.push("## 직전 AI 응답 요약 (참고)");
    lines.push("```");
    lines.push(ctx.recentResponses[0].content.trim().slice(0, 1200));
    lines.push("```");
    lines.push("");
  }

  if (ctx.recentErrors.length > 0) {
    lines.push("## 해결해야 할 에러");
    for (const e of ctx.recentErrors.slice(0, 3)) {
      lines.push("```");
      lines.push(e.content.trim().slice(0, 800));
      lines.push("```");
    }
    lines.push("");
  }

  if (ctx.decisions.length > 0) {
    lines.push("## 지켜야 할 결정 사항");
    for (const d of ctx.decisions) {
      lines.push(`- ${d.title}${d.content ? `: ${d.content}` : ""}`);
    }
    lines.push("");
  }

  lines.push("## 다음 지시");
  lines.push(
    ctx.recentErrors.length > 0
      ? "위 에러를 먼저 수정하고, 수정한 파일 목록과 실행 명령어를 보고해줘."
      : "다음 단계를 구현하고, 수정한 파일 목록과 실행 명령어를 보고해줘."
  );

  return lines.join("\n");
}

// (B) 확장 자리 — 추후 외부 AI 연동 시 여기를 구현
// 현재 MVP는 API 연동 제외이므로 템플릿 결과를 그대로 반환한다.
export async function generateWithAI(
  ctx: NextPromptContext
): Promise<string> {
  // TODO(확장): Anthropic/OpenAI 등 호출해 ctx 기반으로 정교한 다음 프롬프트 생성
  // const res = await fetch("https://api.anthropic.com/v1/messages", {...})
  return buildTemplatePrompt(ctx);
}
