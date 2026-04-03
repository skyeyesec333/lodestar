import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchDealsAndStakeholders } from "@/lib/db/search";
import { checkRateLimit } from "@/lib/rate-limit";

const searchSchema = z.object({
  q: z.string().trim().min(2, "Query must be at least 2 characters."),
});

const SEARCH_MAX_REQUESTS = 60;
const SEARCH_WINDOW_MS = 60_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, resetMs } = await checkRateLimit(`${userId}:search`, SEARCH_MAX_REQUESTS, SEARCH_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded. Please wait before retrying.", resetMs }, { status: 429 });
  }

  const parsed = searchSchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query." },
      { status: 400 }
    );
  }

  const result = await searchDealsAndStakeholders(userId, parsed.data.q);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value);
}
