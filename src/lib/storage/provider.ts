// Image storage contract. Product rows store the public URL + storageKey only – never local paths.
export type PresignedUpload = {
  uploadUrl: string;
  fields?: Record<string, string>;
  publicUrl: string;
  storageKey: string;
  expiresInSec: number;
};

export interface ImageStorage {
  /** Browser uploads directly to the bucket; our server never proxies large files. */
  createUpload(args: {
    filename: string;
    contentType: string;
    folder: "products" | "categories" | "banners" | "reviews";
  }): Promise<PresignedUpload>;
  remove(storageKey: string): Promise<void>;
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Image storage is not configured: set the IMAGE_STORAGE_* variables.",
    );
  }
}
