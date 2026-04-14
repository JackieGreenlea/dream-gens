export const STORY_COVER_BUCKET = "story-covers";
export const MAX_STORY_COVER_BYTES = 5 * 1024 * 1024;
export const STORY_COVER_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
] as const);

export function isAllowedStoryCoverType(mimeType: string) {
  return STORY_COVER_ALLOWED_TYPES.has(
    mimeType as (typeof STORY_COVER_ALLOWED_TYPES extends Set<infer T> ? T : never),
  );
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export function createStoryCoverPath(params: {
  userId: string;
  storyId: string;
  mimeType: string;
}) {
  const extension = extensionForMimeType(params.mimeType);

  if (!extension) {
    throw new Error("Unsupported story cover image type.");
  }

  return `${params.userId}/${params.storyId}/cover.${extension}`;
}

export function buildStoryCoverPublicUrl(publicUrl: string) {
  return `${publicUrl}?v=${Date.now()}`;
}
