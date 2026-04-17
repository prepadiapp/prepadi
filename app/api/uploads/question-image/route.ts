import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAuthSession } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const fileName = `${randomUUID()}${ext}`;
  const relativeDir = path.join("uploads", "question-images");
  const uploadDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return NextResponse.json({
    url: `/${relativeDir.replace(/\\/g, "/")}/${fileName}`,
  });
}
