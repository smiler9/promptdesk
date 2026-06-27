"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TARGET_AIS,
  LOG_TYPES,
  TEMPLATE_CATEGORIES,
  type TaskStatus,
  type TaskPriority,
  type TargetAI,
  type LogType,
  type TemplateCategory,
} from "./constants";
import {
  buildTemplatePrompt,
  isNextPromptType,
  type NextPromptType,
} from "./nextPrompt";

function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}

function nullableStr(v: FormDataEntryValue | null): string | null {
  return str(v) || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableStringField(value: unknown): string | null {
  return stringField(value) || null;
}

function booleanField(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function integerField(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : fallback;
}

function arrayField(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function dateField(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function tagName(v: FormDataEntryValue | null): string {
  return str(v).replace(/\s+/g, "-").toLowerCase();
}

function tagColor(v: FormDataEntryValue | null): string | null {
  const color = str(v);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
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

function revalidatePinnedPaths() {
  revalidatePath("/");
  revalidatePath("/search");
}

function revalidateTaskPaths({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/tasks/${taskId}`);
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

export async function toggleProjectPin(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { isPinned: true },
  });
  if (!project) return;
  await prisma.project.update({
    where: { id },
    data: { isPinned: !project.isPinned },
  });
  revalidatePinnedPaths();
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.project.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

export async function importProjectFromJson(formData: FormData) {
  const file = formData.get("projectFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "가져올 JSON 파일을 선택하세요." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { error: "JSON 파일을 읽을 수 없습니다." };
  }

  if (!isRecord(parsed) || !isRecord(parsed.project)) {
    return { error: "PromptDesk Export JSON 구조가 아닙니다." };
  }

  const projectInput = parsed.project;
  const projectName = stringField(projectInput.name);
  const taskInputs = arrayField(parsed.tasks);
  if (!projectName || !Array.isArray(parsed.tasks)) {
    return { error: "필수 데이터(project.name, tasks)가 없습니다." };
  }

  let importedProjectId = "";

  try {
    const importedProject = await prisma.$transaction(async (tx) => {
      const taskIdMap = new Map<string, string>();
      const reportIdMap = new Map<string, string>();
      const reportTaskIdMap = new Map<string, string>();

      const project = await tx.project.create({
        data: {
          name: `${projectName} (Imported)`,
          description: nullableStringField(projectInput.description),
          isPinned: booleanField(projectInput.isPinned),
          createdAt: dateField(projectInput.createdAt),
          updatedAt: dateField(projectInput.updatedAt),
        },
        select: { id: true },
      });

      for (const decision of arrayField(parsed.decisions)) {
        const title = stringField(decision.title);
        if (!title) continue;
        await tx.decision.create({
          data: {
            projectId: project.id,
            title,
            content: nullableStringField(decision.content),
            createdAt: dateField(decision.createdAt),
            updatedAt: dateField(decision.updatedAt),
          },
        });
      }

      for (const task of taskInputs) {
        const title = stringField(task.title);
        if (!title) throw new Error("작업 제목이 없는 항목이 있습니다.");

        const status = stringField(task.status) as TaskStatus;
        const createdTask = await tx.task.create({
          data: {
            projectId: project.id,
            title,
            description: nullableStringField(task.description),
            isPinned: booleanField(task.isPinned),
            priority: TASK_PRIORITIES.includes(
              stringField(task.priority) as TaskPriority
            )
              ? stringField(task.priority)
              : "MEDIUM",
            status: TASK_STATUSES.includes(status) ? status : "TODO",
            order: typeof task.order === "number" ? task.order : 0,
            createdAt: dateField(task.createdAt),
            updatedAt: dateField(task.updatedAt),
          },
          select: { id: true },
        });

        const oldTaskId = stringField(task.id);
        if (oldTaskId) taskIdMap.set(oldTaskId, createdTask.id);

        for (const tag of arrayField(task.tags)) {
          const name = stringField(tag.name).replace(/\s+/g, "-").toLowerCase();
          if (!name) continue;
          await tx.taskTag.upsert({
            where: {
              taskId_name: {
                taskId: createdTask.id,
                name,
              },
            },
            update: {
              color: nullableStringField(tag.color),
              updatedAt: dateField(tag.updatedAt),
            },
            create: {
              taskId: createdTask.id,
              name,
              color: nullableStringField(tag.color),
              createdAt: dateField(tag.createdAt),
              updatedAt: dateField(tag.updatedAt),
            },
          });
        }

        const checklistItems = arrayField(task.checklistItems);
        const checklistFallback = arrayField(task.checklist);
        const importedChecklistItems =
          checklistItems.length > 0 ? checklistItems : checklistFallback;
        for (const item of importedChecklistItems) {
          const content = stringField(item.content);
          if (!content) continue;
          await tx.taskChecklistItem.create({
            data: {
              taskId: createdTask.id,
              content,
              isDone: booleanField(item.isDone),
              order: integerField(item.order),
              createdAt: dateField(item.createdAt),
              updatedAt: dateField(item.updatedAt),
            },
          });
        }

        for (const prompt of arrayField(task.prompts)) {
          const content = stringField(prompt.content);
          if (!content) continue;
          const targetAI = stringField(prompt.targetAI) as TargetAI;
          await tx.prompt.create({
            data: {
              taskId: createdTask.id,
              content,
              targetAI: TARGET_AIS.includes(targetAI) ? targetAI : "Claude",
              isGenerated: booleanField(prompt.isGenerated),
              createdAt: dateField(prompt.createdAt),
              updatedAt: dateField(prompt.updatedAt),
            },
          });
        }

        for (const log of arrayField(task.logs)) {
          const content = stringField(log.content);
          if (!content) continue;
          const type = stringField(log.type) as LogType;
          await tx.logEntry.create({
            data: {
              taskId: createdTask.id,
              content,
              type: LOG_TYPES.includes(type) ? type : "NOTE",
              createdAt: dateField(log.createdAt),
              updatedAt: dateField(log.updatedAt),
            },
          });
        }

        for (const report of arrayField(task.reports)) {
          const summary = stringField(report.summary);
          if (!summary) continue;
          const createdReport = await tx.taskExecutionReport.create({
            data: {
              taskId: createdTask.id,
              summary,
              changedFiles: nullableStringField(report.changedFiles),
              commandsRun: nullableStringField(report.commandsRun),
              testResults: nullableStringField(report.testResults),
              buildResult: nullableStringField(report.buildResult),
              commitHash: nullableStringField(report.commitHash),
              pushedToRemote: booleanField(report.pushedToRemote),
              nextSteps: nullableStringField(report.nextSteps),
              createdAt: dateField(report.createdAt),
              updatedAt: dateField(report.updatedAt),
            },
            select: { id: true },
          });

          const oldReportId = stringField(report.id);
          if (oldReportId) {
            reportIdMap.set(oldReportId, createdReport.id);
            reportTaskIdMap.set(oldReportId, createdTask.id);
          }
        }
      }

      const commitInputs = new Map<string, Record<string, unknown>>();
      for (const commit of arrayField(parsed.gitCommits)) {
        const key = stringField(commit.id) || stringField(commit.commitHash);
        if (key) commitInputs.set(key, commit);
      }
      for (const task of taskInputs) {
        for (const commit of arrayField(task.gitCommits)) {
          const key = stringField(commit.id) || stringField(commit.commitHash);
          if (key && !commitInputs.has(key)) commitInputs.set(key, commit);
        }
      }

      for (const commit of commitInputs.values()) {
        const commitHash = stringField(commit.commitHash);
        const commitMessage = stringField(commit.commitMessage);
        if (!commitHash || !commitMessage) continue;

        const oldReportId = stringField(commit.reportId);
        const mappedReportId = oldReportId
          ? reportIdMap.get(oldReportId) ?? null
          : null;
        const oldTaskId = stringField(commit.taskId);
        const mappedTaskId =
          (oldTaskId ? taskIdMap.get(oldTaskId) : null) ??
          (oldReportId ? reportTaskIdMap.get(oldReportId) : null) ??
          null;

        await tx.gitCommitRecord.create({
          data: {
            projectId: project.id,
            taskId: mappedTaskId,
            reportId: mappedReportId,
            commitHash,
            commitMessage,
            branchName: stringField(commit.branchName) || "main",
            remoteUrl: nullableStringField(commit.remoteUrl),
            pushedToRemote: booleanField(commit.pushedToRemote),
            createdAt: dateField(commit.createdAt),
            updatedAt: dateField(commit.updatedAt),
          },
        });
      }

      return project;
    });

    importedProjectId = importedProject.id;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "프로젝트를 가져오는 중 오류가 발생했습니다.",
    };
  }

  revalidatePath("/");
  redirect(`/projects/${importedProjectId}`);
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

export async function updateTaskPriority(formData: FormData) {
  const id = str(formData.get("id"));
  const priority = str(formData.get("priority")) as TaskPriority;
  if (!id || !TASK_PRIORITIES.includes(priority)) return;
  const task = await prisma.task.update({
    where: { id },
    data: { priority },
    select: { projectId: true },
  });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/search");
}

export async function toggleTaskPin(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  const task = await prisma.task.findUnique({
    where: { id },
    select: { projectId: true, isPinned: true },
  });
  if (!task) return;
  await prisma.task.update({
    where: { id },
    data: { isPinned: !task.isPinned },
  });
  revalidatePinnedPaths();
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/tasks/${id}`);
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

export async function createTaskTag(formData: FormData) {
  const taskId = str(formData.get("taskId"));
  const name = tagName(formData.get("name"));
  const color = tagColor(formData.get("color"));
  if (!taskId || !name) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return;

  await prisma.taskTag.upsert({
    where: { taskId_name: { taskId, name } },
    update: { color },
    create: { taskId, name, color },
  });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/search");
}

export async function deleteTaskTag(formData: FormData) {
  const id = str(formData.get("id"));
  const taskId = str(formData.get("taskId"));
  if (!id || !taskId) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return;

  await prisma.taskTag.delete({ where: { id } });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/search");
}

export async function createTaskChecklistItem(formData: FormData) {
  const taskId = str(formData.get("taskId"));
  const content = str(formData.get("content"));
  if (!taskId || !content) return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return;

  const count = await prisma.taskChecklistItem.count({ where: { taskId } });
  await prisma.taskChecklistItem.create({
    data: { taskId, content, order: count },
  });
  revalidateTaskPaths({ projectId: task.projectId, taskId });
}

export async function toggleTaskChecklistItem(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;

  const item = await prisma.taskChecklistItem.findUnique({
    where: { id },
    select: {
      isDone: true,
      taskId: true,
      task: { select: { projectId: true } },
    },
  });
  if (!item) return;

  await prisma.taskChecklistItem.update({
    where: { id },
    data: { isDone: !item.isDone },
  });
  revalidateTaskPaths({ projectId: item.task.projectId, taskId: item.taskId });
}

export async function updateTaskChecklistItem(formData: FormData) {
  const id = str(formData.get("id"));
  const content = str(formData.get("content"));
  if (!id || !content) return;

  const item = await prisma.taskChecklistItem.findUnique({
    where: { id },
    select: {
      taskId: true,
      task: { select: { projectId: true } },
    },
  });
  if (!item) return;

  await prisma.taskChecklistItem.update({
    where: { id },
    data: { content },
  });
  revalidateTaskPaths({ projectId: item.task.projectId, taskId: item.taskId });
}

export async function deleteTaskChecklistItem(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;

  const item = await prisma.taskChecklistItem.findUnique({
    where: { id },
    select: {
      taskId: true,
      task: { select: { projectId: true } },
    },
  });
  if (!item) return;

  await prisma.taskChecklistItem.delete({ where: { id } });
  revalidateTaskPaths({ projectId: item.task.projectId, taskId: item.taskId });
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
  const isGenerated = formData.get("isGenerated") === "true";
  if (!taskId || !content) return;
  await prisma.prompt.create({
    data: {
      taskId,
      content,
      targetAI: TARGET_AIS.includes(targetAI) ? targetAI : "Claude",
      isGenerated,
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

export async function togglePromptTemplatePin(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  const template = await prisma.promptTemplate.findUnique({
    where: { id },
    select: { isPinned: true },
  });
  if (!template) return;
  await prisma.promptTemplate.update({
    where: { id },
    data: { isPinned: !template.isPinned },
  });
  revalidatePinnedPaths();
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
  const promptTypeInput = str(formData.get("promptType"));
  const promptType: NextPromptType = isNextPromptType(promptTypeInput)
    ? promptTypeInput
    : "Continue Implementation";
  const targetAIInput = str(formData.get("targetAI"));
  const targetAI = TARGET_AIS.includes(targetAIInput as TargetAI)
    ? (targetAIInput as TargetAI)
    : "Codex";

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { decisions: true } },
      tags: { orderBy: { name: "asc" } },
      prompts: { orderBy: { createdAt: "desc" }, take: 5 },
      logs: { orderBy: { createdAt: "desc" } },
      reports: { orderBy: { createdAt: "desc" }, take: 4 },
      checklistItems: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      gitCommits: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });
  if (!task) return;

  const draft = buildTemplatePrompt({
    projectName: task.project.name,
    taskTitle: task.title,
    taskStatus: task.status,
    priority: task.priority,
    tags: task.tags,
    taskDescription: task.description,
    prompts: task.prompts,
    lastPrompt: task.prompts[0] ?? null,
    logs: task.logs,
    recentErrors: task.logs.filter((l) => l.type === "ERROR"),
    recentResponses: task.logs.filter((l) => l.type === "RESPONSE"),
    reports: task.reports,
    checklistItems: task.checklistItems,
    gitCommits: task.gitCommits,
    decisions: task.project.decisions,
    promptType,
    targetAI,
  });

  await prisma.prompt.create({
    data: {
      taskId,
      content: draft,
      targetAI,
      isGenerated: true,
    },
  });
  revalidatePath(`/tasks/${taskId}`);
}
