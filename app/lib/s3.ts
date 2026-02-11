import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Railway: use BUCKET for the S3 API (globally unique name). RAILWAY_BUCKET_NAME is the display name only.
const BUCKET = process.env.BUCKET ?? process.env.RAILWAY_BUCKET_NAME;
const ENDPOINT = process.env.ENDPOINT ?? process.env.RAILWAY_BUCKET_ENDPOINT ?? "https://storage.railway.app";
const REGION = process.env.REGION ?? "auto";
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
        forcePathStyle: true, // required for some Railway buckets; use path-style URLs
      })
    : null;

export async function uploadVisitorPhoto(base64DataUrl: string): Promise<string> {
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

