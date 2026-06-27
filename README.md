# PromptDesk

PromptDesk는 AI 코딩 작업을 프로젝트, 작업, 프롬프트, 로그, 결정사항, 실행 리포트 단위로 정리하는 로컬 단일 사용자용 프로젝트 매니저입니다.

ChatGPT, Claude, Codex, Claude Code 등에 전달한 지시문과 작업 결과를 프로젝트별로 보관하고, 어떤 프롬프트와 AI 작업이 어떤 Git 커밋으로 이어졌는지 추적할 수 있습니다.

현재 버전은 `v0.2.0`입니다. 인증, 팀 협업, 클라우드 배포, 외부 AI API 직접 연동은 아직 포함하지 않습니다.

## v0.2.0 변경사항

- Task Priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT` 우선순위를 Task별로 관리합니다.
- Task Tags: Task에 `bug`, `feature`, `frontend` 같은 태그와 선택 색상을 붙여 분류합니다.
- Task Checklist: Task 안에서 세부 작업을 체크리스트로 추가, 수정, 완료 처리, 삭제할 수 있습니다.
- Next AI Prompt 개선: Task 상태, priority, tags, prompts, logs, error logs, execution reports, checklist, Git commit records를 바탕으로 Codex 또는 Claude Code용 다음 작업 프롬프트를 로컬 템플릿으로 생성합니다.

## 현재 구현 기능

| 기능 | 설명 |
| --- | --- |
| Project 관리 | 프로젝트 생성, 수정, 삭제, 설명 기록, 대시보드 목록 표시를 지원합니다. |
| Task 관리 | 프로젝트별 Task 생성, 수정, 삭제와 `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED` 상태 관리를 지원합니다. |
| Task Priority | Task별 `LOW`, `MEDIUM`, `HIGH`, `URGENT` 우선순위를 관리하고 목록/검색/요약에 표시합니다. |
| Task Tags | Task별 태그와 색상을 관리하고 Task 목록과 전체 검색 결과에 표시합니다. |
| Task Checklist | Task 상세에서 체크리스트 항목을 추가, 완료 토글, 수정, 삭제하고 Task 목록과 프로젝트 요약에 진행률을 표시합니다. |
| Prompt 저장 | Task별로 AI에게 보낸 프롬프트와 대상 AI를 저장합니다. |
| Next AI Prompt | Task 컨텍스트를 바탕으로 Codex/Claude Code용 다음 작업 프롬프트를 생성하고 복사하거나 Prompt로 저장합니다. |
| LogEntry 관리 | AI 응답, 에러, 메모를 Task별 로그로 저장하고 필터링합니다. |
| Prompt Template | 자주 쓰는 AI 코딩 지시문을 템플릿으로 만들고, Task 프롬프트 작성 시 불러옵니다. |
| Execution Report | AI 작업 완료 후 변경 파일, 실행 명령, 테스트 결과, 빌드 결과, 커밋 해시, 후속 작업을 구조화해서 저장합니다. |
| Project Timeline | Task, Prompt, Log, Decision, Execution Report, Git Commit 활동을 최신순 타임라인으로 보여줍니다. |
| Git Commit Records | 프로젝트, Task, Execution Report와 Git 커밋 정보를 수동으로 연결해 추적합니다. |
| Export / Import | 프로젝트 전체 기록을 Markdown/JSON으로 내보내고, Export JSON으로 다시 가져올 수 있습니다. |
| Global Search | 프로젝트, 작업, 프롬프트, 로그, 결정사항, 실행 리포트, Git 커밋 기록을 `/search`에서 한 번에 검색합니다. |
| Pinned Items | 중요한 Project, Task, Prompt Template을 고정하고 대시보드와 목록 상단에서 빠르게 접근합니다. |
| Project Status Summary | 프로젝트 상세에서 완료율, 상태별 Task 수, 로그/리포트/커밋 수, 최근 활동, 위험 신호를 요약합니다. |

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Prisma 7
- SQLite
- `@prisma/adapter-better-sqlite3`
- `better-sqlite3`
- Next.js Server Actions 기반 CRUD

## 주요 페이지 URL

| URL | 설명 |
| --- | --- |
| `/` | 대시보드, 프로젝트 검색/필터, 고정 항목, 프로젝트 카드 목록 |
| `/?new=1` | 새 프로젝트 생성 모달 |
| `/projects/[id]` | 프로젝트 상세, 상태 요약, Export, Task 검색/상태/우선순위 필터, Decision, Git Commit, Timeline |
| `/tasks/[id]` | Task 상세, priority/tags/checklist 관리, Next AI Prompt, Prompt/Log 관리, 템플릿 불러오기, 실행 리포트, Git Commit 연결 |
| `/templates` | Prompt Template 목록, 생성, 수정, 삭제, 고정 |
| `/search?q=검색어` | 전체 검색 |

## 프로젝트 구조

```text
prisma/
  schema.prisma      # Prisma 데이터 모델. Prisma 7 기준으로 datasource url은 여기에 두지 않음
  seed.mjs           # 예시 프로젝트와 기본 프롬프트 템플릿 seed
prisma.config.ts     # Prisma 7 설정. DATABASE_URL을 여기에서 읽음
src/
  app/
    layout.tsx       # 좌측 사이드바와 앱 셸
    page.tsx         # 대시보드
    projects/[id]/   # 프로젝트 상세
    tasks/[id]/      # Task 상세
    templates/       # Prompt Template 관리
    search/          # 전체 검색
  components/        # UI 컴포넌트
  lib/
    actions.ts       # Server Actions
    constants.ts     # 상태, AI, 로그, 템플릿 타입 상수
    nextPrompt.ts    # 다음 프롬프트 초안 생성
    prisma.ts        # Prisma Client 싱글톤과 SQLite 어댑터 설정
```

## 데이터 모델

```text
Project
  ├─ Task
  │   ├─ TaskTag
  │   ├─ TaskChecklistItem
  │   ├─ Prompt
  │   ├─ LogEntry
  │   ├─ TaskExecutionReport
  │   └─ GitCommitRecord
  ├─ Decision
  └─ GitCommitRecord

PromptTemplate
```

SQLite enum 제약을 피하기 위해 `targetAI`, `status`, `priority`, `type`, `category`는 Prisma enum이 아니라 `String`으로 저장합니다.
허용 값 검증은 [src/lib/constants.ts](src/lib/constants.ts)와 Server Actions에서 처리합니다.

## 설치 방법

1. 저장소를 클론합니다.

```bash
git clone https://github.com/smiler9/promptdesk.git
cd promptdesk
```

2. 환경 변수를 준비합니다.

프로젝트 루트에 `.env` 파일을 만들고 다음 값을 넣습니다.

```bash
DATABASE_URL="file:./prisma/dev.db"
```

3. 의존성을 설치합니다.

```bash
npm install
```

`postinstall` 스크립트가 `prisma generate`를 자동 실행합니다.

## Prisma 7 + SQLite 초기화

이 프로젝트는 Prisma 7 구조를 사용합니다.

- DB 연결 문자열은 [prisma.config.ts](prisma.config.ts)의 `datasource.url`에서 `.env`의 `DATABASE_URL`을 읽습니다.
- [prisma/schema.prisma](prisma/schema.prisma)의 `datasource db`에는 `provider = "sqlite"`만 둡니다.
- 앱 런타임은 [src/lib/prisma.ts](src/lib/prisma.ts)에서 `PrismaBetterSqlite3` 어댑터를 사용합니다.
- DB 파일 기본 위치는 `prisma/dev.db`입니다.

SQLite DB 생성과 스키마 반영:

```bash
npm run db:push
```

Prisma 스키마 변경 후 로컬 DB와 Prisma Client를 명시적으로 동기화할 때는 다음 명령을 사용합니다.

```bash
npx prisma generate
npx prisma db push
```

예시 프로젝트와 기본 템플릿 생성:

```bash
npm run db:seed
```

Prisma Client 수동 생성:

```bash
npx prisma generate
```

Prisma Studio 실행:

```bash
npm run db:studio
```

## 실행 방법

개발 서버 실행:

```bash
npm run dev
```

기본 주소:

```text
http://localhost:3000
```

프로덕션 빌드 검증:

```bash
npm run build
```

빌드된 앱 실행:

```bash
npm run start
```

처음 실행하는 로컬 환경에서는 보통 다음 순서로 준비합니다.

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

## package.json 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | Next.js 개발 서버를 실행합니다. |
| `npm run build` | 프로덕션 빌드를 생성하고 TypeScript 검사를 수행합니다. |
| `npm run start` | 빌드된 Next.js 앱을 실행합니다. |
| `npm run db:push` | Prisma 스키마를 SQLite DB에 반영합니다. |
| `npm run db:seed` | 예시 데이터와 기본 템플릿을 생성합니다. |
| `npm run db:studio` | Prisma Studio를 실행합니다. |
| `npm run postinstall` | Prisma Client를 생성합니다. 일반적으로 `npm install` 후 자동 실행됩니다. |
| `npx prisma generate` | Prisma Client를 수동 생성합니다. |
| `npx prisma db push` | 현재 Prisma 스키마를 SQLite DB에 직접 반영합니다. |

## GitHub 백업 상태

현재 저장소는 GitHub 원격 저장소와 연결되어 있습니다.

```text
origin  https://github.com/smiler9/promptdesk.git
branch  main
```

로컬 `main` 브랜치는 `origin/main`을 추적합니다.

## 향후 개발 계획

- Task 순서 변경 UI 추가
- Decision 수정 기능 추가
- Next AI Prompt 템플릿 세부 옵션 추가
- Prompt/Log 긴 내용 보기 UX 개선
- 템플릿 카테고리별 필터와 검색 강화
- Export/Import 검증 메시지 개선
- 자동 Git 정보 감지 옵션 추가
- 외부 AI API 연동 옵션 추가
- 테스트 코드 추가
- 배포 환경용 설정 분리

## 문제 해결

### `The datasource property url is no longer supported in schema files`

Prisma 7에서는 `schema.prisma` 안에 `url = env("DATABASE_URL")`을 두지 않습니다.
이 프로젝트는 [prisma.config.ts](prisma.config.ts)에서 `DATABASE_URL`을 읽도록 구성되어 있습니다.

### `Environment variable not found: DATABASE_URL`

`.env` 파일이 없거나 값이 비어 있을 때 발생합니다.
프로젝트 루트에 `.env`를 만들고 다음 값을 넣습니다.

```bash
DATABASE_URL="file:./prisma/dev.db"
```

### `Cannot find module '@prisma/client'` 또는 Prisma Client 오류

의존성 설치 또는 Prisma Client 생성이 누락된 상태일 수 있습니다.

```bash
npm install
npx prisma generate
```

### SQLite DB가 없다는 오류

DB 파일을 다시 생성하고 스키마를 반영합니다.

```bash
npm run db:push
```

예시 데이터가 필요하면 다음 명령을 추가로 실행합니다.

```bash
npm run db:seed
```

### `better-sqlite3` 설치 경고 또는 빌드 오류

`better-sqlite3`는 네이티브 모듈입니다. Node.js 버전과 로컬 빌드 도구 상태에 영향을 받을 수 있습니다.
문제가 있으면 현재 Node.js 버전을 확인하고 의존성을 다시 설치합니다.

```bash
node -v
npm install
```
