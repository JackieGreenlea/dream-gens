import { NextResponse } from "next/server";
import { updateStoryCoverImageForUser } from "@/lib/db";
import {
  buildStoryCoverPublicUrl,
  isAllowedStoryCoverType,
  MAX_STORY_COVER_BYTES,
  STORY_COVER_BUCKET,
  createStoryCoverPath,
} from "@/lib/supabase/storage";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getStoryCoverUploadErrorMessage(error: { message?: string; statusCode?: string | number }) {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("bucket not found")) {
    return 'Storage bucket "story-covers" was not found.';
  }

  if (message.includes("row-level security") || message.includes("permission")) {
    return 'Story cover upload is blocked by Supabase Storage policy. The "story-covers" bucket must allow authenticated uploads for this route.';
  }

  if (message.includes("not found")) {
    return "Storage upload failed because the cover destination could not be found.";
  }

  return error.message || "The story cover could not be uploaded.";
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to upload a story cover." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }

  if (!isAllowedStoryCoverType(file.type)) {
    return NextResponse.json({ error: "Upload a JPG, PNG, or WEBP image." }, { status: 400 });
  }

  if (file.size > MAX_STORY_COVER_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  // This route uses the signed-in user's Supabase session, so Storage RLS policies
  // on the "story-covers" bucket must allow authenticated uploads for this path.
  const supabase = await createClient();
  const path = createStoryCoverPath({
    userId: user.id,
    storyId: id,
    mimeType: file.type,
  });

  const { error: uploadError } = await supabase.storage
    .from(STORY_COVER_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: getStoryCoverUploadErrorMessage(uploadError) },
      {
        status:
          uploadError.message?.toLowerCase().includes("row-level security") ||
          uploadError.message?.toLowerCase().includes("bucket not found")
            ? 403
            : 502,
      },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORY_COVER_BUCKET).getPublicUrl(path);

  const story = await updateStoryCoverImageForUser(id, user.id, buildStoryCoverPublicUrl(publicUrl));

  if (!story) {
    return NextResponse.json(
      { error: "Story cover uploaded, but the Story record could not be updated." },
      { status: 404 },
    );
  }

  return NextResponse.json({ story });
}
