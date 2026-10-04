import { randomUUID } from "node:crypto";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import type { ImageStorage } from "./provider";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  StorageNotConfiguredError,
} from "./provider";
export const storageConfigured = () =>
  Boolean(
    process.env.IMAGE_STORAGE_BUCKET &&
    process.env.IMAGE_STORAGE_ACCESS_KEY_ID &&
    process.env.IMAGE_STORAGE_SECRET_ACCESS_KEY &&
    process.env.IMAGE_PUBLIC_HOST,
  );
export function getImageStorage(): ImageStorage {
  if (!storageConfigured()) throw new StorageNotConfiguredError();
  const bucket = process.env.IMAGE_STORAGE_BUCKET!;
  const client = new S3Client({
    region: process.env.IMAGE_STORAGE_REGION ?? "ap-southeast-2",
    endpoint: process.env.IMAGE_STORAGE_ENDPOINT || undefined,
    forcePathStyle: !!process.env.IMAGE_STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.IMAGE_STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.IMAGE_STORAGE_SECRET_ACCESS_KEY!,
    },
  });
  return {
    async createUpload({ contentType, folder }) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType))
        throw new Error("Unsupported image type");
      const ext: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/avif": "avif",
      };
      const storageKey = `${folder}/${randomUUID()}.${ext[contentType]}`;
      const result = await createPresignedPost(client, {
        Bucket: bucket,
        Key: storageKey,
        Expires: 300,
        Fields: { "Content-Type": contentType },
        Conditions: [
          ["content-length-range", 1, MAX_IMAGE_BYTES],
          ["eq", "$Content-Type", contentType],
        ],
      });
      let host = process.env.IMAGE_PUBLIC_HOST!;
      if (!host.startsWith("https://")) host = `https://${host}`;
      return {
        uploadUrl: result.url,
        fields: result.fields,
        publicUrl: `${host.replace(/\/$/, "")}/${storageKey}`,
        storageKey,
        expiresInSec: 300,
      };
    },
    async remove(storageKey) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }),
      );
    },
  };
}
