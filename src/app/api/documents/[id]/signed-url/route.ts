import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  const doc = await db.document.findFirst({
    where: { id },
    select: {
      storagePath: true,
      project: { select: { ownerClerkId: true } },
    },
  });

  if (!doc || doc.project.ownerClerkId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  const url = await getSignedUrl(doc.storagePath);
  if (!url) return new Response("Could not generate signed URL", { status: 500 });

  return Response.json({ url });
}
