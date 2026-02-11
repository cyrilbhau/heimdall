import { prisma } from "./prisma";

export type CrmProvider = "NONE" | "HUBSPOT" | "MAILCHIMP" | "KLAVIYO" | "CUSTOM";

export interface CrmVisitPayload {
  id: string;
  fullName: string;
  email: string;
  visitReasonLabel: string | null;
  source: string;
  createdAt: Date;
}

export interface CrmClient {
  sendVisit: (payload: CrmVisitPayload) => Promise<void>;
}

class NoopCrmClient implements CrmClient {
  async sendVisit(payload: CrmVisitPayload) {
    // Record that we would have synced this visit without talking to a real CRM yet.
    await prisma.crmSyncEvent.create({
      data: {
        visitId: payload.id,
        provider: "NONE",
        status: "SKIPPED",
        error: null,
        sentAt: null,
      },
    });
  }
}

let cachedClient: CrmClient | null = null;

export function getCrmClient(): CrmClient {
  if (cachedClient) return cachedClient;

  const provider = (process.env.CRM_PROVIDER || "NONE").toUpperCase() as CrmProvider;

  // For now, all providers map to the no-op implementation.
  // In the future, switch on provider and return real implementations.
  cachedClient = new NoopCrmClient();

  return cachedClient;
}

