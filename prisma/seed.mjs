import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const p = await prisma.project.create({
    data: {
      name: "USP1 docking 파이프라인",
      description: "Claude Code로 molecular docking 자동화 — RDKit + AutoDock Vina",
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
                content: "prepare_ligands.py 생성 완료. Meeko로 PDBQT 변환.",
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
  console.log("seeded project:", p.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
