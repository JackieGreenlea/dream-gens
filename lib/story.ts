import { Story, World } from "@/lib/types";

// Compatibility bridge: the active setup model is Story, but some loaders/components
// still pass a world-shaped playable object for legacy/sample flows.
export function createStoryFromWorld(
  world: World,
  worldId: string | null = null,
): Story {
  const tags =
    "tags" in world && Array.isArray(world.tags)
      ? world.tags.filter((tag): tag is string => typeof tag === "string")
      : [];

  return {
    ...world,
    worldId,
    visibility: "private",
    slug: null,
    publishedAt: null,
    coverImageUrl: null,
    tags,
  };
}

export function createWorldFromStory(story: Story): World {
  const {
    worldId: _worldId,
    visibility: _visibility,
    slug: _slug,
    publishedAt: _publishedAt,
    coverImageUrl: _coverImageUrl,
    tags: _tags,
    ...world
  } = story;
  return world;
}
