import { PlayableStory, Story } from "@/lib/types";

export function toPlayableStory(story: Story): PlayableStory {
  const {
    visibility: _visibility,
    slug: _slug,
    publishedAt: _publishedAt,
    coverImageUrl: _coverImageUrl,
    tags: _tags,
    ...playableStory
  } = story;
  return playableStory;
}
