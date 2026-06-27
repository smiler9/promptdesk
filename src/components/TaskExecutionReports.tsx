"use client";

import { useState } from "react";
import {
  createTaskExecutionReport,
  deleteTaskExecutionReport,
  updateTaskExecutionReport,
} from "@/lib/actions";

type TaskExecutionReport = {
  id: string;
  summary: string;
  changedFiles: string | null;
  commandsRun: string | null;
  testResults: string | null;
  buildResult: string | null;
  commitHash: string | null;
  pushedToRemote: boolean;
  nextSteps: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function ReportTextarea({
  name,
  label,
  defaultValue,
  rows = 4,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        className="w-full mono rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-relaxed"
      />
    </div>
  );
}

function ReportForm({
  taskId,
  report,
  onDone,
}: {
  taskId: string;
  report?: TaskExecutionReport;
  onDone: () => void;
}) {
  const action = report
    ? updateTaskExecutionReport
    : createTaskExecutionReport;

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone();
      }}
      className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3"
    >
      {report && <input type="hidden" name="id" value={report.id} />}
      <input type="hidden" name="taskId" value={taskId} />

      <div>
        <label className="block text-xs text-slate-400 mb-1">요약</label>
        <textarea
          name="summary"
          defaultValue={report?.summary ?? ""}
          required
          rows={3}
          placeholder="무엇을 완료했고 어떤 상태인지 요약하세요."
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
      </div>

      <ReportTextarea
        name="changedFiles"
        label="변경 파일"
        defaultValue={report?.changedFiles}
      />
      <ReportTextarea
        name="commandsRun"
        label="실행한 명령어"
        defaultValue={report?.commandsRun}
      />
      <ReportTextarea
        name="testResults"
        label="테스트 결과"
        defaultValue={report?.testResults}
      />
      <ReportTextarea
        name="buildResult"
        label="빌드 결과"
        defaultValue={report?.buildResult}
        rows={3}
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            커밋 해시
          </label>
          <input
            name="commitHash"
            defaultValue={report?.commitHash ?? ""}
            placeholder="선택 입력"
            className="w-full mono rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          />
        </div>
        <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="pushedToRemote"
            defaultChecked={report?.pushedToRemote ?? false}
            className="size-4 accent-indigo-600"
          />
          원격 push 완료
        </label>
      </div>

      <ReportTextarea
        name="nextSteps"
        label="다음 단계"
        defaultValue={report?.nextSteps}
      />

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

function ReportBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;

  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-1">{label}</div>
      <pre className="mono text-xs text-slate-200 whitespace-pre-wrap rounded-md bg-slate-950 border border-slate-800 px-3 py-2 leading-relaxed">
        {value}
      </pre>
    </div>
  );
}

export default function TaskExecutionReports({
  taskId,
  reports,
}: {
  taskId: string;
  reports: TaskExecutionReport[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Execution Reports ({reports.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            AI 작업 완료 보고를 Task별 구조화 기록으로 저장합니다.
          </p>
        </div>
        <button
          onClick={() => {
            setAdding((v) => !v);
            setEditingId(null);
          }}
          className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {adding ? "닫기" : "+ 리포트 추가"}
        </button>
      </div>

      {adding && (
        <div className="mb-3">
          <ReportForm taskId={taskId} onDone={() => setAdding(false)} />
        </div>
      )}

      {reports.length === 0 ? (
        <p className="text-xs text-slate-600 py-4 text-center">
          저장된 실행 리포트가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <article
              key={report.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {index === 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-600/80 text-emerald-50">
                        최신
                      </span>
                    )}
                    {report.pushedToRemote ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-600/80 text-indigo-50">
                        pushed
                      </span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">
                        local
                      </span>
                    )}
                    {report.commitHash && (
                      <span className="mono text-[11px] text-slate-400">
                        {report.commitHash}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    작성 {new Date(report.createdAt).toLocaleString("ko-KR")}
                    {" · "}
                    수정 {new Date(report.updatedAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditingId((id) =>
                        id === report.id ? null : report.id
                      );
                      setAdding(false);
                    }}
                    className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                  >
                    {editingId === report.id ? "취소" : "편집"}
                  </button>
                  <form
                    action={deleteTaskExecutionReport}
                    onSubmit={(e) => {
                      if (!confirm("이 실행 리포트를 삭제할까요?"))
                        e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={report.id} />
                    <input type="hidden" name="taskId" value={taskId} />
                    <button className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-400">
                      삭제
                    </button>
                  </form>
                </div>
              </div>

              {editingId === report.id ? (
                <div className="p-3">
                  <ReportForm
                    taskId={taskId}
                    report={report}
                    onDone={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="space-y-3 p-3">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">요약</div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">
                      {report.summary}
                    </p>
                  </div>
                  <ReportBlock label="변경 파일" value={report.changedFiles} />
                  <ReportBlock
                    label="실행한 명령어"
                    value={report.commandsRun}
                  />
                  <ReportBlock label="테스트 결과" value={report.testResults} />
                  <ReportBlock label="빌드 결과" value={report.buildResult} />
                  <ReportBlock label="다음 단계" value={report.nextSteps} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
