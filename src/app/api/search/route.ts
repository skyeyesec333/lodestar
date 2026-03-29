import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchDealsAndStakeholders } from "@/lib/db/search";

const searchSchema = z.object({
  q: z.string().trim().min(2, "Query must be at least 2 characters."),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
