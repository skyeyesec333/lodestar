import type {
  RequirementStatus,
  StakeholderRoleType,
  FunderType,
  FunderEngagementStage,
} from "@prisma/client";
import { db } from "@/lib/db";
import { EXIM_REQUIREMENTS } from "@/lib/exim/requirements";
import { DEMO_PROJECT_SLUG_PREFIX, isDemoProjectSlug } from "@/lib/projects/demo-portfolio";
import { computeReadiness } from "@/lib/scoring/index";
import { toDbError } from "@/lib/utils";
import type { Result } from "@/types";

function buildDemoSlug(): string {
  const timePart = Date.now().toString().slice(-6);
  const randomPart = Math.random().toString(36).slice(2, 6);
  return `${DEMO_PROJECT_SLUG_PREFIX}${timePart}-${randomPart}`;
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
    const existingDemo = await db.project.findFirst({
      where: {
        ownerClerkId: clerkUserId,
        activityEvents: {
          some: {
            eventType: "project_created",
            label: "Demo project created",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (existingDemo) {
      return { ok: true, value: { projectId: existingDemo.id, slug: existingDemo.slug } };
    }

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
      })),
      "exim_project_finance"
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
    return { ok: false, error: toDbError(err) };
  }
}

type DemoPartyKind = "sponsor" | "epc" | "offtaker" | "advisor" | "gov_liaison" | "funder";

type DemoPartySeed = {
  kind: DemoPartyKind;
  org: { name: string; countryCode: string; isUsEntity?: boolean };
  /** Optional stakeholder (people). Funders typically have no contact on file yet. */
  stakeholder?: {
    name: string;
    title: string;
    email?: string;
    /** Days ago for the last recorded contact. `null` = never contacted. Drives graph "stale" vs "active". */
    lastContactDaysAgo: number | null;
  };
  /** StakeholderRole.roleType for the project, when a stakeholder exists. */
  roleType?: StakeholderRoleType;
  isPrimary?: boolean;
  /** If true, register a ProjectSponsor for this org. */
  leadSponsorEquityBps?: number;
  /** If set, register a FunderRelationship. */
  funder?: {
    funderType: FunderType;
    engagementStage: FunderEngagementStage;
    amountUsdCents?: bigint;
    lastContactDaysAgo?: number;
  };
  /**
   * If set, override the named requirement so this org is the responsible party
   * and the target date is in the past — the graph renders this node as "blocked".
   */
  ownsOverdueRequirement?: { requirementId: string; daysOverdue: number };
};

type DemoPortfolioSeed = {
  name: string;
  createData: {
    description: string;
    countryCode: string;
    sector: "power" | "water" | "transport" | "telecom" | "mining" | "other";
    capexUsdCents: bigint;
    eximCoverType?: "comprehensive" | "political_only";
    stage: "concept" | "pre_loi" | "loi_submitted" | "loi_approved" | "pre_commitment" | "final_commitment" | "financial_close";
    targetLoiDate?: Date;
    targetCloseDate?: Date;
    cachedReadinessScore: number;
  };
  requirementStatus: (req: { id: string; phaseRequired: string; category: string }) => RequirementStatus;
  parties: DemoPartySeed[];
};

export async function createDemoPortfolioForUser(
  clerkUserId: string
): Promise<Result<{ projectIds: string[]; leadSlug: string }>> {
  const primary = await createDemoProjectForUser(clerkUserId);
  if (!primary.ok) return primary;

  try {
    const demoPortfolioSeeds: DemoPortfolioSeed[] = [
      {
        name: "Rufiji Water Treatment Expansion",
        createData: {
          description:
            "Municipal water expansion project with advanced environmental work and a slower commercial bank syndication track.",
          countryCode: "TZ",
          sector: "water",
          capexUsdCents: 148_000_000_00n,
          eximCoverType: "political_only",
          stage: "pre_commitment",
          targetLoiDate: daysFromNow(35),
          targetCloseDate: daysFromNow(180),
          cachedReadinessScore: 7420,
        },
        requirementStatus: (req) =>
          req.phaseRequired === "loi"
            ? "substantially_final"
            : req.category === "financial"
              ? "draft"
              : "in_progress",
        parties: [
          {
            kind: "sponsor",
            org: { name: "Rufiji Water Authority", countryCode: "TZ" },
            stakeholder: {
              name: "Noor Abebe",
              title: "Director of Capital Projects",
              email: "noor@rufiji-water.example",
              lastContactDaysAgo: 3,
            },
            roleType: "sponsor_team",
            isPrimary: true,
            leadSponsorEquityBps: 10000,
          },
          {
            kind: "epc",
            org: { name: "Atlas Municipal Systems", countryCode: "US", isUsEntity: true },
            stakeholder: {
              name: "Priya Natesan",
              title: "VP Infrastructure Delivery",
              email: "priya@atlasmunicipal.example",
              lastContactDaysAgo: 5,
            },
            roleType: "epc_contact",
            isPrimary: true,
          },
          {
            kind: "offtaker",
            org: { name: "Dar es Salaam Municipality", countryCode: "TZ" },
            stakeholder: {
              name: "Joseph Mwenda",
              title: "Water & Sanitation Commissioner",
              email: "joseph.mwenda@dar.example",
              lastContactDaysAgo: 22,
            },
            roleType: "offtaker_contact",
            isPrimary: true,
            ownsOverdueRequirement: { requirementId: "host_government_approval", daysOverdue: 9 },
          },
          {
            kind: "advisor",
            org: { name: "Bluepeak Infrastructure Partners", countryCode: "US", isUsEntity: true },
            stakeholder: {
              name: "Sara Levitt",
              title: "Managing Director",
              email: "sara@bluepeak.example",
              lastContactDaysAgo: 4,
            },
            roleType: "financial_advisor",
            isPrimary: true,
          },
          {
            kind: "funder",
            org: { name: "African Development Bank", countryCode: "CI" },
            funder: {
              funderType: "dfi",
              engagementStage: "due_diligence",
              amountUsdCents: 95_000_000_00n,
              lastContactDaysAgo: 8,
            },
          },
        ],
      },
      {
        name: "Mwanza Inland Dry Port",
        createData: {
          description:
            "Transport logistics project with early sponsor coordination complete but major LOI-critical documentation still immature.",
          countryCode: "TZ",
          sector: "transport",
          capexUsdCents: 210_000_000_00n,
          stage: "concept",
          cachedReadinessScore: 1860,
        },
        requirementStatus: (req) =>
          req.id === "project_company_formation"
            ? "executed"
            : req.id === "feasibility_study"
              ? "draft"
              : req.category === "corporate"
                ? "in_progress"
                : "not_started",
        parties: [
          {
            kind: "sponsor",
            org: { name: "Mwanza Logistics Holdings", countryCode: "TZ" },
            stakeholder: {
              name: "Fatima Ayodele",
              title: "Chief Development Officer",
              email: "fatima@mwanzalogistics.example",
              lastContactDaysAgo: 6,
            },
            roleType: "sponsor_team",
            isPrimary: true,
            leadSponsorEquityBps: 8500,
          },
          {
            kind: "epc",
            org: { name: "Pacific Rail & Container Systems", countryCode: "US", isUsEntity: true },
            stakeholder: {
              name: "Kenji Hayashi",
              title: "Head of Global Projects",
              email: "kenji@pacificrail.example",
              lastContactDaysAgo: 35,
            },
            roleType: "epc_contact",
            isPrimary: true,
            ownsOverdueRequirement: { requirementId: "feasibility_study", daysOverdue: 14 },
          },
          {
            kind: "gov_liaison",
            org: { name: "Tanzania Ports Authority", countryCode: "TZ" },
            stakeholder: {
              name: "Ahmed Said",
              title: "Director of Inland Ports",
              email: "ahmed.said@tpa.example",
              lastContactDaysAgo: 2,
            },
            roleType: "government_liaison",
            isPrimary: true,
          },
          {
            kind: "advisor",
            org: { name: "Horizon Infrastructure Partners", countryCode: "US", isUsEntity: true },
            stakeholder: {
              name: "Monica Garrett",
              title: "Senior Advisor",
              email: "monica@horizoninfra.example",
              lastContactDaysAgo: null,
            },
            roleType: "financial_advisor",
            isPrimary: true,
          },
        ],
      },
    ];

    const existingSecondaryProjects = await db.project.findMany({
      where: {
        ownerClerkId: clerkUserId,
        name: { in: demoPortfolioSeeds.map((seed) => seed.name) },
        activityEvents: {
          some: {
            eventType: "project_created",
            label: "Demo portfolio project created",
          },
        },
      },
      select: { id: true, slug: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const existingByName = new Map<string, { id: string; slug: string }>();
    for (const project of existingSecondaryProjects) {
      if (!isDemoProjectSlug(project.slug) || existingByName.has(project.name)) {
        continue;
      }
      existingByName.set(project.name, { id: project.id, slug: project.slug });
    }

    const created = await Promise.all(
      demoPortfolioSeeds.map(async (seed) => {
        const existingProject = existingByName.get(seed.name);
        if (existingProject) {
          return existingProject;
        }

        return db.$transaction(async (tx) => {
          // 1. Create one Organization per party seed (skipped for parties with no org).
          const orgIdByKind = new Map<DemoPartyKind, string>();
          for (const party of seed.parties) {
            const org = await tx.organization.create({
              data: {
                name: party.org.name,
                countryCode: party.org.countryCode,
                isUsEntity: party.org.isUsEntity ?? false,
              },
              select: { id: true },
            });
            orgIdByKind.set(party.kind, org.id);
          }

          // 2. Create the project first so we have an id for cascading rows. Requirement
          //    overrides (responsibleOrganizationId + overdue targetDate) drive the graph's
          //    "blocked" health derivation.
          const overrides = new Map<
            string,
            { responsibleOrganizationId: string; targetDate: Date }
          >();
          for (const party of seed.parties) {
            if (!party.ownsOverdueRequirement) continue;
            const orgId = orgIdByKind.get(party.kind);
            if (!orgId) continue;
            overrides.set(party.ownsOverdueRequirement.requirementId, {
              responsibleOrganizationId: orgId,
              targetDate: daysFromNow(-party.ownsOverdueRequirement.daysOverdue),
            });
          }

          const project = await tx.project.create({
            data: {
              name: seed.name,
              slug: buildDemoSlug(),
              ownerClerkId: clerkUserId,
              cachedScoreUpdatedAt: new Date(),
              ...seed.createData,
              requirementStatuses: {
                createMany: {
                  data: EXIM_REQUIREMENTS.map((requirement) => {
                    const override = overrides.get(requirement.id);
                    return {
                      requirementId: requirement.id,
                      status: seed.requirementStatus(requirement),
                      statusChangedBy: clerkUserId,
                      responsibleOrganizationId: override?.responsibleOrganizationId ?? null,
                      targetDate: override?.targetDate ?? null,
                    };
                  }),
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
          });

          // 3. Stakeholders + their roles on this project.
          for (const party of seed.parties) {
            const orgId = orgIdByKind.get(party.kind);
            if (!orgId || !party.stakeholder) continue;
            const lastContactedAt =
              party.stakeholder.lastContactDaysAgo == null
                ? null
                : daysFromNow(-party.stakeholder.lastContactDaysAgo);

            const stakeholder = await tx.stakeholder.create({
              data: {
                name: party.stakeholder.name,
                title: party.stakeholder.title,
                email: party.stakeholder.email ?? null,
                organizationId: orgId,
                lastContactedAt,
              },
              select: { id: true },
            });

            if (party.roleType) {
              await tx.stakeholderRole.create({
                data: {
                  stakeholderId: stakeholder.id,
                  projectId: project.id,
                  roleType: party.roleType,
                  isPrimary: party.isPrimary ?? false,
                },
              });
            }
          }

          // 4. Project sponsors (for the capital stack / ownership view).
          for (const party of seed.parties) {
            if (party.leadSponsorEquityBps == null) continue;
            const orgId = orgIdByKind.get(party.kind);
            if (!orgId) continue;
            await tx.projectSponsor.create({
              data: {
                projectId: project.id,
                organizationId: orgId,
                role: "lead_sponsor",
                equityShareBps: party.leadSponsorEquityBps,
              },
            });
          }

          // 5. Funder relationships — populate the capital pipeline + Parties graph.
          for (const party of seed.parties) {
            if (!party.funder) continue;
            const orgId = orgIdByKind.get(party.kind);
            if (!orgId) continue;
            await tx.funderRelationship.create({
              data: {
                projectId: project.id,
                organizationId: orgId,
                funderType: party.funder.funderType,
                engagementStage: party.funder.engagementStage,
                amountUsdCents: party.funder.amountUsdCents ?? null,
                lastContactDate:
                  party.funder.lastContactDaysAgo != null
                    ? daysFromNow(-party.funder.lastContactDaysAgo)
                    : null,
              },
            });
          }

          return project;
        });
      })
    );

    return {
      ok: true,
      value: {
        projectIds: [primary.value.projectId, ...created.map((project) => project.id)],
        leadSlug: primary.value.slug,
      },
    };
  } catch (err) {
    return { ok: false, error: toDbError(err) };
  }
}
