# PromptDesk

PromptDesk는 AI 코딩 작업을 프로젝트 단위로 정리하는 로컬 단일 사용자용 프로젝트 매니저입니다.
ChatGPT, Claude, Codex, Claude Code 등에 전달한 프롬프트와 AI 응답, 에러 로그, 메모, 프로젝트 결정 사항을 한곳에 저장하고 다음 작업 지시문을 템플릿으로 생성합니다.

현재 버전은 MVP입니다. 인증, 팀 기능, 클라우드 배포, 외부 AI API 실연동은 포함하지 않습니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 프로젝트 관리 | 대시보드에서 프로젝트를 생성하고, 프로젝트 상세에서 수정/삭제합니다. |
| 작업 관리 | 프로젝트별 작업(Task)을 만들고 상태를 `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`로 변경합니다. |
| 프롬프트 저장 | 작업 상세 화면에서 AI에게 보낸 프롬프트를 저장합니다. |
| 대상 AI 선택 | 프롬프트별로 `ChatGPT`, `Claude`, `Codex`, `Claude Code`, `Other`를 기록합니다. |
| 로그 저장 | AI 응답, 에러, 메모를 `LogEntry`로 저장합니다. |
| 복사 버튼 | 저장된 프롬프트와 로그 내용을 클립보드로 복사합니다. |
| 결정 사항 기록 | 프로젝트별 기술 결정이나 운영 기준을 따로 저장합니다. |
| 다음 프롬프트 생성 | 직전 프롬프트, 최근 에러/응답, 결정 사항을 조합해 다음 지시문 초안을 생성합니다. |
| 진행 상태 확인 | 대시보드에서 프로젝트별 작업 진행률과 상태별 개수를 확인합니다. |

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Prisma 7
- SQLite
- Next.js Server Actions 기반 CRUD
- `@prisma/adapter-better-sqlite3` + `better-sqlite3`

## 프로젝트 구조

```text
prisma/
  schema.prisma      # Prisma 데이터 모델. Prisma 7 기준으로 datasource url은 여기에 두지 않음
  seed.mjs           # 예시 데이터 생성 스크립트
prisma.config.ts     # Prisma 7 설정. DATABASE_URL을 여기에서 읽음
src/
  app/
    layout.tsx       # 좌측 사이드바와 앱 셸
    page.tsx         # 대시보드
    projects/[id]/   # 프로젝트 상세
    tasks/[id]/      # 작업 상세
  components/        # 클라이언트 UI 컴포넌트
  lib/
    actions.ts       # Server Actions
    constants.ts     # 상태, AI, 로그 타입 상수
    nextPrompt.ts    # 다음 프롬프트 템플릿 생성
    prisma.ts        # Prisma Client 싱글톤과 SQLite 어댑터 설정
```

## 데이터 모델

```text
Project
  ├─ Task
  │   ├─ Prompt
  │   └─ LogEntry
  └─ Decision
```

SQLite enum 제약을 피하기 위해 `targetAI`, `status`, `type`은 Prisma enum이 아니라 `String`으로 저장합니다.
허용 값 검증은 [src/lib/constants.ts](src/lib/constants.ts)와 Server Actions에서 처리합니다.

## 설치 방법

1. 저장소를 클론합니다.

```bash
git clone https://github.com/smiler9/promptdesk.git
cd promptdesk
```

2. 환경 변수를 준비합니다.

`.env` 파일은 git에 커밋하지 않습니다. 로컬에서 다음 값을 둡니다.

```bash
DATABASE_URL="file:./prisma/dev.db"
```

3. 의존성을 설치합니다.

```bash
npm install
```

`postinstall`에서 `prisma generate`가 자동 실행됩니다.

## 실행 방법

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:3000
```

프로덕션 빌드 검증은 다음 명령으로 실행합니다.

```bash
npm run build
```

빌드 결과를 실행하려면 먼저 `npm run build`를 실행한 뒤 다음 명령을 사용합니다.

```bash
npm run start
```

## Prisma/SQLite 초기화 방법

이 프로젝트는 Prisma 7 구조를 사용합니다.

- DB 연결 문자열은 [prisma.config.ts](prisma.config.ts)의 `datasource.url`에서 `.env`의 `DATABASE_URL`을 읽습니다.
- [prisma/schema.prisma](prisma/schema.prisma)의 `datasource db`에는 `provider = "sqlite"`만 둡니다.
- 앱 런타임은 [src/lib/prisma.ts](src/lib/prisma.ts)에서 `PrismaBetterSqlite3` 어댑터를 사용합니다.
- 시드 스크립트도 [prisma/seed.mjs](prisma/seed.mjs)에서 같은 SQLite 어댑터를 사용합니다.

SQLite DB 생성과 스키마 반영:

```bash
npm run db:push
```

예시 데이터 생성:

```bash
npm run db:seed
```

Prisma Studio 실행:

```bash
npm run db:studio
```

DB 파일은 다음 위치에 생성됩니다.

```text
prisma/dev.db
```

`prisma/dev.db`는 `.gitignore`에 의해 git에 올라가지 않습니다.

## package.json 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | Next.js 개발 서버를 실행합니다. |
| `npm run build` | 프로덕션 빌드를 생성하고 TypeScript 검사를 수행합니다. |
| `npm run start` | 빌드된 Next.js 앱을 실행합니다. |
| `npm run db:push` | Prisma 스키마를 SQLite DB에 반영합니다. |
| `npm run db:seed` | 예시 데이터를 생성합니다. |
| `npm run db:studio` | Prisma Studio를 실행합니다. |
| `npm run postinstall` | Prisma Client를 생성합니다. 보통 `npm install` 후 자동 실행됩니다. |

## GitHub 백업 상태

현재 로컬 저장소는 GitHub 원격 저장소와 연결되어 있습니다.

```text
origin  https://github.com/smiler9/promptdesk.git
```

현재 브랜치:

```text
main -> origin/main
```

로컬 `main` 브랜치는 `origin/main`을 추적하도록 설정되어 있습니다.
GitHub CLI 인증은 `smiler9` 계정으로 설정되어 있으며, Git 작업은 HTTPS 프로토콜을 사용합니다.

## 개발 서버 실행 방법

처음 실행할 때는 다음 순서로 준비합니다.

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

이미 설치와 DB 초기화가 끝난 상태라면 다음 명령만 실행하면 됩니다.

```bash
npm run dev
```

기본 개발 서버 주소는 다음과 같습니다.

```text
http://localhost:3000
```

포트 `3000`이 이미 사용 중이면 Next.js가 다른 포트를 제안할 수 있습니다.

## 향후 개발 계획

- 작업 순서 변경 기능 추가
- 프로젝트/작업 검색과 필터 개선
- 결정 사항 수정 기능 추가
- 프롬프트와 로그의 긴 내용 표시 방식 개선
- `generateWithAI()`에 외부 AI API 연동 옵션 추가
- 테스트 추가
- 배포 환경을 고려한 설정 분리

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

### `Cannot find module '@prisma/client'` 또는 Prisma Client 관련 오류

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
현재 프로젝트는 Node.js 26 환경에서 설치와 빌드를 확인했습니다.

문제가 계속되면 의존성을 다시 설치합니다.

```bash
rm -rf node_modules
npm install
npx prisma generate
```

### 시드 데이터가 중복 생성됨

현재 [prisma/seed.mjs](prisma/seed.mjs)는 idempotent하게 작성되어 있지 않습니다.
`npm run db:seed`를 여러 번 실행하면 예시 프로젝트가 반복 생성될 수 있습니다.

### `localhost:3000` 접속 실패

개발 서버가 실행 중인지 확인합니다.

```bash
npm run dev
```

이미 다른 프로세스가 `3000` 포트를 사용 중이면 해당 프로세스를 종료하거나 Next.js가 안내하는 다른 포트로 접속합니다.

### GitHub push 인증 오류

GitHub CLI 인증을 다시 확인합니다.

```bash
gh auth status
gh auth login
gh auth setup-git
git push
```
