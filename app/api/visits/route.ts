import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCrmClient } from "@/app/lib/crm";
import { uploadVisitorPhoto, generatePresignedUrl } from "@/app/lib/s3";

// Structured logging helper
function logEvent(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    service: 'visitor-kiosk'
  };
  console.log(JSON.stringify(logEntry));
}

type VisitRequestBody = {
  fullName: string;
  email: string;
  photoDataUrl?: string | null;
  visitReasonId?: string | null;
  customReason?: string | null;
  source?: "KIOSK" | "MANUAL" | "API";
};

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body = (await request.json()) as VisitRequestBody;
    logEvent('info', 'Visit submission started', { email: body.email, hasPhoto: !!body.photoDataUrl });

    const fullName = body.fullName?.trim();
    const email = body.email?.trim();
    const visitReasonId = body.visitReasonId || null;
    const customReason = body.customReason?.trim() || null;

    if (!fullName) {
      logEvent('warn', 'Invalid submission: missing fullName', { body });
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      logEvent('warn', 'Invalid submission: invalid email', { email });
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Photo upload (best-effort)
    let photoKey: string | null = null;
    let photoUrl: string | null = null;
    if (body.photoDataUrl) {
      try {
        photoKey = await uploadVisitorPhoto(body.photoDataUrl);
        photoUrl = await generatePresignedUrl(photoKey);
        logEvent('info', 'Photo uploaded successfully', { photoKey });
      } catch (error) {
        logEvent('error', 'Photo upload failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Determine the final visitReasonId and customReason to store.
    // If a predefined reason was selected, use it directly.
    // If a custom reason was typed, check for auto-promotion (3rd occurrence).
    // If neither, the visitor skipped — both stay null.
    let finalReasonId: string | null = visitReasonId;
    let finalCustomReason: string | null = customReason;

    if (!visitReasonId && customReason) {
      // Count past visits with the same custom reason (case-insensitive exact match)
      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "Visit" WHERE LOWER("customReason") = LOWER($1)`,
        customReason
      );
      const matchCount = Number(countResult[0]?.count ?? 0);

      if (matchCount >= 2) {
        // This is the 3rd+ occurrence — promote to a full VisitReason
        const slug = customReason.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        try {
          // Use upsert to handle the race condition where two concurrent requests
          // try to promote the same custom reason simultaneously
          const reason = await prisma.visitReason.upsert({
            where: { slug },
            create: {
              label: customReason,
              slug,
              active: true,
              sortOrder: 0,
              source: "MANUAL",
            },
            update: {}, // If it already exists, just use it
          });

          finalReasonId = reason.id;
          finalCustomReason = null;
          logEvent('info', 'Custom reason auto-promoted to VisitReason', {
            label: customReason,
            reasonId: reason.id,
            priorOccurrences: matchCount,
          });
        } catch (error) {
          // If promotion fails (e.g. label uniqueness), just store as custom
          logEvent('warn', 'Custom reason promotion failed, storing as custom', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const visit = await prisma.visit.create({
      data: {
        fullName,
        email,
        photoUrl: photoKey,
        visitReasonId: finalReasonId,
        customReason: finalCustomReason,
        source: body.source ?? "KIOSK",
      },
      include: {
        visitReason: true,
      },
    });
    
    const duration = Date.now() - startTime;
    logEvent('info', 'Visit created successfully', { 
      visitId: visit.id, 
      fullName: visit.fullName, 
      duration: `${duration}ms`,
      hasPhoto: !!photoKey,
      hasReason: !!finalReasonId,
      hasCustomReason: !!finalCustomReason,
    });

    // Fire-and-forget CRM sync; failure here should not block the visitor.
    const crmClient = getCrmClient();
    void crmClient
      .sendVisit({
        id: visit.id,
        fullName: visit.fullName,
        email: visit.email,
        visitReasonLabel: visit.visitReason?.label ?? visit.customReason ?? null,
        source: visit.source,
        createdAt: visit.createdAt,
      })
      .catch((error) => {
        console.error("CRM sync failed", error);
      });

    return NextResponse.json({ 
      id: visit.id, 
      photoUrl: photoUrl
    }, { status: 201 });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logEvent('error', 'Failed to create visit', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: "Failed to create visit" }, { status: 500 });
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
