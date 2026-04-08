import { auth } from "@clerk/nextjs/server";
import { getPortfolioStats } from "@/lib/db/portfolio";
import { computeReadinessTrendline } from "@/lib/scoring/trendline";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rateLimit = await checkRateLimit(`portfolio-trendline:${userId}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rateLimit.resetMs / 1000)) },
    });
  }

  const portfolioResult = await getPortfolioStats(userId);
  if (!portfolioResult.ok) {
    return new Response(portfolioResult.error.message, { status: 500 });
  }

  const projects = portfolioResult.value;
  if (projects.length === 0) {
    return Response.json({ projects: [], avgCurrentBps: 0, avgSevenDayBps: null, avgThirtyDayBps: null });
  }

  const trendlines = await Promise.all(
    projects.map(async (p) => {
      const result = await computeReadinessTrendline(
        p.id,
        p.readinessBps ?? p.readinessScore * 100,
        p.dealType,
      );
      return {
        projectId: p.id,
        projectName: p.name,
        trendline: result.ok ? result.value : null,
      };
    }),
  );

  const withData = trendlines.filter((t) => t.trendline !== null);
  const avgCurrent = withData.length > 0
    ? Math.round(withData.reduce((s, t) => s + t.trendline!.currentScoreBps, 0) / withData.length)
    : 0;

  const withSevenDay = withData.filter((t) => t.trendline!.sevenDayAvgBps !== null);
  const avgSevenDay = withSevenDay.length > 0
    ? Math.round(withSevenDay.reduce((s, t) => s + t.trendline!.sevenDayAvgBps!, 0) / withSevenDay.length)
    : null;

  const withThirtyDay = withData.filter((t) => t.trendline!.thirtyDayAvgBps !== null);
  const avgThirtyDay = withThirtyDay.length > 0
    ? Math.round(withThirtyDay.reduce((s, t) => s + t.trendline!.thirtyDayAvgBps!, 0) / withThirtyDay.length)
    : null;

  return Response.json({
    projects: trendlines.map((t) => ({
      id: t.projectId,
      name: t.projectName,
      currentBps: t.trendline?.currentScoreBps ?? 0,
      sevenDayBps: t.trendline?.sevenDayAvgBps ?? null,
      thirtyDayBps: t.trendline?.thirtyDayAvgBps ?? null,
      isStalled: t.trendline?.isStalled ?? false,
    })),
    avgCurrentBps: avgCurrent,
    avgSevenDayBps: avgSevenDay,
    avgThirtyDayBps: avgThirtyDay,
  });
}
