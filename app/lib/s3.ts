import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Railway: use BUCKET for the S3 API (globally unique name). RAILWAY_BUCKET_NAME is the display name only.
const BUCKET = process.env.BUCKET ?? process.env.RAILWAY_BUCKET_NAME;
const ENDPOINT = process.env.ENDPOINT ?? process.env.RAILWAY_BUCKET_ENDPOINT ?? "https://storage.railway.app";
const REGION_ENV = process.env.REGION ?? "auto";
// AWS SDK signing requires a concrete region in the credential scope. Railway may set REGION=auto;
// many S3-compatible backends then reject the signature. Use us-east-1 for signing when auto.
const REGION = REGION_ENV === "auto" ? "us-east-1" : REGION_ENV;
// Tigris (t3.storage*.dev) requires virtual-hosted style (forcePathStyle: false); Railway uses path-style.
const IS_TIGRIS = /t3\.storage|tigris\.dev/i.test(ENDPOINT);
// AWS SDK expects AWS_*; Railway provides ACCESS_KEY_ID / SECRET_ACCESS_KEY - support both
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID ?? process.env.ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? process.env.SECRET_ACCESS_KEY;

if (!BUCKET) {
  // eslint-disable-next-line no-console
  console.warn("[s3] BUCKET (or RAILWAY_BUCKET_NAME) is not set; Railway uploads will fail until configured.");
}

const s3Client =
  BUCKET && ACCESS_KEY && SECRET_KEY
    ? new S3Client({
        endpoint: ENDPOINT,
        region: REGION,
        credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
        forcePathStyle: !IS_TIGRIS, // Tigris requires false (virtual-hosted); Railway uses true (path-style)
      })
    : null;

function agentLog(payload: Record<string, unknown>) {
  const line = JSON.stringify({ ...payload, agentDebug: true });
  // eslint-disable-next-line no-console
  console.log(line);
  fetch("http://127.0.0.1:7242/ingest/588326a3-ad7a-4578-840d-daa057b61aed", { method: "POST", headers: { "Content-Type": "application/json" }, body: line }).catch(() => {});
}

export async function uploadVisitorPhoto(base64DataUrl: string): Promise<string> {
  // #region agent log
  const credentialSource = process.env.AWS_ACCESS_KEY_ID ? "AWS_*" : process.env.ACCESS_KEY_ID ? "ACCESS_*" : "none";
  agentLog({ location: "s3.ts:uploadVisitorPhoto", message: "S3 config at upload", data: { endpoint: ENDPOINT, region: REGION, bucket: BUCKET ?? null, hasAccessKey: !!(process.env.AWS_ACCESS_KEY_ID ?? process.env.ACCESS_KEY_ID), hasSecretKey: !!(process.env.AWS_SECRET_ACCESS_KEY ?? process.env.SECRET_ACCESS_KEY), credentialSource, s3ClientExists: !!s3Client }, timestamp: Date.now(), hypothesisId: "H1-H2-H3" });
  // #endregion
  if (!s3Client || !BUCKET) {
    throw new Error(
      "Railway Bucket is not configured. Set BUCKET (or RAILWAY_BUCKET_NAME), ACCESS_KEY_ID (or AWS_ACCESS_KEY_ID), and SECRET_ACCESS_KEY (or AWS_SECRET_ACCESS_KEY)."
    );
  }

  const match = base64DataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid data URL for photo upload.");
  }

  const mimeType = match[1]; // e.g. image/jpeg
  const base64 = match[2];

  const buffer = Buffer.from(base64, "base64");

  const key = `visits/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.jpg`;

  // #region agent log
  agentLog({ location: "s3.ts:PutObject", message: "Before PutObject", data: { key, contentType: mimeType, bodyLength: buffer.length }, timestamp: Date.now(), hypothesisId: "H3-H4" });
  // #endregion
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Railway buckets are private - no ACL needed
    }),
  );

  return key;
}

export async function generatePresignedUrl(key: string): Promise<string> {
  if (!s3Client || !BUCKET) {
    throw new Error(
      "Railway Bucket is not configured. Set BUCKET, ACCESS_KEY_ID, and SECRET_ACCESS_KEY (or AWS_* equivalents)."
    );
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  // Generate presigned URL valid for 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

