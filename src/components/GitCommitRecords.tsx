"use client";

import Link from "next/link";
import { useState } from "react";
import CopyButton from "./CopyButton";
import {
  createGitCommitRecord,
  deleteGitCommitRecord,
  updateGitCommitRecord,
} from "@/lib/actions";

type GitCommitRecord = {
  id: string;
  taskId: string | null;
  reportId: string | null;
  commitHash: string;
  commitMessage: string;
  branchName: string;
  remoteUrl: string | null;
  pushedToRemote: boolean;
  createdAt: Date;
  updatedAt: Date;
  task?: { id: string; title: string } | null;
  report?: { id: string; summary: string } | null;
};

type TaskOption = {
  id: string;
  title: string;
};

type ReportOption = {
  id: string;
  taskId: string;
  summary: string;
};

function shortHash(hash: string) {
  return hash.length > 10 ? hash.slice(0, 10) : hash;
}

function excerpt(value: string, length = 72) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function commitUrl(remoteUrl: string | null, hash: string) {
  if (!remoteUrl) return null;
  const trimmed = remoteUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("git@github.com:")) {
    const repoPath = trimmed
      .replace("git@github.com:", "")
      .replace(/\.git$/, "");
    return `https://github.com/${repoPath}/commit/${hash}`;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === "github.com") {
      const repoPath = url.pathname.replace(/^\//, "").replace(/\.git$/, "");
      const [owner, repo] = repoPath.split("/");
      if (owner && repo) {
        return `https://github.com/${owner}/${repo}/commit/${hash}`;
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function CommitForm({
  projectId,
  record,
  tasks,
  reports,
  lockedTaskId,
  onDone,
}: {
  projectId: string;
  record?: GitCommitRecord;
  tasks: TaskOption[];
  reports: ReportOption[];
  lockedTaskId?: string;
  onDone: () => void;
}) {
  const action = record ? updateGitCommitRecord : createGitCommitRecord;

  return (
    <form
      action={async (fd) => {
        await action(fd);
        onDone();
      }}
      className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3"
    >
      {record && <input type="hidden" name="id" value={record.id} />}
      <input type="hidden" name="projectId" value={projectId} />
      {lockedTaskId && <input type="hidden" name="taskId" value={lockedTaskId} />}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            커밋 해시
          </label>
          <input
            name="commitHash"
            defaultValue={record?.commitHash ?? ""}
            required
            className="w-full mono rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">브랜치</label>
          <input
            name="branchName"
            defaultValue={record?.branchName ?? "main"}
            className="w-full mono rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">
          커밋 메시지
        </label>
        <input
          name="commitMessage"
          defaultValue={record?.commitMessage ?? ""}
          required
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">원격 URL</label>
        <input
          name="remoteUrl"
          defaultValue={record?.remoteUrl ?? ""}
          placeholder="https://github.com/owner/repo.git"
          className="w-full mono rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {!lockedTaskId && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">작업</label>
            <select
              name="taskId"
              defaultValue={record?.taskId ?? ""}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">연결 안 함</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            실행 리포트
          </label>
          <select
            name="reportId"
            defaultValue={record?.reportId ?? ""}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="">연결 안 함</option>
            {reports.map((report) => (
              <option key={report.id} value={report.id}>
                {excerpt(report.summary)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="pushedToRemote"
          defaultChecked={record?.pushedToRemote ?? false}
          className="size-4 accent-indigo-600"
        />
        원격 push 완료
      </label>

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

export default function GitCommitRecords({
  projectId,
  records,
  tasks = [],
  reports = [],
  lockedTaskId,
}: {
  projectId: string;
  records: GitCommitRecord[];
  tasks?: TaskOption[];
  reports?: ReportOption[];
  lockedTaskId?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0d1320] p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-medium text-slate-300">
            Git Commits ({records.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            AI 작업과 반영된 Git 커밋을 연결합니다.
          </p>
        </div>
        <button
          onClick={() => {
            setAdding((v) => !v);
            setEditingId(null);
          }}
          className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {adding ? "닫기" : "+ 커밋 추가"}
        </button>
      </div>

      {adding && (
        <div className="mb-3">
          <CommitForm
            projectId={projectId}
            tasks={tasks}
            reports={reports}
            lockedTaskId={lockedTaskId}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {records.length === 0 ? (
        <p className="text-xs text-slate-600 py-4 text-center">
          연결된 Git 커밋이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => {
            const link = commitUrl(record.remoteUrl, record.commitHash);
            return (
              <article
                key={record.id}
                className="rounded-lg border border-slate-800 bg-slate-900/40"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-100">
                        {shortHash(record.commitHash)}
                      </span>
                      <CopyButton text={record.commitHash} label="해시" />
                      {record.pushedToRemote && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-600/80 text-indigo-50">
                          pushed
                        </span>
                      )}
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-300 hover:text-indigo-200"
                        >
                          GitHub
                        </a>
                      )}
                    </div>
                    <h3 className="text-sm font-medium mt-2">
                      {record.commitMessage}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-1">
                      <span className="mono">{record.branchName}</span>
                      <span>{new Date(record.createdAt).toLocaleString("ko-KR")}</span>
                      {record.task && (
                        <Link
                          href={`/tasks/${record.task.id}`}
                          className="text-indigo-300 hover:text-indigo-200"
                        >
                          {record.task.title}
                        </Link>
                      )}
                    </div>
                    {record.report && (
                      <p className="text-xs text-slate-500 mt-1">
                        Report: {excerpt(record.report.summary, 110)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId((id) =>
                          id === record.id ? null : record.id
                        );
                        setAdding(false);
                      }}
                      className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                    >
                      {editingId === record.id ? "취소" : "편집"}
                    </button>
                    <form
                      action={deleteGitCommitRecord}
                      onSubmit={(e) => {
                        if (!confirm("이 커밋 기록을 삭제할까요?"))
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={record.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <button className="text-xs px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-slate-400">
                        삭제
                      </button>
                    </form>
                  </div>
                </div>

                {editingId === record.id && (
                  <div className="p-3">
                    <CommitForm
                      projectId={projectId}
                      record={record}
                      tasks={tasks}
                      reports={reports}
                      lockedTaskId={lockedTaskId}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
