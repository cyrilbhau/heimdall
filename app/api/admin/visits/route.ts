import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isAdminAuthenticated } from "@/app/lib/auth";
import { generatePresignedUrl } from "@/app/lib/s3";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const visits = await prisma.visit.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      visitReason: true,
    },
  });

  // Generate presigned URLs for visits that have photos
  const visitsWithPresignedUrls = await Promise.all(
    visits.map(async (v) => {
      let photoUrl: string | null = null;
      if (v.photoUrl) {
        try {
          photoUrl = await generatePresignedUrl(v.photoUrl);
        } catch (error) {
          console.error("Failed to generate presigned URL for visit", v.id, error);
          // Keep photoUrl as null if generation fails
        }
      }

      return {
        id: v.id,
        fullName: v.fullName,
        email: v.email,
        visitReasonLabel: v.visitReason?.label ?? null,
        source: v.source,
        createdAt: v.createdAt,
        photoUrl,
      };
    })
  );

  return NextResponse.json(visitsWithPresignedUrls);
}

