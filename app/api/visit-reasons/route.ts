import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const reasons = await prisma.visitReason.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return NextResponse.json(
    reasons.map((r) => ({
      id: r.id,
      label: r.label,
      slug: r.slug,
    })),
  );
}

