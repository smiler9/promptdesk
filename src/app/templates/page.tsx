import { prisma } from "@/lib/prisma";
import TemplateManager from "@/components/TemplateManager";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.promptTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <TemplateManager templates={templates} />
    </div>
  );
}
