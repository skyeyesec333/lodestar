import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { reviewDocument } from "@/lib/ai/document-review";
import { REQUIREMENTS_BY_ID } from "@/lib/exim/requirements";
import { getProjectAccessBySlug, hasMinimumProjectRole } from "@/lib/db/project-access";

const bodySchema = z.object({
  additionalContext: z.string().max(2000).optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string; documentId: string }> }
): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`doc-review:${userId}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait before running another review." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateLimit.resetMs - Date.now()) / 1000)) },
      }
    );
  }

  const { slug, documentId } = await context.params;

  let body: unknown;
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Resolve project and verify editor-level access — viewers cannot trigger AI reviews
  const access = await getProjectAccessBySlug(slug, userId);
  if (!access) {
    return Response.json({ error: "Project not found or access denied." }, { status: 404 });
  }
  if (!hasMinimumProjectRole(access.role, "editor")) {
    return Response.json(
      { error: "You need editor access to run an AI review." },
      { status: 403 }
    );
  }

  // Fetch the project fields needed for context
  const project = await db.project.findFirst({
    where: { id: access.projectId },
    select: { sector: true, countryCode: true, stage: true },
  });
  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  // Fetch document — must belong to this project
  const doc = await db.document.findFirst({
    where: { id: documentId, projectId: access.projectId },
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

  if (!doc) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  const requirementName = doc.projectRequirement?.requirement.name ?? null;
  const requirementCategory = doc.projectRequirement?.requirement.category ?? null;
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
      additionalContext: parsed.data.additionalContext,
    });

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI review failed unexpectedly";
    return Response.json({ error: message }, { status: 500 });
  }
}
