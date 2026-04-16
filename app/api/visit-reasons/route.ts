import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const FEATURED_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function GET() {
  const reasons = await prisma.visitReason.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  const now = Date.now();

  return NextResponse.json(
    reasons.map((r) => {
      const isFeatured =
        r.featured &&
        r.featuredAt !== null &&
        now - new Date(r.featuredAt).getTime() < FEATURED_TTL_MS;

      return {
        id: r.id,
        label: r.label,
        slug: r.slug,
        featured: isFeatured,
        category: r.category,
      };
    }),
  );
}
