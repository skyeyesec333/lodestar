/**
 * Database seed script.
 *
 * Populates:
 *   1. All 36 EximRequirement rows from the taxonomy source of truth.
 *   2. One demo Organization and Project with all 36 requirement statuses
 *      initialized to not_started.
 *
 * Run with: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { EXIM_REQUIREMENTS } from "../src/lib/exim/requirements";
import { computeReadiness } from "../src/lib/scoring/index";

// Prisma 7 uses driver adapters instead of a binary query engine.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── 1. Upsert all 36 EximRequirement rows ─────────────────────────────────
  console.log("Seeding EXIM requirements taxonomy...");

  for (const req of EXIM_REQUIREMENTS) {
    await prisma.eximRequirement.upsert({
      where: { id: req.id },
      update: {
        category: req.category,
        name: req.name,
        description: req.description,
        phaseRequired: req.phaseRequired,
        isLoiCritical: req.isLoiCritical,
        weight: req.weight,
        sortOrder: req.sortOrder,
      },
      create: {
        id: req.id,
        category: req.category,
        name: req.name,
        description: req.description,
        phaseRequired: req.phaseRequired,
        isLoiCritical: req.isLoiCritical,
        weight: req.weight,
        sortOrder: req.sortOrder,
      },
    });
  }

  console.log(`  ✓ ${EXIM_REQUIREMENTS.length} requirements upserted`);

  // ── 2. Demo Organization ──────────────────────────────────────────────────
  // Note: Organization has no `slug` field in the schema. Using a stable seed
  // ID ("seed-demo-org") so this upsert is idempotent.
  console.log("\nCreating demo organization...");

  const org = await prisma.organization.upsert({
    where: { id: "seed-demo-org" },
    update: { name: "Lodestar Demo Corp" },
    create: {
      id: "seed-demo-org",
      name: "Lodestar Demo Corp",
      isUsEntity: false,
    },
  });

  console.log(`  ✓ Organization: "${org.name}" (id: ${org.id})`);

  // ── 3. Demo Project ───────────────────────────────────────────────────────
  // stage: concept — ProjectPhase has no 'feasibility' value; concept is the
  //   earliest phase and is conceptually equivalent for seed purposes.
  // countryCode: TZ (ISO 3166-1 alpha-2 for Tanzania).
  // capexUsdCents: $450,000,000 × 100 = 45,000,000,000 cents (stored as BigInt).
  // ownerClerkId: placeholder — replace with a real Clerk user ID in production.
  console.log("\nCreating demo project...");

  const project = await prisma.project.upsert({
    where: { slug: "meridian-power-project" },
    update: {},
    create: {
      name: "Meridian Power Project",
      slug: "meridian-power-project",
      description: "250MW combined cycle gas plant, Tanzania",
      stage: "concept",
      countryCode: "TZ",
      sector: "power",
      capexUsdCents: 45_000_000_000n, // $450,000,000
      ownerClerkId: "seed_system",
    },
  });

  console.log(`  ✓ Project: "${project.name}" (id: ${project.id})`);

  // ── 4. RequirementStatus rows for all 36 requirements ────────────────────
  console.log("\nCreating requirement status rows...");

  let created = 0;
  for (const req of EXIM_REQUIREMENTS) {
    await prisma.projectRequirement.upsert({
      where: {
        projectId_requirementId: {
          projectId: project.id,
          requirementId: req.id,
        },
      },
      update: {},
      create: {
        projectId: project.id,
        requirementId: req.id,
        status: "not_started",
      },
    });
    created++;
  }

  console.log(`  ✓ ${created} requirement_statuses rows created`);

  // ── 5. Verify with computeReadiness ───────────────────────────────────────
  const allNotStarted = EXIM_REQUIREMENTS.map((r) => ({
    requirementId: r.id,
    status: "not_started" as const,
  }));

  const result = computeReadiness(allNotStarted);

  console.log("\n=== Readiness Verification ===");
  console.log(
    `  Score:       ${result.scoreBps} bps (${(result.scoreBps / 100).toFixed(2)}%)`
  );
  console.log(`  LOI ready:   ${result.loiReady}`);
  console.log(`  LOI blockers (${result.loiBlockers.length}):`);
  result.loiBlockers.forEach((id) => console.log(`    ✗ ${id}`));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
