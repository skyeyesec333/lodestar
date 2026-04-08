import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveShareToken } from "@/lib/db/share-links";
import { recordActivity } from "@/lib/db/activity";

const feedbackSchema = z.object({
  name: z.string().max(200).default(""),
  email: z.string().max(200).default(""),
  message: z.string().min(1, "Message is required.").max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  const tokenResult = await resolveShareToken(token);
  if (!tokenResult.ok || !tokenResult.value.isValid) {
    return NextResponse.json({ error: "Invalid or expired share link." }, { status: 403 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { name, email, message } = parsed.data;
  const { projectId } = tokenResult.value;

  await recordActivity(
    projectId,
    "system",
    "external_feedback_received",
    `External feedback from ${name || "anonymous"}: ${message.slice(0, 120)}`,
    {
      senderName: name || "anonymous",
      senderEmail: email || null,
      message,
      source: "share_link",
    },
  );

  return NextResponse.json({ ok: true });
}
