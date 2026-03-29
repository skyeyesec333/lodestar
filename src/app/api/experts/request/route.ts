import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EXPERTS } from "@/lib/experts/directory";
import { sendConsultationRequestEmail } from "@/lib/notifications/email";

const requestSchema = z.object({
  expertId: z.string().min(1),
  context: z.string().min(10, "Please describe your situation in at least 10 characters."),
  timing: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { expertId, context, timing } = parsed.data;
  const expertName =
    EXPERTS.find((expert) => expert.id === expertId)?.name ?? expertId;

  void sendConsultationRequestEmail({
    expertId,
    expertName,
    userId,
    context,
    timing,
  }).catch(console.error);

  console.log(
    `[Expert Request] expertId: ${expertId}, userId: ${userId}, timing: ${timing}, contextLength: ${context.length}`
  );

  return NextResponse.json({ ok: true });
}
