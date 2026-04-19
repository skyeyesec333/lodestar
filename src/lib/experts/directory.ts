export type Expert = {
  id: string;
  name: string;
  title: string;
  bio: string;
  specializations: string[];
  sectors: string[];
  programs: string[];
  yearsExperience: number;
  dealsClosed: number;
  ratePerHour: number;
  availability: "available" | "limited" | "unavailable";
  avatarUrl: string;
  avatarInitials: string;
  avatarColor: string;
  avatarBg: string;
};

export const EXPERTS: Expert[] = [
  {
    id: "sarah-chen",
    name: "Sarah Chen",
    title: "EXIM LOI Specialist",
    bio: "Sarah has shepherded 23 projects through the EXIM Letter of Interest process across Sub-Saharan Africa and Southeast Asia. Her focus is on data room readiness — ensuring every artifact meets the 'substantially final form' standard before submission. Former EXIM Bank program officer with deep insight into what reviewers flag.",
    specializations: ["LOI Structuring", "Data Room Assembly", "EXIM Application Review", "US Content Verification"],
    sectors: ["power", "water"],
    programs: ["exim"],
    yearsExperience: 14,
    dealsClosed: 23,
    ratePerHour: 450,
    availability: "available",
    avatarUrl: "https://i.pravatar.cc/160?img=5",
    avatarInitials: "SC",
    avatarColor: "var(--teal)",
    avatarBg: "var(--teal-soft)",
  },
  {
    id: "marcus-oduya",
    name: "Marcus Oduya",
    title: "Sub-Saharan Africa Power Expert",
    bio: "Marcus brings 18 years of project finance experience focused on power generation across West and East Africa. He has structured offtake agreements, EPC contracts, and financing packages for utility-scale solar, hydro, and gas projects. Deep network with regional development finance institutions and independent power producers.",
    specializations: ["Power Purchase Agreements", "EPC Contract Structuring", "African Market Entry", "DFI Coordination"],
    sectors: ["power"],
    programs: ["exim", "ifc"],
    yearsExperience: 18,
    dealsClosed: 31,
    ratePerHour: 500,
    availability: "available",
    avatarUrl: "https://i.pravatar.cc/160?img=60",
    avatarInitials: "MO",
    avatarColor: "var(--gold)",
    avatarBg: "var(--gold-soft)",
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    title: "IFC Environmental & Social Specialist",
    bio: "Priya specializes in Environmental and Social Impact Assessments and the IFC Performance Standards. She has guided projects through Category A ESIA processes in 14 countries and helps sponsors design community benefit programs that satisfy both lender requirements and host government mandates.",
    specializations: ["ESIA & E&S Audits", "IFC Performance Standards", "Community Engagement", "Lender E&S Due Diligence"],
    sectors: ["power", "water", "mining", "transport", "telecom"],
    programs: ["ifc"],
    yearsExperience: 12,
    dealsClosed: 19,
    ratePerHour: 380,
    availability: "limited",
    avatarUrl: "https://i.pravatar.cc/160?img=44",
    avatarInitials: "PN",
    avatarColor: "var(--teal)",
    avatarBg: "var(--teal-soft)",
  },
  {
    id: "james-whitfield",
    name: "James Whitfield",
    title: "Project Finance Legal Counsel",
    bio: "James is a project finance attorney with 20 years of deal experience spanning four continents. He has led legal structuring for complex multi-lender transactions involving EXIM, IFC, and commercial bank tranches simultaneously. Particular expertise in intercreditor arrangements and force majeure provisions in emerging market concession agreements.",
    specializations: ["Concession Agreements", "Intercreditor Structuring", "Force Majeure Clauses", "Multi-Lender Transactions"],
    sectors: ["power", "water", "mining", "transport", "telecom"],
    programs: ["exim", "ifc"],
    yearsExperience: 20,
    dealsClosed: 45,
    ratePerHour: 650,
    availability: "limited",
    avatarUrl: "https://i.pravatar.cc/160?img=68",
    avatarInitials: "JW",
    avatarColor: "var(--ink-mid)",
    avatarBg: "var(--bg)",
  },
  {
    id: "amara-diallo",
    name: "Amara Diallo",
    title: "Mining Offtake Structuring Expert",
    bio: "Amara structures offtake and streaming agreements for extractive projects across the Sahel and central Africa. She understands the interplay between commodity pricing mechanisms, royalty structures, and lender coverage requirements. Experienced in negotiating with both state mining enterprises and private international offtakers.",
    specializations: ["Mining Offtake Agreements", "Streaming Structures", "Royalty Negotiations", "Commodity Risk Mitigation"],
    sectors: ["mining"],
    programs: ["exim", "ifc"],
    yearsExperience: 11,
    dealsClosed: 14,
    ratePerHour: 420,
    availability: "available",
    avatarUrl: "https://i.pravatar.cc/160?img=36",
    avatarInitials: "AD",
    avatarColor: "var(--gold)",
    avatarBg: "var(--gold-soft)",
  },
  {
    id: "david-park",
    name: "David Park",
    title: "Infrastructure Financial Modeler",
    bio: "David builds and audits project finance models for EXIM and IFC submissions. His models cover full lifecycle cash flows including IDC, DSRA, and currency hedging overlays. He has worked alongside Big Four audit firms on model reviews and has a reputation for models that survive lender scrutiny without major revisions.",
    specializations: ["Financial Modeling", "IDC & DSRA Calculations", "Lender Model Audits", "Sensitivity Analysis"],
    sectors: ["power", "water", "transport"],
    programs: ["exim", "ifc"],
    yearsExperience: 9,
    dealsClosed: 17,
    ratePerHour: 350,
    availability: "available",
    avatarUrl: "https://i.pravatar.cc/160?img=33",
    avatarInitials: "DP",
    avatarColor: "var(--teal)",
    avatarBg: "var(--teal-soft)",
  },
  {
    id: "fatima-al-rashid",
    name: "Fatima Al-Rashid",
    title: "EXIM Political Risk Specialist",
    bio: "Fatima advises sponsors on navigating EXIM's political risk coverage options, including political-only cover versus comprehensive cover decisions. She monitors the Country Limitation Schedule and advises on CLS-restricted country strategies. Former State Department economic officer with relationships across MENA and South Asia.",
    specializations: ["Political Risk Assessment", "CLS Navigation", "Political-Only Cover", "Sovereign Risk Mitigation"],
    sectors: ["power", "water", "mining", "transport", "telecom"],
    programs: ["exim"],
    yearsExperience: 16,
    dealsClosed: 28,
    ratePerHour: 480,
    availability: "limited",
    avatarUrl: "https://i.pravatar.cc/160?img=26",
    avatarInitials: "FA",
    avatarColor: "var(--accent)",
    avatarBg: "var(--accent-soft)",
  },
  {
    id: "carlos-mendez",
    name: "Carlos Mendez",
    title: "Government Liaison & CLS Specialist",
    bio: "Carlos serves as the bridge between project sponsors and host-country governments, negotiating implementation agreements and host government consents required for EXIM eligibility. He has worked in 18 countries and speaks four languages fluently. Specializes in fast-tracking government approvals without compromising the legal protections sponsors need.",
    specializations: ["Host Government Negotiations", "Implementation Agreements", "CLS Compliance", "Government Consent Procurement"],
    sectors: ["power", "water", "mining", "transport", "telecom"],
    programs: ["exim"],
    yearsExperience: 13,
    dealsClosed: 22,
    ratePerHour: 400,
    availability: "available",
    avatarUrl: "https://i.pravatar.cc/160?img=12",
    avatarInitials: "CM",
    avatarColor: "var(--ink-mid)",
    avatarBg: "var(--bg)",
  },
];

export type SectorFilter = "all" | "power" | "mining" | "water" | "transport" | "telecom";
export type ProgramFilter = "all" | "exim" | "ifc";

export function filterExperts(
  experts: Expert[],
  sector: SectorFilter,
  program: ProgramFilter
): Expert[] {
  return experts.filter((e) => {
    const sectorMatch = sector === "all" || e.sectors.includes(sector);
    const programMatch = program === "all" || e.programs.includes(program);
    return sectorMatch && programMatch;
  });
}
