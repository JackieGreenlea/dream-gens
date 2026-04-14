import { NextResponse } from "next/server";
import { updateWorldCoverImageForUser } from "@/lib/db";
import {
  buildWorldCoverPublicUrl,
  createWorldCoverPath,
  isAllowedWorldCoverType,
  MAX_WORLD_COVER_BYTES,
  WORLD_COVER_BUCKET,
} from "@/lib/supabase/storage";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getWorldCoverUploadErrorMessage(error: { message?: string; statusCode?: string | number }) {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("bucket not found")) {
    return 'Storage bucket "story-covers" was not found.';
  }

  if (message.includes("row-level security") || message.includes("permission")) {
    return 'World cover upload is blocked by Supabase Storage policy. The "story-covers" bucket must allow authenticated uploads for this route.';
  }

  if (message.includes("not found")) {
    return "Storage upload failed because the cover destination could not be found.";
  }

  return error.message || "The world cover could not be uploaded.";
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
    return NextResponse.json({ error: "Sign in to upload a world cover." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }

  if (!isAllowedWorldCoverType(file.type)) {
    return NextResponse.json({ error: "Upload a JPG, PNG, or WEBP image." }, { status: 400 });
  }

  if (file.size > MAX_WORLD_COVER_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  const supabase = await createClient();
  const path = createWorldCoverPath({
    userId: user.id,
    worldId: id,
    mimeType: file.type,
  });

  const { error: uploadError } = await supabase.storage
    .from(WORLD_COVER_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: getWorldCoverUploadErrorMessage(uploadError) },
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
  } = supabase.storage.from(WORLD_COVER_BUCKET).getPublicUrl(path);

  const world = await updateWorldCoverImageForUser(id, user.id, buildWorldCoverPublicUrl(publicUrl));

  if (!world) {
    return NextResponse.json(
      { error: "World cover uploaded, but the World record could not be updated." },
      { status: 404 },
    );
  }

  return NextResponse.json({ world });
}
