import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { assertProjectAccess } from "@/lib/db/project-access";
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
      projectId: true,
      storagePath: true,
    },
  });

  if (!doc) {
    return new Response("Not found", { status: 404 });
  }

  const access = await assertProjectAccess(doc.projectId, userId, "viewer");
  if (!access.ok) {
    return new Response(access.error.message, {
      status: access.error.code === "UNAUTHORIZED" ? 403 : 404,
    });
  }

  const url = await getSignedUrl(doc.storagePath);
  if (!url) return new Response("Could not generate signed URL", { status: 500 });

  return Response.json({ url });
}
