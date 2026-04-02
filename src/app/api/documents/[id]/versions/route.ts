import { auth } from "@clerk/nextjs/server";
import { assertProjectAccess } from "@/lib/db/project-access";
import { getDocumentVersionHistory } from "@/lib/db/documents";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id: documentGroupId } = await params;
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return new Response("projectId query parameter is required", { status: 400 });
  }

  const access = await assertProjectAccess(projectId, userId, "viewer");
  if (!access.ok) {
    return new Response(access.error.message, {
      status: access.error.code === "UNAUTHORIZED" ? 403 : 404,
    });
  }

  const result = await getDocumentVersionHistory(documentGroupId, projectId);
  if (!result.ok) {
    return new Response(result.error.message, { status: 500 });
  }

  return Response.json(result.value);
}
