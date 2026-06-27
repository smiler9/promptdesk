# PromptDesk

AI 코딩 프로젝트 매니저 (MVP). ChatGPT / Claude / Codex / Claude Code에게 시킨 작업을
프로젝트별로 정리하고, 프롬프트 · AI 응답 · 에러 로그 · 결정 사항 · 다음 작업 지시문을
저장/관리합니다. 로컬 단일 사용자 기준이며 인증/외부 API 연동은 없습니다.

## 기술 스택

- Next.js (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Prisma + SQLite
- Server Actions (별도 REST 레이어 없음)

## 데이터 모델

```
Project ─┬─ Task ──┬─ Prompt   (targetAI, isGenerated)
         │         └─ LogEntry (type: RESPONSE | ERROR | NOTE)
         └─ Decision
```

응답 · 에러 · 메모는 별도 테이블 대신 **LogEntry 하나로 통합**(type으로 구분)했습니다.
종류가 늘어도 테이블 추가 없이 확장됩니다. SQLite enum 제약을 피하려고
`targetAI` / `status` / `type`은 String + 앱 레벨 상수 검증(`src/lib/constants.ts`)으로 둡니다.

## 실행 방법

```bash
# 1. 의존성 설치 (Prisma client 자동 생성)
npm install

# 2. SQLite DB 생성 + 스키마 반영
npm run db:push

# 3. (선택) 예시 데이터 시드
npm run db:seed

# 4. 개발 서버
npm run dev
# http://localhost:3000
```

DB 파일은 `prisma/dev.db`(`.env`의 `DATABASE_URL`)에 생성됩니다.
`npm run db:studio`로 Prisma Studio에서 직접 데이터를 볼 수 있습니다.

## 주요 기능

| # | 기능 | 위치 |
|---|------|------|
| 1 | 프로젝트 CRUD | 대시보드 / 프로젝트 상세 |
| 2 | 작업(Task) 생성·상태 변경 | 프로젝트 상세, 인라인 상태 select |
| 3 | 프롬프트 저장 | 작업 상세 → 프롬프트 탭 |
| 4 | targetAI 선택 | ChatGPT/Claude/Codex/Claude Code/Other |
| 5 | 프롬프트 복사 버튼 | 각 프롬프트·로그 카드 |
| 6·7 | AI 응답 / 에러 로그 저장 | 작업 상세 → 로그 탭 (RESPONSE/ERROR/NOTE) |
| 8 | 프로젝트별 결정 사항 | 프로젝트 상세 우측 패널 |
| 9 | 다음 프롬프트 자동 생성 | 작업 상세 "⚡ 다음 프롬프트 생성" |
| 10 | 대시보드 진행 상태 | 홈 — 카드별 진행률 + 상태 뱃지 |

### 기능 9 — 다음 프롬프트 생성

`src/lib/nextPrompt.ts`에 두 경로가 있습니다.

- `buildTemplatePrompt()` — **API 없이** 직전 프롬프트 + 최근 에러 로그 +
  결정 사항을 끼워넣은 템플릿 초안을 만듭니다. (현재 동작)
- `generateWithAI()` — 추후 외부 AI 연동을 끼울 **확장 자리**(stub). 현재는
  템플릿 결과를 그대로 반환합니다.

생성된 프롬프트는 `isGenerated: true`로 저장되어 "자동생성 초안" 뱃지가 붙습니다.

## 폴더 구조

```
prisma/
  schema.prisma      # 데이터 모델
  seed.mjs           # 예시 데이터
src/
  app/
    layout.tsx       # 좌측 사이드바 + 셸
    page.tsx         # 대시보드
    projects/[id]/   # 프로젝트 상세
    tasks/[id]/      # 작업 상세 (프롬프트/로그 워크스페이스)
  components/         # 클라이언트 컴포넌트
  lib/
    prisma.ts        # Prisma 클라이언트 싱글톤
    actions.ts       # 모든 server actions (CRUD)
    constants.ts     # 상태/AI/로그 타입 상수
    nextPrompt.ts    # 다음 프롬프트 생성 로직
```

## MVP 범위 밖 (의도적 제외)

인증, 결제, 팀 기능, 클라우드 배포, OpenAI/Claude API 실연동.
