import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const sampleTemplates = [
  {
    title: "버그 수정 요청",
    description: "재현 절차와 에러 로그를 기준으로 원인 분석과 수정 요청",
    targetAI: "Claude Code",
    category: "Bugfix",
    content: `다음 버그를 수정해줘.

## 증상

## 재현 절차

## 에러 로그

## 기대 결과

수정 후 변경 파일 목록, 원인, 검증 명령어를 보고해줘.`,
  },
  {
    title: "기능 구현 요청",
    description: "기존 코드 패턴을 유지하며 새 기능 구현",
    targetAI: "Codex",
    category: "Feature",
    content: `다음 기능을 구현해줘.

## 목표

## 요구사항

## 주의사항
- 기존 구조와 스타일을 유지해줘.
- 대규모 리팩토링은 하지 마.
- 구현 후 빌드/테스트를 실행해줘.

완료 후 수정 파일 목록, 테스트 결과, 추천 커밋 메시지를 보고해줘.`,
  },
  {
    title: "코드 리뷰 요청",
    description: "버그, 회귀 위험, 누락된 테스트 중심 리뷰",
    targetAI: "ChatGPT",
    category: "Review",
    content: `다음 변경사항을 코드 리뷰해줘.

중점:
- 실제 버그
- 회귀 위험
- 보안/데이터 손실 위험
- 누락된 테스트

파일/라인 근거를 포함하고, 심각도 순서로 findings를 먼저 보여줘.`,
  },
  {
    title: "문서 개선 요청",
    description: "현재 구현 상태 기준 README 또는 문서 정리",
    targetAI: "Claude",
    category: "Docs",
    content: `현재 프로젝트 상태를 기준으로 문서를 개선해줘.

포함할 내용:
- 프로젝트 소개
- 주요 기능
- 설치/실행 방법
- 환경 변수
- 문제 해결

존재하지 않는 기능은 문서에 넣지 말고, 실제 package.json 스크립트와 코드 구조에 맞춰 작성해줘.`,
  },
];

async function seedSampleTemplates() {
  let created = 0;
  for (const template of sampleTemplates) {
    const existing = await prisma.promptTemplate.findFirst({
      where: { title: template.title },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.promptTemplate.create({ data: template });
    created += 1;
  }
  return created;
}

async function main() {
  let p = await prisma.project.findFirst({
    where: { name: "USP1 docking 파이프라인" },
    select: { id: true },
  });

  if (!p) {
    p = await prisma.project.create({
      data: {
        name: "USP1 docking 파이프라인",
        description:
          "Claude Code로 molecular docking 자동화 — RDKit + AutoDock Vina",
        decisions: {
          create: [
            {
              title: "SQLite enum 미사용",
              content: "Prisma + SQLite 제약으로 String + 앱 검증 사용",
            },
            {
              title: "pChEMBL 표준화",
              content: "InChIKey 기준으로 docking 결과와 실험값 조인",
            },
          ],
        },
        tasks: {
          create: [
            {
              title: "리간드 준비 스크립트 작성",
              status: "DONE",
              order: 0,
              prompts: {
                create: {
                  targetAI: "Claude Code",
                  content:
                    "SMILES 리스트를 받아 RDKit으로 3D 구조 생성 후 PDBQT로 변환하는 스크립트를 작성해줘.",
                },
              },
              logs: {
                create: {
                  type: "RESPONSE",
                  content:
                    "prepare_ligands.py 생성 완료. Meeko로 PDBQT 변환.",
                },
              },
            },
            {
              title: "Vina docking 실행 및 점수 보정",
              status: "IN_PROGRESS",
              order: 1,
              logs: {
                create: {
                  type: "ERROR",
                  content:
                    "Spearman ρ가 IC50와 음의 상관. grid box 중심 좌표 재확인 필요.",
                },
              },
            },
            { title: "결과 join 및 시각화", status: "TODO", order: 2 },
          ],
        },
      },
    });
  }

  const createdTemplates = await seedSampleTemplates();
  console.log("seeded project:", p.id);
  console.log(
    "seeded prompt templates:",
    `${createdTemplates}/${sampleTemplates.length}`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
