/**
 * Browser-side image optimizer.
 * Resizes and converts any picked image to WebP before it ever reaches the network.
 * Zero external dependencies — uses the native Canvas API.
 *
 * Usage (in a React component, runs entirely in the browser):
 *
 *   import { optimizeImage, buildStoragePath } from "@inventaryexpert/utils/image";
 *
 *   async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
 *     const file = e.target.files?.[0];
 *     if (!file) return;
 *     const blob = await optimizeImage(file, { maxWidth: 800, quality: 0.82 });
 *     const path = buildStoragePath("items", companyId, itemId);
 *     await supabase.storage.from("items").upload(path, blob, { upsert: true });
 *   }
 */

export interface OptimizeOptions {
  /**
   * Maximum pixel width. Height is scaled proportionally.
   * Defaults per bucket:
   *   logos  → 400   (square logo)
   *   avatars → 256  (small avatar)
   *   items   → 800  (catalogue card)
   *   assets  → 1200 (field photo, may need more detail)
   */
  maxWidth?: number;
  /**
   * WebP quality 0–1. 0.82 is a good default — visually transparent compression.
   */
  quality?: number;
}

const DEFAULTS: Required<OptimizeOptions> = {
  maxWidth: 800,
  quality: 0.82,
};

/**
 * Resizes and re-encodes an image File/Blob to WebP using the Canvas API.
 * Returns a Blob ready for upload.
 *
 * Throws if the browser does not support canvas toBlob (all modern browsers do).
 */
export async function optimizeImage(
  source: File | Blob,
  options?: OptimizeOptions,
): Promise<Blob> {
  const { maxWidth, quality } = { ...DEFAULTS, ...options };

  // 1. Decode the image into a bitmap
  const bitmap = await createImageBitmap(source);

  // 2. Calculate output dimensions — never upscale
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  // 3. Draw onto an offscreen canvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("OffscreenCanvas 2D context not available");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // 4. Export as WebP
  return canvas.convertToBlob({ type: "image/webp", quality });
}

// ---------------------------------------------------------------------------
// Storage path helpers
// ---------------------------------------------------------------------------

type Bucket = "logos" | "avatars" | "items" | "assets";

/**
 * Builds the canonical storage path for a given bucket and record.
 *
 * logos   → logos/{companyId}/logo.webp
 * avatars → avatars/{userId}/avatar.webp
 * items   → items/{companyId}/{itemId}/cover.webp
 * assets  → assets/{companyId}/{assetId}/photo.webp
 */
export function buildStoragePath(bucket: "logos", companyId: string): string;
export function buildStoragePath(bucket: "avatars", userId: string): string;
export function buildStoragePath(
  bucket: "items",
  companyId: string,
  itemId: string,
): string;
export function buildStoragePath(
  bucket: "assets",
  companyId: string,
  assetId: string,
): string;
export function buildStoragePath(
  bucket: Bucket,
  firstSegment: string,
  secondSegment?: string,
): string {
  switch (bucket) {
    case "logos":
      return `${firstSegment}/logo.webp`;
    case "avatars":
      return `${firstSegment}/avatar.webp`;
    case "items":
      return `${firstSegment}/${secondSegment}/cover.webp`;
    case "assets":
      return `${firstSegment}/${secondSegment}/photo.webp`;
  }
}

/**
 * Default optimization presets per bucket.
 * Pass to optimizeImage() as the second argument.
 */
export const imagePresets = {
  logos: { maxWidth: 400, quality: 0.85 },
  avatars: { maxWidth: 256, quality: 0.85 },
  items: { maxWidth: 800, quality: 0.82 },
  assets: { maxWidth: 1200, quality: 0.82 },
} satisfies Record<Bucket, Required<OptimizeOptions>>;

// ---------------------------------------------------------------------------
// Public URL helper
// ---------------------------------------------------------------------------

/**
 * Derive the public URL from a storage path for the two public buckets
 * (logos, avatars). Private buckets (items, assets) require a signed URL
 * obtained via supabase.storage.from(bucket).createSignedUrl(path, 3600).
 */
export function getPublicUrl(
  supabaseUrl: string,
  bucket: "logos" | "avatars",
  path: string,
): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
