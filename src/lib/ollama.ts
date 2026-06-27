const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_TIMEOUT_MS = 5000;
const GENERATE_TIMEOUT_MS = 120000;

export type OllamaModelDetails = {
  parent_model?: string;
  format?: string;
  family?: string;
  families?: string[] | null;
  parameter_size?: string;
  quantization_level?: string;
  context_length?: number;
  embedding_length?: number;
};

export type OllamaModel = {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: OllamaModelDetails;
  capabilities?: string[];
};

export type OllamaTagsResponse = {
  models: OllamaModel[];
};

export type OllamaResult<T> = {
  ok: boolean;
  baseUrl: string;
  message: string;
  data: T | null;
};

export type OllamaGenerateResponse = {
  model: string;
  response: string;
  created_at?: string;
  done?: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
};

function ollamaBaseUrl() {
  return (
    process.env.OLLAMA_BASE_URL?.trim().replace(/\/+$/, "") ||
    DEFAULT_OLLAMA_BASE_URL
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeModel(value: unknown): OllamaModel | null {
  if (!isRecord(value) || typeof value.name !== "string") return null;

  const model: OllamaModel = { name: value.name };
  if (typeof value.model === "string") model.model = value.model;
  if (typeof value.modified_at === "string") model.modified_at = value.modified_at;
  if (typeof value.size === "number") model.size = value.size;
  if (typeof value.digest === "string") model.digest = value.digest;
  if (isStringArray(value.capabilities)) model.capabilities = value.capabilities;

  if (isRecord(value.details)) {
    model.details = {};
    for (const key of [
      "parent_model",
      "format",
      "family",
      "parameter_size",
      "quantization_level",
    ] as const) {
      if (typeof value.details[key] === "string") {
        model.details[key] = value.details[key];
      }
    }
    if (
      Array.isArray(value.details.families) ||
      value.details.families === null
    ) {
      model.details.families = isStringArray(value.details.families)
        ? value.details.families
        : null;
    }
    if (typeof value.details.context_length === "number") {
      model.details.context_length = value.details.context_length;
    }
    if (typeof value.details.embedding_length === "number") {
      model.details.embedding_length = value.details.embedding_length;
    }
  }

  return model;
}

function errorMessage(error: unknown, baseUrl: string) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return `Ollama 연결 시간이 초과되었습니다. 서버 주소(${baseUrl})와 실행 상태를 확인하세요.`;
  }
  if (error instanceof TypeError) {
    return `Ollama 서버에 연결할 수 없습니다. ${baseUrl}에서 Ollama가 실행 중인지 확인하세요.`;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Ollama 연결 중 알 수 없는 오류가 발생했습니다.";
}

async function fetchOllamaTags(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const baseUrl = ollamaBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `Ollama가 HTTP ${response.status} 응답을 반환했습니다. 서버 상태를 확인하세요.`
      );
    }

    const payload = (await response.json()) as unknown;
    if (!isRecord(payload) || !Array.isArray(payload.models)) {
      throw new Error("Ollama 모델 목록 응답 형식이 올바르지 않습니다.");
    }

    return {
      baseUrl,
      models: payload.models
        .map(normalizeModel)
        .filter((model): model is OllamaModel => Boolean(model)),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function postOllamaGenerate({
  model,
  prompt,
  timeoutMs = GENERATE_TIMEOUT_MS,
}: {
  model: string;
  prompt: string;
  timeoutMs?: number;
}) {
  const baseUrl = ollamaBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        throw new Error("Ollama generate 응답이 올바른 JSON이 아닙니다.");
      }
    }

    if (!response.ok) {
      const ollamaError =
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : `HTTP ${response.status}`;
      throw new Error(
        `Ollama generate 요청이 실패했습니다. ${ollamaError}`
      );
    }

    if (!isRecord(payload) || typeof payload.response !== "string") {
      throw new Error("Ollama generate 응답 형식이 올바르지 않습니다.");
    }
    if (!payload.response.trim()) {
      throw new Error(
        "모델이 빈 응답을 반환했습니다. qwen2.5:3b 또는 qwen2.5vl:7b 모델을 사용해보세요."
      );
    }

    return {
      baseUrl,
      result: {
        model:
          typeof payload.model === "string"
            ? payload.model
            : model,
        response: payload.response,
        created_at:
          typeof payload.created_at === "string"
            ? payload.created_at
            : undefined,
        done: typeof payload.done === "boolean" ? payload.done : undefined,
        done_reason:
          typeof payload.done_reason === "string"
            ? payload.done_reason
            : undefined,
        total_duration:
          typeof payload.total_duration === "number"
            ? payload.total_duration
            : undefined,
        load_duration:
          typeof payload.load_duration === "number"
            ? payload.load_duration
            : undefined,
        prompt_eval_count:
          typeof payload.prompt_eval_count === "number"
            ? payload.prompt_eval_count
            : undefined,
        prompt_eval_duration:
          typeof payload.prompt_eval_duration === "number"
            ? payload.prompt_eval_duration
            : undefined,
        eval_count:
          typeof payload.eval_count === "number"
            ? payload.eval_count
            : undefined,
        eval_duration:
          typeof payload.eval_duration === "number"
            ? payload.eval_duration
            : undefined,
      } satisfies OllamaGenerateResponse,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOllamaModels(): Promise<
  OllamaResult<OllamaTagsResponse>
> {
  const baseUrl = ollamaBaseUrl();
  try {
    const { models } = await fetchOllamaTags();
    return {
      ok: true,
      baseUrl,
      message:
        models.length > 0
          ? `Ollama 모델 ${models.length}개를 불러왔습니다.`
          : "Ollama에 연결했지만 설치된 모델이 없습니다.",
      data: { models },
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl,
      message: errorMessage(error, baseUrl),
      data: null,
    };
  }
}

export async function testOllamaConnection(): Promise<
  OllamaResult<{ modelCount: number }>
> {
  const baseUrl = ollamaBaseUrl();
  try {
    const { models } = await fetchOllamaTags();
    return {
      ok: true,
      baseUrl,
      message:
        models.length > 0
          ? `Ollama 연결 성공. 사용 가능한 모델 ${models.length}개를 감지했습니다.`
          : "Ollama 연결 성공. 아직 설치된 모델은 없습니다.",
      data: { modelCount: models.length },
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl,
      message: errorMessage(error, baseUrl),
      data: null,
    };
  }
}

export async function generateWithOllama(
  model: string,
  prompt: string
): Promise<OllamaResult<OllamaGenerateResponse>> {
  const baseUrl = ollamaBaseUrl();
  const modelName = model.trim();
  const promptText = prompt.trim();
  if (!modelName) {
    return {
      ok: false,
      baseUrl,
      message: "Ollama 모델을 선택하세요.",
      data: null,
    };
  }
  if (!promptText) {
    return {
      ok: false,
      baseUrl,
      message: "실행할 프롬프트를 입력하세요.",
      data: null,
    };
  }

  try {
    const { result } = await postOllamaGenerate({
      model: modelName,
      prompt: promptText,
    });
    return {
      ok: true,
      baseUrl,
      message: "Ollama 응답을 생성했습니다.",
      data: result,
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl,
      message: errorMessage(error, baseUrl),
      data: null,
    };
  }
}
