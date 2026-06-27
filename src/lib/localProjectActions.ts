"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import {
  detectLocalProjectFromPath,
  getLocalProjects,
  localProjectDescription,
  searchLocalProjectCandidates as searchAiFileProjects,
  type LocalFileSearchProject,
} from "./localFileSearch";

type LocalProjectCandidate = LocalFileSearchProject & {
  registeredProjectId: string | null;
  registeredProjectName: string | null;
  registeredProjectLastSyncedAt: string | null;
};

function str(v: FormDataEntryValue | null): string {
  return (v ?? "").toString().trim();
}

function bool(v: FormDataEntryValue | null) {
  return str(v) === "true";
}

function signals(v: FormDataEntryValue | null) {
  const value = str(v);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function candidatePayload(formData: FormData): LocalFileSearchProject | null {
  const name = str(formData.get("name"));
  const localPath = str(formData.get("localPath"));
  if (!name || !localPath) return null;

  return {
    name,
    localPath,
    stack: str(formData.get("stack")) || null,
    hasReadme: bool(formData.get("hasReadme")),
    hasPackageJson: bool(formData.get("hasPackageJson")),
    hasGit: bool(formData.get("hasGit")),
    signals: signals(formData.get("signals")),
    source: str(formData.get("source")) === "search" ? "search" : "projects",
  };
}

async function withRegistrationState(
  candidates: LocalFileSearchProject[]
): Promise<LocalProjectCandidate[]> {
  const paths = candidates.map((candidate) => candidate.localPath);
  const existing =
    paths.length > 0
      ? await prisma.project.findMany({
          where: { localPath: { in: paths } },
          select: { id: true, name: true, localPath: true, lastSyncedAt: true },
        })
      : [];
  const existingByPath = new Map(
    existing
      .filter((project) => project.localPath)
      .map((project) => [project.localPath, project])
  );

  return candidates.map((candidate) => {
    const project = existingByPath.get(candidate.localPath);
    return {
      ...candidate,
      registeredProjectId: project?.id ?? null,
      registeredProjectName: project?.name ?? null,
      registeredProjectLastSyncedAt:
        project?.lastSyncedAt?.toISOString() ?? null,
    };
  });
}

function actionError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "ai-file-search 연동 중 오류가 발생했습니다.";
}

export async function loadLocalProjectCandidates(): Promise<{
  candidates: LocalProjectCandidate[];
  error?: string;
}> {
  try {
    const projects = await getLocalProjects();
    return { candidates: await withRegistrationState(projects) };
  } catch (error) {
    return { candidates: [], error: actionError(error) };
  }
}

export async function searchLocalProjectCandidates(formData: FormData): Promise<{
  candidates: LocalProjectCandidate[];
  error?: string;
}> {
  const query = str(formData.get("query"));
  if (!query) return { candidates: [], error: "검색어를 입력하세요." };

  try {
    const result = await searchAiFileProjects(query);
    if (result.error) return { candidates: [], error: result.error };
    return { candidates: await withRegistrationState(result.projects) };
  } catch (error) {
    return { candidates: [], error: actionError(error) };
  }
}

export async function createProjectFromLocalSync(formData: FormData) {
  const candidate = candidatePayload(formData);
  if (!candidate) return;

  const description = localProjectDescription(candidate);
  const existing = await prisma.project.findFirst({
    where: { localPath: candidate.localPath },
    select: { id: true },
  });

  if (existing) {
    await prisma.project.update({
      where: { id: existing.id },
      data: {
        localPath: candidate.localPath,
        description,
        lastSyncedAt: new Date(),
      },
    });
    revalidatePath("/");
    revalidatePath(`/projects/${existing.id}`);
    redirect(`/projects/${existing.id}`);
  }

  const project = await prisma.project.create({
    data: {
      name: candidate.name,
      localPath: candidate.localPath,
      description,
      lastSyncedAt: new Date(),
    },
    select: { id: true },
  });
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectFromLocalSync(formData: FormData) {
  const candidate = candidatePayload(formData);
  const requestedProjectId = str(formData.get("projectId"));
  if (!candidate || !requestedProjectId) return;

  const existingWithPath = await prisma.project.findFirst({
    where: {
      localPath: candidate.localPath,
      NOT: { id: requestedProjectId },
    },
    select: { id: true },
  });
  const projectId = existingWithPath?.id ?? requestedProjectId;

  await prisma.project.update({
    where: { id: projectId },
    data: {
      localPath: candidate.localPath,
      description: localProjectDescription(candidate),
      lastSyncedAt: new Date(),
    },
  });
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function resyncProjectLocalMetadata(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  if (!projectId) return;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { localPath: true },
  });
  if (!project?.localPath) {
    return { error: "연결된 localPath가 없습니다." };
  }

  const projects = await getLocalProjects();
  const candidate =
    projects.find((item) => item.localPath === project.localPath) ??
    (await detectLocalProjectFromPath(project.localPath));
  if (!candidate) {
    return {
      error:
        "같은 localPath 프로젝트를 찾지 못했습니다. 경로가 실제로 존재하는지 확인하세요.",
    };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      localPath: candidate.localPath,
      description: localProjectDescription(candidate),
      lastSyncedAt: new Date(),
    },
  });
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "로컬 프로젝트 메타데이터를 다시 동기화했습니다." };
}
