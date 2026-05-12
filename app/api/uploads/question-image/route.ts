import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "path";
import { randomUUID } from "crypto";
import { getAuthSession } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const runtime = "nodejs";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (
      !session?.user ||
      (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new NextResponse("Missing file", { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return new NextResponse("Unsupported image type. Use PNG, JPG, WEBP, or GIF.", { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return new NextResponse("Image is too large. Keep uploads under 5MB.", { status: 400 });
    }

    const inferredExt = MIME_EXTENSION_MAP[file.type] || ".png";
    const safeExt = path.extname(file.name) || inferredExt;
    const pathname = `uploads/question-images/${randomUUID()}${safeExt}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      url: blob.url,
    });
  } catch (error) {
    console.error("[QUESTION_IMAGE_UPLOAD_ERROR]", error);
    return new NextResponse("Could not upload image right now. Please try again.", { status: 500 });
  }
}
