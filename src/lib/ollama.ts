const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_TIMEOUT_MS = 5000;

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
