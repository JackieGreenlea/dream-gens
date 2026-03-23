// Compatibility API wrapper for older StoryRoot-based clients.
// The real setup API is /api/stories/[id], so this file is intentionally just a passthrough.
export { runtime, GET, PATCH, DELETE } from "@/app/api/stories/[id]/route";
