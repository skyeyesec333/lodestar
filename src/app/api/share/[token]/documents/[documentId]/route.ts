import { resolveShareToken } from "@/lib/db/share-links";
import { db } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; documentId: string }> }
) {
  const { token, documentId } = await params;

  const tokenResult = await resolveShareToken(token);
  if (!tokenResult.ok || !tokenResult.value.isValid) {
    return new Response("Invalid or expired share link", { status: 403 });
  }

  const doc = await db.document.findFirst({
    where: {
      id: documentId,
      projectId: tokenResult.value.projectId,
      state: "current",
    },
    select: {
      storagePath: true,
      filename: true,
    },
  });

  if (!doc) {
    return new Response("Document not found", { status: 404 });
  }

  const url = await getSignedUrl(doc.storagePath);
  if (!url) {
    return new Response("Could not generate download URL", { status: 500 });
  }

  return Response.json({ url, filename: doc.filename });
}
