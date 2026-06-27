"use client";

import { useState } from "react";
import {
  checkOllamaConnection,
  loadOllamaModels,
} from "@/lib/ollamaActions";
import type { OllamaModel } from "@/lib/ollama";

type StatusState = {
  ok: boolean;
  baseUrl: string;
  message: string;
} | null;

function modelMeta(model: OllamaModel) {
  const parts = [
    model.details?.parameter_size,
    model.details?.quantization_level,
    model.details?.family,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "세부 정보 없음";
}

export default function OllamaStatusPanel() {
  const [status, setStatus] = useState<StatusState>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState<"test" | "models" | null>(null);

  async function testConnection() {
    setLoading("test");
    const result = await checkOllamaConnection();
    setStatus({
      ok: result.ok,
      baseUrl: result.baseUrl,
      message: result.message,
    });
    setLoading(null);
  }

  async function loadModels() {
    setLoading("models");
    const result = await loadOllamaModels();
    setStatus({
      ok: result.ok,
      baseUrl: result.baseUrl,
      message: result.message,
    });
    setModels(result.data?.models ?? []);
    setLoading(null);
  }

  return (
    <section className="mb-6 rounded-lg border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Ollama Connector
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            로컬 Ollama 서버 연결 상태와 설치된 모델을 확인합니다.
          </p>
        </div>
        {status?.baseUrl && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {status.baseUrl}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={testConnection}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-800 disabled:opacity-60 text-slate-300"
        >
          {loading === "test" ? "확인 중..." : "연결 테스트"}
        </button>
        <button
          type="button"
          onClick={loadModels}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white"
        >
          {loading === "models" ? "불러오는 중..." : "모델 목록 불러오기"}
        </button>
      </div>

      {status && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            status.ok
              ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-100"
              : "border-amber-800/60 bg-amber-950/30 text-amber-100"
          }`}
        >
          {status.message}
        </div>
      )}

      {models.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {models.map((model) => (
            <div
              key={model.name}
              className="rounded-md border border-slate-800 bg-slate-900/40 p-3"
            >
              <div className="text-sm font-medium text-slate-200 truncate">
                {model.name}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {modelMeta(model)}
              </div>
              {model.capabilities && model.capabilities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {model.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
