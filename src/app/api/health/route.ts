import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface CheckResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  ok: boolean;
  checks: Record<string, CheckResult>;
  timestamp: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks: Record<string, CheckResult> = {};

  // DB check
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.db = { ok: false, error: "Database unreachable" };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { ok: allOk, checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
