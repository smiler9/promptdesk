import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_CWD = "/Users/lahyunhwa/ai-file-search";
const DEFAULT_PYTHON = "/Users/lahyunhwa/ai-file-search/.venv/bin/python";
const DEFAULT_CLI = "cli.py";

export type LocalFileSearchProject = {
  name: string;
  localPath: string;
  stack: string | null;
  hasReadme: boolean;
  hasPackageJson: boolean;
  hasGit: boolean;
  signals: string[];
  source: "projects" | "search";
  matchedFiles?: LocalFileSearchResult[];
};

export type LocalFileSearchResult = {
  path: string;
  name: string;
  score: number | null;
};

export class LocalFileSearchError extends Error {
  stderr: string;

  constructor(message: string, stderr = "") {
    super(message);
    this.name = "LocalFileSearchError";
    this.stderr = stderr;
  }
}

function settings() {
  return {
    cwd: process.env.LOCAL_FILE_SEARCH_CWD || DEFAULT_CWD,
    python: process.env.LOCAL_FILE_SEARCH_PYTHON || DEFAULT_PYTHON,
    cli: process.env.LOCAL_FILE_SEARCH_CLI || DEFAULT_CLI,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function boolValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function signalsValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function inferStack({
  hasPackageJson,
  signals,
}: {
  hasPackageJson: boolean;
  signals: string[];
}) {
  const stack = new Set<string>();
  if (hasPackageJson || signals.includes("package.json")) stack.add("Node.js");
  if (
    signals.includes("pyproject.toml") ||
    signals.includes("requirements.txt")
  ) {
    stack.add("Python");
  }
  if (signals.includes("Cargo.toml")) stack.add("Rust");
  if (signals.includes("go.mod")) stack.add("Go");
  if (
    signals.includes("pom.xml") ||
    signals.includes("build.gradle")
  ) {
    stack.add("Java");
  }
  if (signals.includes("Gemfile")) stack.add("Ruby");
  return stack.size > 0 ? [...stack].join(", ") : null;
}

function normalizeProject(
  value: unknown,
  source: "projects" | "search"
): LocalFileSearchProject | null {
  if (!isRecord(value)) return null;

  const localPath =
    stringValue(value.localPath) ||
    stringValue(value.path) ||
    stringValue(value.root);
  if (!localPath) return null;

  const signals = signalsValue(value.signals);
  const hasPackageJson =
    boolValue(value.hasPackageJson) || boolValue(value.has_package_json);
  const hasReadme = boolValue(value.hasReadme) || boolValue(value.has_readme);
  const hasGit = boolValue(value.hasGit) || boolValue(value.has_git);

  return {
    name: stringValue(value.name) || path.basename(localPath),
    localPath,
    stack:
      stringValue(value.stack) ||
      stringValue(value.type) ||
      inferStack({ hasPackageJson, signals }),
    hasReadme,
    hasPackageJson,
    hasGit,
    signals,
    source,
  };
}

function normalizeSearchResult(value: unknown): LocalFileSearchResult | null {
  if (!isRecord(value)) return null;
  const resultPath = stringValue(value.path);
  if (!resultPath) return null;
  const score = typeof value.score === "number" ? value.score : null;
  return {
    path: resultPath,
    name: stringValue(value.name) || path.basename(resultPath),
    score,
  };
}

function friendlyError(
  error: unknown,
  command: { cwd: string; python: string; cli: string }
) {
  if (error instanceof LocalFileSearchError) return error;
  if (isRecord(error) && stringValue(error.code) === "ENOENT") {
    return new LocalFileSearchError(
      `ai-file-search 실행 파일을 찾을 수 없습니다. Python 경로를 확인하세요: ${command.python}`
    );
  }
  const details = isRecord(error)
    ? [stringValue(error.message), stringValue(error.stderr)]
        .filter(Boolean)
        .join("\n")
    : "";
  const message =
    details ||
    `ai-file-search CLI를 실행하지 못했습니다. cwd=${command.cwd}, cli=${command.cli}`;
  return new LocalFileSearchError(message);
}

async function runLocalFileSearch(args: string[]) {
  const command = settings();
  const { cwd, python, cli } = command;

  try {
    const { stdout, stderr } = await execFileAsync(python, [cli, ...args], {
      cwd,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
    });
    const json = stdout.trim();
    if (!json) {
      throw new LocalFileSearchError(
        "ai-file-search CLI가 JSON 출력을 반환하지 않았습니다.",
        stderr
      );
    }
    try {
      return JSON.parse(json) as unknown;
    } catch {
      throw new LocalFileSearchError(
        "ai-file-search CLI 출력이 올바른 JSON이 아닙니다.",
        stderr || json.slice(0, 500)
      );
    }
  } catch (error) {
    throw friendlyError(error, command);
  }
}

function isPathInside(filePath: string, projectPath: string) {
  const relative = path.relative(projectPath, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function getLocalProjects() {
  const payload = await runLocalFileSearch(["projects", "--json"]);
  if (!isRecord(payload) || !Array.isArray(payload.projects)) {
    throw new LocalFileSearchError(
      "ai-file-search projects --json 응답에서 projects 배열을 찾을 수 없습니다."
    );
  }

  return payload.projects
    .map((project) => normalizeProject(project, "projects"))
    .filter((project): project is LocalFileSearchProject => Boolean(project));
}

export async function searchLocalFiles(query: string) {
  const q = query.trim();
  if (!q) {
    throw new LocalFileSearchError("검색어를 입력하세요.");
  }

  const payload = await runLocalFileSearch([
    "search",
    q,
    "--json",
    "--no-answer",
  ]);
  if (!isRecord(payload)) {
    throw new LocalFileSearchError(
      "ai-file-search search --json 응답을 읽을 수 없습니다."
    );
  }

  const error = stringValue(payload.error);
  if (error) {
    return {
      query: q,
      results: [] as LocalFileSearchResult[],
      error:
        error === "no_index"
          ? "ai-file-search 색인이 없습니다. ai-file-search에서 먼저 index를 실행하세요."
          : error,
    };
  }

  return {
    query: q,
    results: Array.isArray(payload.results)
      ? payload.results
          .map(normalizeSearchResult)
          .filter((result): result is LocalFileSearchResult => Boolean(result))
      : [],
    error: null,
  };
}

export async function searchLocalProjectCandidates(query: string) {
  const [projects, search] = await Promise.all([
    getLocalProjects(),
    searchLocalFiles(query),
  ]);
  if (search.error) {
    return { projects: [] as LocalFileSearchProject[], error: search.error };
  }

  const matched = new Map<string, LocalFileSearchProject>();
  for (const result of search.results) {
    const project = projects
      .filter((candidate) => isPathInside(result.path, candidate.localPath))
      .sort((a, b) => b.localPath.length - a.localPath.length)[0];
    if (!project) continue;
    const current = matched.get(project.localPath);
    matched.set(project.localPath, {
      ...project,
      source: "search",
      matchedFiles: [...(current?.matchedFiles ?? []), result].slice(0, 5),
    });
  }

  return { projects: [...matched.values()], error: null };
}

export function localProjectDescription(project: LocalFileSearchProject) {
  const lines = [
    "ai-file-search Local Project",
    `Path: ${project.localPath}`,
    `Stack: ${project.stack || "unknown"}`,
    `Signals: ${project.signals.length > 0 ? project.signals.join(", ") : "none"}`,
    `README: ${project.hasReadme ? "yes" : "no"}`,
    `package.json: ${project.hasPackageJson ? "yes" : "no"}`,
    `Git: ${project.hasGit ? "yes" : "no"}`,
  ];

  if (project.matchedFiles && project.matchedFiles.length > 0) {
    lines.push(
      `Matched files: ${project.matchedFiles
        .map((file) => file.name)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}
