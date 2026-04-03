import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createDocumentRecord } from "@/lib/db/documents";
import { recordActivity } from "@/lib/db/activity";
import { assertProjectAccess } from "@/lib/db/project-access";
import { uploadFile } from "@/lib/storage/client";
import { revalidatePath } from "next/cache";
import { randomUUID, createHash } from "crypto";
import { requestLogger } from "@/lib/logger";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const MAGIC_BYTES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  "image/png": [[0x89, 0x50, 0x4e, 0x47]], // PNG
  "image/jpeg": [[0xff, 0xd8, 0xff]], // JPEG
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04], // ZIP (docx is a zip)
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    [0x50, 0x4b, 0x03, 0x04], // ZIP (xlsx is a zip)
  ],
};

function validateMagicBytes(buffer: Buffer, contentType: string): boolean {
  const signatures = MAGIC_BYTES[contentType];
  if (!signatures) return true; // unknown type, allow through
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  const log = requestLogger({ userId, route: "/api/documents/upload" });

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return new Response("Invalid form data", { status: 400 });

  const file = formData.get("file");
  const projectId = formData.get("projectId");
  const requirementId = formData.get("requirementId"); // optional
  const slug = formData.get("slug");

  if (!(file instanceof File) || typeof projectId !== "string" || typeof slug !== "string") {
    return new Response("Missing required fields", { status: 400 });
  }

  const access = await assertProjectAccess(projectId, userId, "editor");
  if (!access.ok) {
    return new Response(access.error.message, {
      status: access.error.code === "UNAUTHORIZED" ? 403 : 404,
    });
  }

  // Validate file
  if (file.size > MAX_SIZE_BYTES) {
    return new Response("File too large (max 50 MB)", { status: 413 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return new Response("File type not allowed", { status: 415 });
  }

  // Read file buffer for magic byte validation and hash computation
  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate magic bytes
  if (!validateMagicBytes(buffer, file.type)) {
    return new Response("File content does not match declared type.", { status: 400 });
  }

  // Compute SHA-256 hash
  const documentHash = createHash("sha256").update(buffer).digest("hex");

  // Check for duplicate in this project
  const existing = await db.document.findFirst({
    where: { projectId, documentHash },
    select: { id: true, filename: true },
  });
  if (existing) {
    return new Response(
      JSON.stringify({
        error: `A duplicate document already exists: "${existing.filename}"`,
      }),
      { status: 409 }
    );
  }

  // Resolve projectRequirementId if a requirementId was provided
  let projectRequirementId: string | null = null;
  if (typeof requirementId === "string" && requirementId.length > 0) {
    const pr = await db.projectRequirement.findUnique({
      where: { projectId_requirementId: { projectId, requirementId } },
      select: { id: true },
    });
    projectRequirementId = pr?.id ?? null;
  }

  // Build a unique storage path: {projectId}/{groupId}/{filename}
  const documentGroupId = randomUUID();
  const ext = file.name.split(".").pop() ?? "";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${projectId}/${documentGroupId}/${safeName}`;

  const uploadResult = await uploadFile(storagePath, file);
  if (!uploadResult.ok) {
    return new Response(`Upload failed: ${uploadResult.error}`, { status: 500 });
  }

  const dbResult = await createDocumentRecord({
    projectId,
    projectRequirementId,
    documentGroupId,
    version: 1,
    filename: file.name,
    storagePath,
    contentType: file.type,
    sizeBytes: file.size,
    uploadedBy: userId,
    documentHash,
  });

  if (!dbResult.ok) {
    return new Response("Failed to save document record", { status: 500 });
  }

  await recordActivity(
    projectId,
    userId,
    "document_uploaded",
    `${file.name} uploaded`,
    { filename: file.name, requirementId: typeof requirementId === "string" ? requirementId : null }
  );

  revalidatePath(`/projects/${slug || access.value.slug}`);

  return Response.json({ ok: true, document: dbResult.value });
}
