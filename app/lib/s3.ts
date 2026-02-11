import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.RAILWAY_BUCKET_NAME;
const ENDPOINT = process.env.RAILWAY_BUCKET_ENDPOINT || "https://storage.railway.app";

if (!BUCKET) {
  // eslint-disable-next-line no-console
  console.warn("[s3] RAILWAY_BUCKET_NAME is not set; Railway uploads will fail until configured.");
}

const s3Client = BUCKET
  ? new S3Client({
      endpoint: ENDPOINT,
      region: "auto", // Railway uses "auto" region
      // Credentials are picked up from env (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
    })
  : null;

export async function uploadVisitorPhoto(base64DataUrl: string): Promise<string> {
  if (!s3Client || !BUCKET) {
    throw new Error("Railway Bucket is not configured (RAILWAY_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).");
  }

  const match = base64DataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid data URL for photo upload.");
  }

  const mimeType = match[1]; // e.g. image/jpeg
  const base64 = match[2];

  const buffer = Buffer.from(base64, "base64");

  const key = `visits/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.jpg`;

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
    throw new Error("Railway Bucket is not configured.");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  // Generate presigned URL valid for 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

