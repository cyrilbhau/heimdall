/**
 * Slack notifications for visitor sign-ins.
 * Uses an Incoming Webhook; if SLACK_WEBHOOK_URL is unset, no request is sent.
 */

export interface VisitNotificationPayload {
  fullName: string;
  email: string;
  phone: string | null;
  visitReasonLabel: string | null;
  source: string;
  createdAt: Date;
  photoUrl: string | null;
  isNewVisitor: boolean;
  lastVisitAt: Date | null;
}

function formatVisitTime(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildBlocks(payload: VisitNotificationPayload): object[] {
  const badgeText = payload.isNewVisitor
    ? "*New visitor*"
    : payload.lastVisitAt
      ? `*Repeat visitor* · Last visit: ${formatVisitTime(payload.lastVisitAt)}`
      : "*Repeat visitor*";

  const reason = payload.visitReasonLabel ?? "—";
  const signInTime = formatVisitTime(payload.createdAt);

  const blocks: object[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Visitor signed in", emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: badgeText },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Name*\n${payload.fullName}` },
        { type: "mrkdwn", text: `*Email*\n${payload.email}` },
        {
          type: "mrkdwn",
          text: `*Phone*\n${payload.phone ?? "—"}`,
        },
        { type: "mrkdwn", text: `*Reason*\n${reason}` },
        { type: "mrkdwn", text: `*Source*\n${payload.source}` },
        { type: "mrkdwn", text: `*Signed in*\n${signInTime}` },
      ],
    },
  ];

  if (payload.photoUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${payload.photoUrl}|View photo>`,
      },
    });
  }

  return blocks;
}

/**
 * Sends a visit sign-in notification to the configured Slack channel.
 * No-op if SLACK_WEBHOOK_URL is not set. Failures are not thrown; log and resolve.
 */
export async function sendVisitNotification(
  payload: VisitNotificationPayload
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: buildBlocks(payload) }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Slack notification failed", {
        status: res.status,
        statusText: res.statusText,
        body: body.slice(0, 500),
      });
    }
  } catch (error) {
    console.error("Slack notification failed", error);
  }
}
