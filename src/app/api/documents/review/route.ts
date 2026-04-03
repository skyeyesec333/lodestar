import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { assertProjectAccess } from "@/lib/db/project-access";
import { reviewDocument } from "@/lib/ai/document-review";
import { REQUIREMENTS_BY_ID } from "@/lib/exim/requirements";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).documentId !== "string" ||
    typeof (body as Record<string, unknown>).projectId !== "string"
  ) {
    return new Response("Missing required fields: documentId and projectId", {
      status: 400,
    });
  }

  const { documentId, projectId, additionalContext } = body as {
    documentId: string;
    projectId: string;
    additionalContext?: string;
  };

  if (documentId.trim().length === 0 || projectId.trim().length === 0) {
    return new Response("documentId and projectId must be non-empty", {
      status: 400,
    });
  }

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) {
    return new Response(access.error.message, {
      status: access.error.code === "UNAUTHORIZED" ? 403 : 404,
    });
  }

  const project = await db.project.findFirst({
    where: { id: projectId },
    select: { id: true, sector: true, countryCode: true, stage: true },
  });
  if (!project) return new Response("Not found", { status: 404 });

  // Fetch document with state, size, upload date, and linked requirement
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: {
      filename: true,
      contentType: true,
      sizeBytes: true,
      state: true,
      createdAt: true,
      projectRequirement: {
        select: {
          requirement: {
            select: { id: true, name: true, category: true },
          },
        },
      },
    },
  });

  if (!doc) return new Response("Document not found", { status: 404 });

  const requirementName = doc.projectRequirement?.requirement.name ?? null;
  const requirementCategory =
    doc.projectRequirement?.requirement.category ?? null;

  // Look up the full requirement definition from the static taxonomy to get the description
  const requirementId = doc.projectRequirement?.requirement.id ?? null;
  const taxonomyEntry =
    requirementId !== null ? (REQUIREMENTS_BY_ID.get(requirementId) ?? null) : null;
  const requirementDescription = taxonomyEntry?.description ?? null;

  try {
    const result = await reviewDocument({
      filename: doc.filename,
      requirementName,
      requirementCategory,
      requirementDescription,
      documentType: doc.contentType,
      documentState: doc.state,
      documentSizeBytes: doc.sizeBytes,
      documentUploadedAt: doc.createdAt,
      projectSector: project.sector,
      projectCountry: project.countryCode,
      projectStage: project.stage,
      additionalContext:
        typeof additionalContext === "string" ? additionalContext : undefined,
    });

    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI review failed unexpectedly";
    return new Response(message, { status: 500 });
  }
}
