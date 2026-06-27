"use client";

import { useState } from "react";
import {
  createPromptTemplate,
  deletePromptTemplate,
  togglePromptTemplatePin,
  updatePromptTemplate,
} from "@/lib/actions";
import {
  TARGET_AIS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_META,
  type TemplateCategory,
} from "@/lib/constants";

type PromptTemplate = {
  id: string;
  title: string;
  description: string | null;
  isPinned: boolean;
  targetAI: string;
  category: string;
  content: string;
  updatedAt: Date;
};

function TemplateForm({
  template,
  onDone,
}: {
  template?: PromptTemplate;
  onDone: () => void;
}) {
  const action = template ? updatePromptTemplate : createPromptTemplate;

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone();
      }}
      className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3"
    >
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1">제목</label>
          <input
            name="title"
            defaultValue={template?.title ?? ""}
            required
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">설명</label>
          <input
            name="description"
            defaultValue={template?.description ?? ""}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1">대상 AI</label>
          <select
            name="targetAI"
            defaultValue={template?.targetAI ?? "Claude Code"}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {TARGET_AIS.map((ai) => (
              <option key={ai} value={ai}>
                {ai}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">카테고리</label>
          <select
            name="category"
            defaultValue={template?.category ?? "Feature"}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            {TEMPLATE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">내용</label>
        <textarea
          name="content"
          defaultValue={template?.content ?? ""}
          required
          rows={10}
          className="w-full mono rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-relaxed"
        />
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 hover:bg-indigo-500 text-white">
          저장
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 text-sm rounded-md border border-slate-700 hover:bg-slate-800"
        >
          취소
        </button>
      </div>
    </form>
  );
}

export default function TemplateManager({
  templates,
}: {
  templates: PromptTemplate[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">프롬프트 템플릿</h1>
          <p className="text-sm text-slate-500 mt-1">
            자주 쓰는 AI 코딩 지시문을 저장하고 작업에서 불러옵니다.
          </p>
        </div>
        <button
          onClick={() => {
            setAdding((v) => !v);
            setEditingId(null);
          }}
          className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
        >
          {adding ? "닫기" : "+ 템플릿 추가"}
        </button>
      </div>

      {adding && <TemplateForm onDone={() => setAdding(false)} />}

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center text-slate-500">
          저장된 템플릿이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const category =
              TEMPLATE_CATEGORY_META[template.category as TemplateCategory] ??
              TEMPLATE_CATEGORY_META.Other;

            return (
              <div
                key={template.id}
                className="rounded-lg border border-slate-800 bg-[#0d1320]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-medium truncate">{template.title}</h2>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded ${category.cls}`}
                      >
                        {category.label}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-600/80 text-indigo-50">
                        {template.targetAI}
                      </span>
                      {template.isPinned && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-600/80 text-amber-50">
                          고정
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-xs text-slate-500 mt-1">
                        {template.description}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-600 mt-1">
                      수정 {new Date(template.updatedAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <form action={togglePromptTemplatePin}>
                      <input type="hidden" name="id" value={template.id} />
                      <button
                        className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                        title={template.isPinned ? "핀 해제" : "핀 고정"}
                      >
                        {template.isPinned ? "해제" : "고정"}
                      </button>
                    </form>
                    <button
                      onClick={() => {
                        setEditingId((id) =>
                          id === template.id ? null : template.id
                        );
                        setAdding(false);
                      }}
                      className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                    >
                      {editingId === template.id ? "취소" : "편집"}
                    </button>
                    <form
                      action={deletePromptTemplate}
                      onSubmit={(e) => {
                        if (!confirm("이 템플릿을 삭제할까요?"))
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={template.id} />
                      <button className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-400">
                        삭제
                      </button>
                    </form>
                  </div>
                </div>
                {editingId === template.id ? (
                  <div className="p-3">
                    <TemplateForm
                      template={template}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <pre className="mono text-xs text-slate-200 whitespace-pre-wrap p-4 leading-relaxed">
                    {template.content}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
