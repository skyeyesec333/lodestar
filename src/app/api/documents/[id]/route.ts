import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { deleteDocumentRecord } from "@/lib/db/documents";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import { deleteFile } from "@/lib/storage/client";
import { revalidatePath } from "next/cache";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  // Find doc to get projectId + slug for access check
  const doc = await db.document.findFirst({
    where: { id },
    select: {
      id: true,
      projectId: true,
      filename: true,
      project: { select: { slug: true } },
    },
  });

  if (!doc) {
    return new Response("Not found", { status: 404 });
  }

  const access = await assertProjectAccess(doc.projectId, userId, "editor");
  if (!access.ok) {
    return new Response(access.error.message, {
      status: access.error.code === "UNAUTHORIZED" ? 403 : 404,
    });
  }

  const result = await deleteDocumentRecord(id, doc.projectId);
  if (!result.ok) return new Response("Delete failed", { status: 500 });

  // Best-effort storage delete — don't fail the request if storage removal fails
  await deleteFile(result.value.storagePath).catch(() => {});

  await recordActivity(
    doc.projectId,
    userId,
    "document_deleted",
    `${doc.filename} deleted`
  );

  revalidatePath(`/projects/${doc.project.slug}`);

  return Response.json({ ok: true });
}
