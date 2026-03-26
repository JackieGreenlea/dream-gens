import { Story, World } from "@/lib/types";

// Compatibility bridge: the active setup model is Story, but some loaders/components
// still pass a world-shaped playable object for legacy/sample flows.
export function createStoryFromWorld(
  world: World,
  worldId: string | null = null,
): Story {
  return {
    ...world,
    worldId,
    visibility: "private",
    slug: null,
    publishedAt: null,
    coverImageUrl: null,
  };
}

export function createWorldFromStory(story: Story): World {
  const {
    worldId: _worldId,
    visibility: _visibility,
    slug: _slug,
    publishedAt: _publishedAt,
    coverImageUrl: _coverImageUrl,
    ...world
  } = story;
  return world;
}
