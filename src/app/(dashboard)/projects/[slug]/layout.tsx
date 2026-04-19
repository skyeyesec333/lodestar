import { Suspense } from "react";
import dynamic from "next/dynamic";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getCachedProjectBySlug, getProjectSidebarSignals } from "@/lib/db/projects";
import { ProjectSidebar } from "@/components/projects/ProjectSidebar";
import { BeaconProvider } from "@/components/beacon/BeaconProvider";
import { WorkspaceBeaconSync } from "@/components/beacon/WorkspaceBeaconSync";
import { FirstRunOverlay } from "@/components/projects/FirstRunOverlay";
import { getProjectDetailChatPresets } from "@/lib/ai/chat-presets";

const BeaconPanel = dynamic(
  () => import("@/components/beacon/BeaconPanel").then((m) => ({ default: m.BeaconPanel })),
  { loading: () => null }
);

/**
 * Shared shell for `/projects/[slug]` and every per-section subroute. Owns:
 * - sidebar + data signals for its badges
 * - `BeaconProvider` context (AI chat, walkthrough state, workspace tracking)
 * - persistent `BeaconPanel`, `WorkspaceBeaconSync`, `FirstRunOverlay`
 *
 * Rich Beacon context (signals, documentCoverage, walkthroughData) only renders
 * on the Summary root — the layout-level Beacon has approximate context derived
 * from the cached project + sidebar signals, which is enough for the AI chat to
 * answer general project questions everywhere.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { slug } = await params;

  const projectResult = await getCachedProjectBySlug(slug, userId);
  if (!projectResult.ok) {
    if (projectResult.error.code === "NOT_FOUND") notFound();
    throw new Error(projectResult.error.message);
  }
  const project = projectResult.value;

  const signals = await getProjectSidebarSignals(project.id);

  const readinessBps = project.cachedReadinessScore ?? 0;
  const chatPresets = getProjectDetailChatPresets({
    projectName: project.name,
    dealType: project.dealType,
    scoreBps: readinessBps,
    loiReady: readinessBps >= 7500,
    loiBlockerCount: signals.workplanBlockers,
  });

  return (
    <BeaconProvider>
      <span data-project-name={project.name} hidden />
      <Suspense fallback={null}>
        <FirstRunOverlay
          dealType={project.dealType}
          projectSlug={project.slug}
          projectName={project.name}
        />
      </Suspense>
      <WorkspaceBeaconSync />

      <div className="ls-project-shell">
        <ProjectSidebar
          projectSlug={project.slug}
          projectName={project.name}
          projectStage={project.stage}
          projectDealType={project.dealType}
          readinessBps={project.cachedReadinessScore}
          signals={signals}
        />
        <div className="ls-project-main">{children}</div>
      </div>

      <BeaconPanel
        presetQuestions={chatPresets}
        context={{ page: "project_detail", projectId: project.id, projectSlug: project.slug }}
        pageContext={`Deal detail for ${project.name}. Country ${project.countryCode}. Sector ${project.sector}. Stage ${project.stage.replace(/_/g, " ")}. Deal type ${project.dealType.replace(/_/g, " ")}. Readiness ${(readinessBps / 100).toFixed(1)}%.`}
        projectName={project.name}
        dealType={project.dealType}
        readinessPct={readinessBps / 100}
        loiBlockerCount={signals.workplanBlockers}
      />
    </BeaconProvider>
  );
}
