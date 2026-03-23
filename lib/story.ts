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
  };
}

export function createWorldFromStory(story: Story): World {
  const { worldId: _worldId, ...world } = story;
  return world;
}
