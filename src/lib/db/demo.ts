import type { RequirementStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import { computeReadiness } from "@/lib/scoring/index";
import type { Result } from "@/types";

function buildDemoSlug(): string {
  const suffix = Date.now().toString().slice(-6);
  return `lodestar-demo-project-${suffix}`;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export async function createDemoProjectForUser(
  clerkUserId: string
): Promise<Result<{ projectId: string; slug: string }>> {
  try {
    const slug = buildDemoSlug();

    const requirementStates = new Map<string, { status: RequirementStatus; notes?: string }>([
      ["epc_contract", { status: "draft", notes: "US EPC term sheet agreed. Redlines outstanding on liquidated damages and US-content schedule." }],
      ["offtake_agreement", { status: "substantially_final", notes: "Take-or-pay PPA form aligned with sponsor markups." }],
      ["implementation_agreement", { status: "draft", notes: "Fiscal stabilization and FX convertibility language still under negotiation." }],
      ["concession_agreement", { status: "substantially_final" }],
      ["financial_model", { status: "draft", notes: "Base case updated for turbine delivery timing and IDC." }],
      ["project_budget", { status: "substantially_final" }],
      ["us_content_report", { status: "in_progress", notes: "Awaiting final supplier allocation from EPC." }],
      ["feasibility_study", { status: "substantially_final" }],
      ["independent_engineer_report", { status: "draft", notes: "Preliminary IE report issued; technology section complete." }],
      ["market_study", { status: "substantially_final" }],
      ["host_government_approval", { status: "draft", notes: "Support letter expected after cabinet review." }],
      ["project_company_formation", { status: "executed" }],
      ["kyc_aml_compliance", { status: "in_progress" }],
      ["esia", { status: "draft", notes: "Stakeholder consultation annex still being finalized." }],
      ["stakeholder_engagement", { status: "in_progress" }],
      ["insurance_program", { status: "in_progress" }],
      ["term_sheet", { status: "not_started" }],
      ["security_package", { status: "not_started" }],
    ]);

    const readiness = computeReadiness(
      EXIM_REQUIREMENTS.map((requirement) => ({
        requirementId: requirement.id,
        status: (requirementStates.get(requirement.id)?.status ?? "not_started") as
          | "not_started"
          | "in_progress"
          | "draft"
          | "substantially_final"
          | "executed"
          | "waived",
      }))
    );

    const project = await db.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: "Kisongo Thermal Power Project",
          slug,
          description:
            "180MW greenfield thermal power project with EXIM-targeted EPC package, active off-take negotiations, and a partially assembled LOI data room.",
          countryCode: "TZ",
          sector: "power",
          capexUsdCents: 325_000_000_00n,
          eximCoverType: "comprehensive",
          stage: "pre_loi",
          targetLoiDate: daysFromNow(92),
          targetCloseDate: daysFromNow(245),
          ownerClerkId: clerkUserId,
          cachedReadinessScore: readiness.scoreBps,
          cachedScoreUpdatedAt: new Date(),
        },
        select: { id: true, slug: true, name: true },
      });

      const sponsorOrg = await tx.organization.create({
        data: {
          name: "Kisongo Energy Development Ltd.",
          countryCode: "TZ",
        },
        select: { id: true },
      });

      const epcOrg = await tx.organization.create({
        data: {
          name: "Frontier Turbine Systems Inc.",
          countryCode: "US",
          isUsEntity: true,
        },
        select: { id: true },
      });

      const offtakerOrg = await tx.organization.create({
        data: {
          name: "Tanzania Grid Supply Co.",
          countryCode: "TZ",
        },
        select: { id: true },
      });

      const advisorOrg = await tx.organization.create({
        data: {
          name: "Meridian Infrastructure Advisory",
          countryCode: "US",
          isUsEntity: true,
        },
        select: { id: true },
      });

      await tx.projectSponsor.createMany({
        data: [
          {
            projectId: project.id,
            organizationId: sponsorOrg.id,
            role: "lead_sponsor",
            equityShareBps: 10000,
          },
        ],
      });

      const [sponsorLead, epcLead, offtakerLead, advisorLead] = await Promise.all([
        tx.stakeholder.create({
          data: {
            name: "Amina Dlamini",
            title: "VP Development",
            email: "amina@kisongo.example",
            organizationId: sponsorOrg.id,
          },
          select: { id: true, name: true },
        }),
        tx.stakeholder.create({
          data: {
            name: "Mark Ellison",
            title: "Commercial Director",
            email: "mark@frontierturbine.example",
            organizationId: epcOrg.id,
          },
          select: { id: true, name: true },
        }),
        tx.stakeholder.create({
          data: {
            name: "Neema Mwita",
            title: "Head of Procurement",
            email: "neema@gridsupply.example",
            organizationId: offtakerOrg.id,
          },
          select: { id: true, name: true },
        }),
        tx.stakeholder.create({
          data: {
            name: "David Rosen",
            title: "Financial Advisor",
            email: "david@meridianadvisory.example",
            organizationId: advisorOrg.id,
          },
          select: { id: true, name: true },
        }),
      ]);

      await tx.stakeholderRole.createMany({
        data: [
          { stakeholderId: sponsorLead.id, projectId: project.id, roleType: "sponsor_team", isPrimary: true },
          { stakeholderId: epcLead.id, projectId: project.id, roleType: "epc_contact", isPrimary: true },
          { stakeholderId: offtakerLead.id, projectId: project.id, roleType: "offtaker_contact", isPrimary: true },
          { stakeholderId: advisorLead.id, projectId: project.id, roleType: "financial_advisor", isPrimary: true },
        ],
      });

      await tx.projectRequirement.createMany({
        data: EXIM_REQUIREMENTS.map((requirement) => ({
          projectId: project.id,
          requirementId: requirement.id,
          status: requirementStates.get(requirement.id)?.status ?? "not_started",
          notes: requirementStates.get(requirement.id)?.notes ?? null,
          statusChangedBy: clerkUserId,
        })),
      });

      const epcRequirement = await tx.projectRequirement.findUnique({
        where: {
          projectId_requirementId: {
            projectId: project.id,
            requirementId: "epc_contract",
          },
        },
        select: { id: true },
      });

      const modelRequirement = await tx.projectRequirement.findUnique({
        where: {
          projectId_requirementId: {
            projectId: project.id,
            requirementId: "financial_model",
          },
        },
        select: { id: true },
      });

      const meeting = await tx.meeting.create({
        data: {
          projectId: project.id,
          title: "EXIM Readiness Working Session",
          meetingType: "virtual",
          meetingDate: daysFromNow(-3),
          durationMinutes: 75,
          summary:
            "Reviewed LOI blockers, EPC redlines, ESIA consultation timing, and updated the target path to substantially final documents.",
          createdBy: clerkUserId,
          attendees: {
            create: [
              { stakeholderId: sponsorLead.id },
              { stakeholderId: epcLead.id },
              { stakeholderId: advisorLead.id },
            ],
          },
        },
        select: { id: true },
      });

      await tx.actionItem.createMany({
        data: [
          {
            meetingId: meeting.id,
            projectId: project.id,
            assignedToId: epcLead.id,
            projectRequirementId: epcRequirement?.id ?? null,
            title: "Finalize EPC US-content allocation",
            description: "Deliver updated sourcing schedule with >51% eligible US goods and services support.",
            priority: "critical",
            status: "in_progress",
            dueDate: daysFromNow(7),
          },
          {
            meetingId: meeting.id,
            projectId: project.id,
            assignedToId: sponsorLead.id,
            projectRequirementId: modelRequirement?.id ?? null,
            title: "Update base case financial model",
            description: "Reflect revised turbine lead times and refreshed IDC assumptions before lender review.",
            priority: "high",
            status: "open",
            dueDate: daysFromNow(5),
          },
        ],
      });

      await tx.activityEvent.createMany({
        data: [
          {
            projectId: project.id,
            clerkUserId,
            eventType: "project_created",
            label: "Demo project created",
            metadata: { demo: true },
          },
          {
            projectId: project.id,
            clerkUserId,
            eventType: "requirements_seeded",
            label: "Demo requirement statuses populated",
            metadata: { readinessScoreBps: readiness.scoreBps },
          },
          {
            projectId: project.id,
            clerkUserId,
            eventType: "meeting_logged",
            label: "EXIM readiness working session added",
            metadata: { demo: true },
          },
        ],
      });

      return project;
    });

    return { ok: true, value: { projectId: project.id, slug: project.slug } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}

export async function createDemoPortfolioForUser(
  clerkUserId: string
): Promise<Result<{ projectIds: string[]; leadSlug: string }>> {
  const primary = await createDemoProjectForUser(clerkUserId);
  if (!primary.ok) return primary;

  try {
    const created = await Promise.all([
      db.project.create({
        data: {
          name: "Rufiji Water Treatment Expansion",
          slug: buildDemoSlug(),
          description:
            "Municipal water expansion project with advanced environmental work and a slower commercial bank syndication track.",
          countryCode: "TZ",
          sector: "water",
          capexUsdCents: 148_000_000_00n,
          eximCoverType: "political_only",
          stage: "pre_commitment",
          targetLoiDate: daysFromNow(35),
          targetCloseDate: daysFromNow(180),
          ownerClerkId: clerkUserId,
          cachedReadinessScore: 7420,
          cachedScoreUpdatedAt: new Date(),
          requirementStatuses: {
            createMany: {
              data: EXIM_REQUIREMENTS.map((requirement) => ({
                requirementId: requirement.id,
                status:
                  requirement.phaseRequired === "loi"
                    ? "substantially_final"
                    : requirement.category === "financial"
                    ? "draft"
                    : "in_progress",
                statusChangedBy: clerkUserId,
              })),
            },
          },
          activityEvents: {
            create: [
              {
                clerkUserId,
                eventType: "project_created",
                label: "Demo portfolio project created",
                metadata: { demo: true },
              },
            ],
          },
        },
        select: { id: true, slug: true },
      }),
      db.project.create({
        data: {
          name: "Mwanza Inland Dry Port",
          slug: buildDemoSlug(),
          description:
            "Transport logistics project with early sponsor coordination complete but major LOI-critical documentation still immature.",
          countryCode: "TZ",
          sector: "transport",
          stage: "concept",
          capexUsdCents: 210_000_000_00n,
          ownerClerkId: clerkUserId,
          cachedReadinessScore: 1860,
          cachedScoreUpdatedAt: new Date(),
          requirementStatuses: {
            createMany: {
              data: EXIM_REQUIREMENTS.map((requirement) => ({
                requirementId: requirement.id,
                status:
                  requirement.id === "project_company_formation"
                    ? "executed"
                    : requirement.id === "feasibility_study"
                    ? "draft"
                    : requirement.category === "corporate"
                    ? "in_progress"
                    : "not_started",
                statusChangedBy: clerkUserId,
              })),
            },
          },
          activityEvents: {
            create: [
              {
                clerkUserId,
                eventType: "project_created",
                label: "Demo portfolio project created",
                metadata: { demo: true },
              },
            ],
          },
        },
        select: { id: true, slug: true },
      }),
    ]);

    return {
      ok: true,
      value: {
        projectIds: [primary.value.projectId, ...created.map((project) => project.id)],
        leadSlug: primary.value.slug,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { ok: false, error: { code: "DATABASE_ERROR", message } };
  }
}
