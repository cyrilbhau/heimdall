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
  visitReasonId: string;
  source?: "KIOSK" | "MANUAL" | "API";
};

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body = (await request.json()) as VisitRequestBody;
    logEvent('info', 'Visit submission started', { email: body.email, hasPhoto: !!body.photoDataUrl });

    const fullName = body.fullName?.trim();
    const email = body.email?.trim();
    const visitReasonId = body.visitReasonId;

    if (!fullName) {
      logEvent('warn', 'Invalid submission: missing fullName', { body });
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      logEvent('warn', 'Invalid submission: invalid email', { email });
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!visitReasonId) {
      logEvent('warn', 'Invalid submission: missing visitReasonId', { body });
      return NextResponse.json({ error: "visitReasonId is required" }, { status: 400 });
    }

    let photoKey: string | null = null;
    let photoUrl: string | null = null;
    if (body.photoDataUrl) {
      try {
        photoKey = await uploadVisitorPhoto(body.photoDataUrl);
        // Generate presigned URL for immediate use
        photoUrl = await generatePresignedUrl(photoKey);
        logEvent('info', 'Photo uploaded successfully', { photoKey });
      } catch (error) {
        logEvent('error', 'Photo upload failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        // Continue without photo - don't block the visitor experience
      }
    }

    const visit = await prisma.visit.create({
      data: {
        fullName,
        email,
        photoUrl: photoKey, // Store the S3 key, not the full URL
        visitReasonId,
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
      hasPhoto: !!photoKey 
    });

    // Fire-and-forget CRM sync; failure here should not block the visitor.
    const crmClient = getCrmClient();
    void crmClient
      .sendVisit({
        id: visit.id,
        fullName: visit.fullName,
        email: visit.email,
        visitReasonLabel: visit.visitReason?.label ?? null,
        source: visit.source,
        createdAt: visit.createdAt,
      })
      .catch((error) => {
        console.error("CRM sync failed", error);
      });

    return NextResponse.json({ 
      id: visit.id, 
      photoUrl: photoUrl // Return presigned URL for immediate display
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
  // Simple, pragmatic email check for kiosk use.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

