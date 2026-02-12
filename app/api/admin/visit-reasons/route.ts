import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isAdminAuthenticated } from "@/app/lib/auth";

const FEATURED_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const MAX_FEATURED = 3;

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const reasons = await prisma.visitReason.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return NextResponse.json(reasons);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { label, slug, active = true, sortOrder = 0, source = "MANUAL" } = body ?? {};

  if (!label || typeof label !== "string") {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  const normalisedSlug =
    typeof slug === "string" && slug.trim().length > 0
      ? slug.trim().toLowerCase().replace(/\s+/g, "-")
      : label.trim().toLowerCase().replace(/\s+/g, "-");

  try {
    const reason = await prisma.visitReason.create({
      data: {
        label: label.trim(),
        slug: normalisedSlug,
        active: Boolean(active),
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        source,
      },
    });

    return NextResponse.json(reason, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create visit reason", error);
    return NextResponse.json({ error: "Failed to create visit reason" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { id, label, active, sortOrder, featured } = body ?? {};

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (typeof label === "string") {
    data.label = label.trim();
  }
  if (typeof active === "boolean") {
    data.active = active;
  }
  if (typeof sortOrder === "number" && Number.isFinite(sortOrder)) {
    data.sortOrder = sortOrder;
  }

  // Handle featured toggle
  if (typeof featured === "boolean") {
    if (featured) {
      // Enforce max 3 actively-featured reasons (within the 48h window)
      const now = new Date();
      const cutoff = new Date(now.getTime() - FEATURED_TTL_MS);

      const currentlyFeatured = await prisma.visitReason.count({
        where: {
          featured: true,
          featuredAt: { gte: cutoff },
          id: { not: id }, // exclude the one being toggled
        },
      });

      if (currentlyFeatured >= MAX_FEATURED) {
        return NextResponse.json(
          { error: `Cannot feature more than ${MAX_FEATURED} reasons at a time.` },
          { status: 400 }
        );
      }

      data.featured = true;
      data.featuredAt = now;
    } else {
      data.featured = false;
      data.featuredAt = null;
    }
  }

  try {
    const updated = await prisma.visitReason.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Failed to update visit reason", error);
    return NextResponse.json({ error: "Failed to update visit reason" }, { status: 500 });
  }
}
