"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  TASK_STATUSES,
  TARGET_AIS,
  LOG_TYPES,
  TEMPLATE_CATEGORIES,
  type TaskStatus,
  type TargetAI,
  type LogType,
  type TemplateCategory,
} from "./constants";
import { buildTemplatePrompt } from "./nextPrompt";

function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}

function nullableStr(v: FormDataEntryValue | null): string | null {
  return str(v) || null;
}

async function resolveGitCommitLinks({
  projectId,
  taskId,
  reportId,
}: {
  projectId: string;
  taskId: string | null;
  reportId: string | null;
}) {
  let resolvedTaskId = taskId;
  let resolvedReportId = reportId;

  if (resolvedReportId) {
    const report = await prisma.taskExecutionReport.findUnique({
      where: { id: resolvedReportId },
      select: { taskId: true, task: { select: { projectId: true } } },
    });
    if (!report || report.task.projectId !== projectId) {
      resolvedReportId = null;
    } else {
      resolvedTaskId = report.taskId;
    }
  }

  if (resolvedTaskId) {
    const task = await prisma.task.findUnique({
      where: { id: resolvedTaskId },
      select: { projectId: true },
    });
    if (!task || task.projectId !== projectId) {
      resolvedTaskId = null;
      resolvedReportId = null;
    }
  }

  return { taskId: resolvedTaskId, reportId: resolvedReportId };
}

function revalidateGitCommitPaths({
  projectId,
  taskId,
  previousTaskId,
}: {
  projectId: string;
  taskId?: string | null;
  previousTaskId?: string | null;
}) {
  revalidatePath(`/projects/${projectId}`);
  if (taskId) revalidatePath(`/tasks/${taskId}`);
  if (previousTaskId && previousTaskId !== taskId) {
    revalidatePath(`/tasks/${previousTaskId}`);
  }
}

/* ---------- Project ---------- */

export async function createProject(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) return;
  const description = str(formData.get("description")) || null;
  const p = await prisma.project.create({ data: { name, description } });
  revalidatePath("/");
  redirect(`/projects/${p.id}`);
}

export async function updateProject(formData: FormData) {
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  if (!id || !name) return;
  const description = str(formData.get("description")) || null;
  await prisma.project.update({ where: { id }, data: { name, description } });
  revalidatePath("/");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.project.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

/* ---------- Task ---------- */

export async function createTask(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  const title = str(formData.get("title"));
  if (!projectId || !title) return;
  const count = await prisma.task.count({ where: { projectId } });
  await prisma.task.create({
    data: { projectId, title, order: count },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskStatus(formData: FormData) {
  const id = str(formData.get("id"));
  const status = str(formData.get("status")) as TaskStatus;
  if (!id || !TASK_STATUSES.includes(status)) return;
  const t = await prisma.task.update({
    where: { id },
    data: { status },
    select: { projectId: true },
  });
  revalidatePath(`/projects/${t.projectId}`);
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/");
}

export async function updateTask(formData: FormData) {
  const id = str(formData.get("id"));
  const title = str(formData.get("title"));
  if (!id || !title) return;
  const description = str(formData.get("description")) || null;
  const t = await prisma.task.update({
    where: { id },
    data: { title, description },
    select: { projectId: true },
  });
  revalidatePath(`/projects/${t.projectId}`);
  revalidatePath(`/tasks/${id}`);
}

export async function deleteTask(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  const t = await prisma.task.delete({
    where: { id },
    select: { projectId: true },
  });
  revalidatePath(`/projects/${t.projectId}`);
  redirect(`/projects/${t.projectId}`);
}

/* ---------- Prompt ---------- */

export async function createPrompt(formData: FormData) {
  const taskId = str(formData.get("taskId"));
  const content = str(formData.get("content"));
  const targetAI = str(formData.get("targetAI")) as TargetAI;
  if (!taskId || !content) return;
  await prisma.prompt.create({
    data: {
      taskId,
      content,
      targetAI: TARGET_AIS.includes(targetAI) ? targetAI : "Claude",
    },
  });
  revalidatePath(`/tasks/${taskId}`);
}

export async function updatePrompt(formData: FormData) {
  const id = str(formData.get("id"));
  const taskId = str(formData.get("taskId"));
  const content = str(formData.get("content"));
  const targetAI = str(formData.get("targetAI")) as TargetAI;
  if (!id || !content) return;
  await prisma.prompt.update({
    where: { id },
    data: {
      content,
      targetAI: TARGET_AIS.includes(targetAI) ? targetAI : "Claude",
    },
  });
  revalidatePath(`/tasks/${taskId}`);
}

export async function deletePrompt(formData: FormData) {
  const id = str(formData.get("id"));
  const taskId = str(formData.get("taskId"));
  if (!id) return;
  await prisma.prompt.delete({ where: { id } });
  revalidatePath(`/tasks/${taskId}`);
}

/* ---------- PromptTemplate ---------- */

export async function createPromptTemplate(formData: FormData) {
  const title = str(formData.get("title"));
  const description = str(formData.get("description")) || null;
  const targetAI = str(formData.get("targetAI")) as TargetAI;
  const category = str(formData.get("category")) as TemplateCategory;
  const content = str(formData.get("content"));
  if (!title || !content) return;

  await prisma.promptTemplate.create({
    data: {
      title,
      description,
      targetAI: TARGET_AIS.includes(targetAI) ? targetAI : "Claude Code",
      category: TEMPLATE_CATEGORIES.includes(category) ? category : "Other",
      content,
    },
  });
  revalidatePath("/templates");
}

export async function updatePromptTemplate(formData: FormData) {
  const id = str(formData.get("id"));
  const title = str(formData.get("title"));
  const description = str(formData.get("description")) || null;
  const targetAI = str(formData.get("targetAI")) as TargetAI;
  const category = str(formData.get("category")) as TemplateCategory;
  const content = str(formData.get("content"));
  if (!id || !title || !content) return;

  await prisma.promptTemplate.update({
    where: { id },
    data: {
      title,
      description,
      targetAI: TARGET_AIS.includes(targetAI) ? targetAI : "Claude Code",
      category: TEMPLATE_CATEGORIES.includes(category) ? category : "Other",
      content,
    },
  });
  revalidatePath("/templates");
}

export async function deletePromptTemplate(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.promptTemplate.delete({ where: { id } });
  revalidatePath("/templates");
}

/* ---------- LogEntry ---------- */

export async function createLog(formData: FormData) {
  const taskId = str(formData.get("taskId"));
  const type = str(formData.get("type")) as LogType;
  const content = str(formData.get("content"));
  if (!taskId || !content) return;
  await prisma.logEntry.create({
    data: {
      taskId,
      type: LOG_TYPES.includes(type) ? type : "NOTE",
      content,
    },
  });
  revalidatePath(`/tasks/${taskId}`);
}

export async function updateLog(formData: FormData) {
  const id = str(formData.get("id"));
  const taskId = str(formData.get("taskId"));
  const content = str(formData.get("content"));
  if (!id || !content) return;
  await prisma.logEntry.update({ where: { id }, data: { content } });
  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteLog(formData: FormData) {
  const id = str(formData.get("id"));
  const taskId = str(formData.get("taskId"));
  if (!id) return;
  await prisma.logEntry.delete({ where: { id } });
  revalidatePath(`/tasks/${taskId}`);
}

/* ---------- TaskExecutionReport ---------- */

export async function createTaskExecutionReport(formData: FormData) {
  const taskId = str(formData.get("taskId"));
  const summary = str(formData.get("summary"));
  if (!taskId || !summary) return;

  await prisma.taskExecutionReport.create({
    data: {
      taskId,
      summary,
      changedFiles: nullableStr(formData.get("changedFiles")),
      commandsRun: nullableStr(formData.get("commandsRun")),
      testResults: nullableStr(formData.get("testResults")),
      buildResult: nullableStr(formData.get("buildResult")),
      commitHash: nullableStr(formData.get("commitHash")),
      pushedToRemote: formData.get("pushedToRemote") === "on",
      nextSteps: nullableStr(formData.get("nextSteps")),
    },
  });
  revalidatePath(`/tasks/${taskId}`);
}

export async function updateTaskExecutionReport(formData: FormData) {
  const id = str(formData.get("id"));
  const taskId = str(formData.get("taskId"));
  const summary = str(formData.get("summary"));
  if (!id || !taskId || !summary) return;

  await prisma.taskExecutionReport.update({
    where: { id },
    data: {
      summary,
      changedFiles: nullableStr(formData.get("changedFiles")),
      commandsRun: nullableStr(formData.get("commandsRun")),
      testResults: nullableStr(formData.get("testResults")),
      buildResult: nullableStr(formData.get("buildResult")),
      commitHash: nullableStr(formData.get("commitHash")),
      pushedToRemote: formData.get("pushedToRemote") === "on",
      nextSteps: nullableStr(formData.get("nextSteps")),
    },
  });
  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteTaskExecutionReport(formData: FormData) {
  const id = str(formData.get("id"));
  const taskId = str(formData.get("taskId"));
  if (!id || !taskId) return;

  await prisma.taskExecutionReport.delete({ where: { id } });
  revalidatePath(`/tasks/${taskId}`);
}

/* ---------- GitCommitRecord ---------- */

export async function createGitCommitRecord(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  const commitHash = str(formData.get("commitHash"));
  const commitMessage = str(formData.get("commitMessage"));
  const branchName = str(formData.get("branchName")) || "main";
  const remoteUrl = nullableStr(formData.get("remoteUrl"));
  const links = await resolveGitCommitLinks({
    projectId,
    taskId: nullableStr(formData.get("taskId")),
    reportId: nullableStr(formData.get("reportId")),
  });

  if (!projectId || !commitHash || !commitMessage) return;

  await prisma.gitCommitRecord.create({
    data: {
      projectId,
      taskId: links.taskId,
      reportId: links.reportId,
      commitHash,
      commitMessage,
      branchName,
      remoteUrl,
      pushedToRemote: formData.get("pushedToRemote") === "on",
    },
  });

  revalidateGitCommitPaths({ projectId, taskId: links.taskId });
}

export async function updateGitCommitRecord(formData: FormData) {
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  const commitHash = str(formData.get("commitHash"));
  const commitMessage = str(formData.get("commitMessage"));
  const branchName = str(formData.get("branchName")) || "main";
  const remoteUrl = nullableStr(formData.get("remoteUrl"));
  if (!id || !projectId || !commitHash || !commitMessage) return;

  const existing = await prisma.gitCommitRecord.findUnique({
    where: { id },
    select: { taskId: true },
  });
  const links = await resolveGitCommitLinks({
    projectId,
    taskId: nullableStr(formData.get("taskId")),
    reportId: nullableStr(formData.get("reportId")),
  });

  await prisma.gitCommitRecord.update({
    where: { id },
    data: {
      taskId: links.taskId,
      reportId: links.reportId,
      commitHash,
      commitMessage,
      branchName,
      remoteUrl,
      pushedToRemote: formData.get("pushedToRemote") === "on",
    },
  });

  revalidateGitCommitPaths({
    projectId,
    taskId: links.taskId,
    previousTaskId: existing?.taskId,
  });
}

export async function deleteGitCommitRecord(formData: FormData) {
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  if (!id || !projectId) return;

  const existing = await prisma.gitCommitRecord.findUnique({
    where: { id },
    select: { taskId: true },
  });
  await prisma.gitCommitRecord.delete({ where: { id } });

  revalidateGitCommitPaths({ projectId, taskId: existing?.taskId });
}

/* ---------- Decision ---------- */

export async function createDecision(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  const title = str(formData.get("title"));
  if (!projectId || !title) return;
  const content = str(formData.get("content")) || null;
  await prisma.decision.create({ data: { projectId, title, content } });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteDecision(formData: FormData) {
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  if (!id) return;
  await prisma.decision.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
}

/* ---------- 기능 9: 다음 프롬프트 생성 (템플릿 조합) ---------- */

export async function generateNextPrompt(formData: FormData) {
  const taskId = str(formData.get("taskId"));
  if (!taskId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { decisions: true } },
      prompts: { orderBy: { createdAt: "desc" }, take: 1 },
      logs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!task) return;

  const draft = buildTemplatePrompt({
    taskTitle: task.title,
    lastPrompt: task.prompts[0] ?? null,
    recentErrors: task.logs.filter((l) => l.type === "ERROR"),
    recentResponses: task.logs.filter((l) => l.type === "RESPONSE"),
    decisions: task.project.decisions,
  });

  await prisma.prompt.create({
    data: {
      taskId,
      content: draft,
      targetAI: task.prompts[0]?.targetAI ?? "Claude Code",
      isGenerated: true,
    },
  });
  revalidatePath(`/tasks/${taskId}`);
}
