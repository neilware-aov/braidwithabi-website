// Style photos uploaded from the owner app.
import { NextResponse } from "next/server";
import { getStylePhoto } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const photo = await getStylePhoto(id);
  if (!photo) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(photo.data, "base64"), {
    headers: {
      "Content-Type": photo.mime,
      // The URL changes (?v=…) whenever the photo is replaced, so it can be cached for good.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
