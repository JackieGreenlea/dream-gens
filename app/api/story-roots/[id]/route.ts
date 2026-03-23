// Compatibility API wrapper for older StoryRoot-based clients.
// The real setup API is /api/stories/[id], so this file is intentionally just a passthrough.
export const runtime = "nodejs";
export { GET, PATCH, DELETE } from "@/app/api/stories/[id]/route";
