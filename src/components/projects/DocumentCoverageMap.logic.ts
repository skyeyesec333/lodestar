/**
 * Pure logic extracted from DocumentCoverageMap for testability.
 */
import type { DocumentRow } from "@/lib/db/documents";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { REQUIREMENT_CATEGORIES } from "@/lib/exim/requirements";

export type CoverageBucket = {
  category: string;
  label: string;
  requirements: ProjectRequirementRow[];
  coveredCount: number;
  applicableCount: number;
  documentCount: number;
};

export type CoverageResult = {
  buckets: CoverageBucket[];
  coveragePct: number;
  loiCriticalTotal: number;
  loiCriticalCovered: number;
  orphanedDocuments: DocumentRow[];
  docsByRequirementId: Map<string, DocumentRow[]>;
};

const CATEGORY_LABELS: Record<string, string> = {
  contracts: "Contracts",
  financial: "Financial",
  studies: "Studies",
  permits: "Permits",
  corporate: "Corporate",
  environmental_social: "Environmental / Social",
};

export function computeCoverage(
  requirementRows: ProjectRequirementRow[],
  documents: DocumentRow[]
): CoverageResult {
  const docsByRequirementId = new Map<string, DocumentRow[]>();
  const orphanedDocuments: DocumentRow[] = [];

  for (const doc of documents) {
    if (!doc.projectRequirementId) {
      orphanedDocuments.push(doc);
      continue;
    }
    const bucket = docsByRequirementId.get(doc.projectRequirementId) ?? [];
    bucket.push(doc);
    docsByRequirementId.set(doc.projectRequirementId, bucket);
  }

  const buckets: CoverageBucket[] = REQUIREMENT_CATEGORIES.map((category) => {
    const requirements = requirementRows.filter((row) => row.category === category);
    const applicableCount = requirements.filter((row) => row.isApplicable).length;
    const coveredCount = requirements.filter((row) => {
      const docs = docsByRequirementId.get(row.projectRequirementId) ?? [];
      return row.isApplicable && docs.length > 0;
    }).length;
    const documentCount = requirements.reduce((sum, row) => {
      const docs = docsByRequirementId.get(row.projectRequirementId) ?? [];
      return sum + docs.length;
    }, 0);
    return {
      category,
      label: CATEGORY_LABELS[category] ?? category.replace(/_/g, " "),
      requirements,
      coveredCount,
      applicableCount,
      documentCount,
    };
  });

  const applicableRequirements = requirementRows.filter((row) => row.isApplicable);
  const coveredRequirements = applicableRequirements.filter((row) => {
    const docs = docsByRequirementId.get(row.projectRequirementId) ?? [];
    return docs.length > 0;
  });
  const coveragePct =
    applicableRequirements.length > 0
      ? Math.round((coveredRequirements.length / applicableRequirements.length) * 100)
      : 0;

  const loiCriticalRows = applicableRequirements.filter((row) => row.isLoiCritical);
  const loiCriticalCovered = loiCriticalRows.filter((row) => {
    const docs = docsByRequirementId.get(row.projectRequirementId) ?? [];
    return docs.length > 0;
  }).length;

  return {
    buckets,
    coveragePct,
    loiCriticalTotal: loiCriticalRows.length,
    loiCriticalCovered,
    orphanedDocuments,
    docsByRequirementId,
  };
}

export function getCoverageLabel(row: ProjectRequirementRow, docCount: number): string {
  if (!row.isApplicable) return "Not applicable";
  if (docCount > 0) return docCount === 1 ? "1 linked file" : `${docCount} linked files`;
  if (row.status === "executed" || row.status === "waived") return "Needs linked evidence";
  if (row.status === "substantially_final") return "Evidence still pending";
  return "No linked files";
}
