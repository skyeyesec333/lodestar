/**
 * US EXIM Bank Glossary of Terms
 *
 * Comprehensive reference for project finance terminology used in
 * EXIM Bank-supported infrastructure transactions. Each entry is
 * sourced from official EXIM policy documents, OECD publications,
 * or Congressional mandates.
 *
 * Generated: 2026-03-28
 */

export interface GlossaryEntry {
  term: string;
  acronym?: string;
  definition: string;
  context: string;
  source: string;
  related: string[];
  recentChanges?: string;
}

export const EXIM_GLOSSARY: GlossaryEntry[] = [
  // ─── 1. CONGRESSIONAL MANDATES & RESTRICTIONS ────────────────────────

  {
    term: "Economic Impact Procedures",
    definition:
      "EXIM's statutory obligation to assess whether financing an export transaction would cause substantial injury to U.S. domestic industry or result in foreign production of goods substantially the same as those subject to U.S. trade measures. Transactions meeting injury thresholds may be denied support regardless of creditworthiness.",
    context:
      "Project sponsors must understand that EXIM financing can be denied if the project's output would compete with a protected U.S. industry (e.g., steel, ethanol). Early economic impact screening avoids wasted due diligence.",
    source: "https://www.exim.gov/policies/economic-impact/economic-impact-procedures",
    related: ["Sensitive Commercial Sectors", "Additionality"],
    recentChanges:
      "February 2025 Economic Impact Procedures and Methodological Guidelines became effective February 1, 2025, replacing August 2020 procedures.",
  },

  {
    term: "Dual-Use Goods",
    definition:
      "Items that serve both military and commercial or civilian applications. While EXIM is prohibited from financing defense articles and services, dual-use items may receive EXIM support provided they are destined for commercial end-use and comply with export control regulations.",
    context:
      "Sponsors exporting equipment with potential military applications (e.g., advanced electronics, satellite components) must confirm commercial end-use classification to avoid disqualification from EXIM support.",
    source: "https://www.exim.gov/policies",
    related: ["Military Items Prohibition", "Export Controls"],
  },

  {
    term: "American Jobs Mandate",
    definition:
      "EXIM's core statutory mission to support U.S. jobs through exports. All transactions must demonstrate that EXIM financing enables the export of U.S.-produced goods and services, creating or sustaining American employment. The Make More in America initiative scales financing based on job-years supported, at up to $205,336 per job-year.",
    context:
      "Sponsors structuring EXIM-backed deals should quantify U.S. jobs supported (both during construction and over the financing term) to strengthen their application, particularly under the Make More in America framework.",
    source: "https://www.exim.gov/about/special-initiatives/make-more-in-america-initiative",
    related: ["US Content Policy", "Make More in America", "CTEP"],
    recentChanges:
      "The Make More in America initiative introduced a job-year-based financing formula ($205,336 per job-year) as an alternative to traditional U.S. content percentage requirements.",
  },

  {
    term: "Carbon Intensity Policy",
    definition:
      "EXIM's framework for evaluating fossil fuel power generation projects based on grams of CO2 equivalent per kilowatt-hour. Projects with high carbon intensity face additional environmental review requirements beyond standard World Bank Group guidelines. Power projects producing over 100,000 tonnes CO2e annually must publicly report emissions; those above 25,000 tonnes are encouraged to do so.",
    context:
      "Sponsors proposing fossil fuel power projects must quantify carbon intensity early. High-carbon projects face extended review timelines and additional ESIA requirements that can delay final commitment by months.",
    source: "https://www.exim.gov/policies/exim-bank-and-environment/procedures-and-guidelines",
    related: ["Environmental Category A/B/C", "ESIA", "Equator Principles", "Climate Change Sector Understanding"],
    recentChanges:
      "In May 2025, EXIM's board voted unanimously to reverse the ban on coal-fired power project financing, aligning with Trump administration executive orders. The $4.7B Mozambique LNG loan was approved under the new posture.",
  },

  {
    term: "Small Business Mandate",
    definition:
      "Congressional requirement that at least 20% of EXIM Bank's total authorizations directly benefit small business exporters. EXIM tracks and reports compliance with this threshold annually to Congress.",
    context:
      "Small business exporters receive prioritized processing and may qualify for streamlined application procedures. Sponsors partnering with small business suppliers can help EXIM meet its mandate, which may strengthen the overall application.",
    source: "https://www.oversight.gov/sites/default/files/documents/reports/2018-12/Final%20Report%20Small%20Business%2011272018%20Redacted%20508.pdf",
    related: ["Working Capital Guarantee Program", "Supply Chain Finance Guarantee"],
  },

  {
    term: "China and Transformational Exports Program",
    acronym: "CTEP",
    definition:
      "A Congressionally mandated program established in EXIM's 2019 reauthorization requiring 20% of total financing authority be reserved for exports competing directly with China across ten transformational sectors: AI, biotechnology, biomedical, wireless communications, quantum computing, renewable energy/storage/efficiency, semiconductors, fintech, water treatment/sanitation, and high-performance computing.",
    context:
      "Sponsors in any of the ten CTEP sectors can access enhanced financing terms including reduced U.S. content thresholds (51% vs. standard 85%), extended repayment terms, and policy exceptions not available for standard transactions. All PRC-origin content is automatically ineligible.",
    source: "https://www.exim.gov/about/special-initiatives/ctep",
    related: ["US Content Policy", "Transformational Export Areas", "OECD Arrangement"],
    recentChanges:
      "CTEP sunsets December 31, 2026 alongside EXIM's charter. S. 3772 (119th Congress) proposes a 10-year extension. FY2025 CTEP authorizations reached 23.5% of total EXIM activity by value.",
  },

  {
    term: "Sensitive Commercial Sectors",
    definition:
      "A list of products and sectors issued under Section 2e(5) of the Export-Import Bank Act where EXIM financing faces heightened scrutiny because the supported export could displace U.S. domestic production. Current list includes steel (due to global overcapacity) and ethanol (due to U.S. market displacement risk).",
    context:
      "Transactions establishing or expanding production of items on the sensitive list have a lower likelihood of receiving EXIM support and face prolonged processing times. Sponsors should check the current list before structuring a deal.",
    source: "https://www.exim.gov/policies/economic-impact/sensitive-commercial-sectors",
    related: ["Economic Impact Procedures", "Additionality"],
  },

  {
    term: "Military Items Prohibition",
    definition:
      "EXIM's statutory prohibition against financing exports of defense articles and defense services as defined under U.S. export control regulations. EXIM may support non-military security applications (private security, police equipment) subject to additional administrative review.",
    context:
      "Sponsors must ensure their export does not fall under ITAR-controlled defense articles. Dual-use items require clear commercial end-use documentation.",
    source: "https://www.exim.gov/policies",
    related: ["Dual-Use Goods", "Export Controls"],
  },

  // ─── 2. COUNTRY & TRANSACTION ELIGIBILITY ────────────────────────────

  {
    term: "Country Limitation Schedule",
    acronym: "CLS",
    definition:
      "EXIM's official country-by-country determination of whether financing support is available. Countries are designated as 'open for cover' (EXIM may consider support) or 'off-cover' (marked with X, indicating EXIM will not consider routine transactions due to economic and/or political risk). Country-specific notes may impose additional restrictions or conditions even for open markets.",
    context:
      "The CLS is the first eligibility gate for any EXIM transaction. Sponsors must verify their project country is open for cover before investing in an EXIM application. Even open countries may have restrictive notes requiring sovereign guarantees or limiting sector coverage.",
    source: "https://www.exim.gov/resources/country-limitation-schedule",
    related: ["OECD Country Risk Category", "Political-Only Cover", "Comprehensive Cover"],
    recentChanges:
      "Most recent CLS amendment: February 3, 2026, superseding December 24, 2024 schedule.",
  },

  {
    term: "Prohibited Countries",
    definition:
      "Countries where EXIM is legally barred from providing any financing support, distinct from off-cover CLS designations which are risk-based. Statutory prohibitions apply to countries subject to U.S. sanctions (e.g., Iran, North Korea, Cuba, Syria) as well as countries identified by Congress.",
    context:
      "Unlike CLS off-cover status (which can sometimes be overcome through risk externalization), statutory country prohibitions are absolute. Sponsors cannot structure around them.",
    source: "https://www.exim.gov/resources/country-limitation-schedule",
    related: ["Country Limitation Schedule", "Sanctions Compliance"],
  },

  {
    term: "Sub-Sovereign Program",
    definition:
      "EXIM program enabling cities, states, and other sub-national government entities in emerging markets to access EXIM financing based on their independent creditworthiness rather than requiring a sovereign guarantee from the national government. Sub-sovereign entities must be rated B/B2 or stronger by S&P, Moody's, Fitch, or JCRA and must not be in default on foreign currency obligations.",
    context:
      "Sponsors selling to municipal or provincial buyers can avoid the often-protracted process of obtaining sovereign guarantees by qualifying the sub-sovereign entity directly under this program.",
    source: "https://www.exim.gov/policies/sub-sovereign-program",
    related: ["Sovereign Guarantee", "Obligor", "Guarantor", "Credit Classification"],
  },

  {
    term: "Sovereign Guarantee",
    definition:
      "A guarantee from the national (central) government of the buyer's country backing the borrower's repayment obligations. EXIM routinely requires sovereign guarantees for public-sector buyers that lack significant independent revenue sources outside the central government budget and do not have independently audited financial statements.",
    context:
      "Sponsors dealing with government-owned off-takers or utilities should expect EXIM to require a sovereign guarantee unless the entity qualifies under the sub-sovereign program. Obtaining sovereign guarantees can add 6-12 months to the transaction timeline.",
    source: "https://www.exim.gov/resources/country-limitation-schedule",
    related: ["Sub-Sovereign Program", "Obligor", "Guarantor", "Public Sector"],
  },

  {
    term: "Obligor",
    definition:
      "The entity legally responsible for repaying the EXIM-supported debt. In buyer credit structures, the obligor is typically the foreign buyer or a financial institution lending to the buyer. In project finance, the obligor is usually a special purpose vehicle (SPV). EXIM requires detailed financial statements, credit references, and business history from all proposed obligors.",
    context:
      "Sponsors must identify the obligor early in structuring because EXIM's credit analysis, pricing, and documentation requirements all flow from the obligor's identity and creditworthiness.",
    source: "https://exim.gov/resources/applications-forms/letter-interest/guidelines-for-letters-interest",
    related: ["Guarantor", "Credit Classification", "Exposure Fee"],
  },

  {
    term: "Guarantor",
    definition:
      "An entity providing a guarantee of the obligor's repayment obligations to EXIM. For private-sector borrowers, EXIM generally requires a guarantee from a creditworthy financial institution. For public-sector borrowers without independent revenue, a sovereign guarantee is typically required. The guarantor's creditworthiness directly affects pricing.",
    context:
      "The identity and credit quality of the guarantor determines the credit classification level and, consequently, the exposure fee. A stronger guarantor can materially reduce the cost of EXIM financing.",
    source: "https://exim.gov/resources/applications-forms/letter-interest/guidelines-for-letters-interest",
    related: ["Obligor", "Sovereign Guarantee", "Credit Classification", "Exposure Fee"],
  },

  {
    term: "Minimum Cash Payment (15% Rule)",
    definition:
      "OECD Arrangement requirement that the international buyer must make a cash payment of at least 15% of the export contract value. This down payment may be financed by the buyer's own funds or a separate lender but cannot be covered by EXIM financing. EXIM may finance up to the lesser of 85% of the net contract price or 100% of U.S. content.",
    context:
      "Sponsors must ensure the buyer or a co-financing bank can fund the 15% minimum cash payment independently. Failure to arrange the down payment is a common deal-breaker in early-stage project structuring.",
    source: "https://www.exim.gov/policies/content/medium-and-long-term",
    related: ["US Content Policy", "OECD Arrangement", "Buyer Credit", "Supplier Credit"],
  },

  {
    term: "Public Sector Definition",
    definition:
      "EXIM defines public-sector entities as obligors or guarantors that are at least 50% owned, directly or indirectly, by the government. Public-sector classification triggers additional requirements including potential need for sovereign guarantees and may affect CLS coverage status.",
    context:
      "Sponsors selling to state-owned enterprises, government utilities, or national railway companies should confirm the ownership percentage to determine whether sovereign guarantee requirements apply.",
    source: "https://www.exim.gov/resources/country-limitation-schedule",
    related: ["Sovereign Guarantee", "Sub-Sovereign Program", "Obligor"],
  },

  // ─── 3. UNDERWRITING & CREDIT TERMS ──────────────────────────────────

  {
    term: "Exposure Fee",
    definition:
      "The risk-based premium EXIM charges on medium- and long-term transactions, determined by the OECD country risk category and the credit classification (CC) of the obligor/guarantor. Exposure fees are OECD-compliant and represent the minimum premium benchmark (MPB) ensuring pricing parity across export credit agencies. Fees accrue from each disbursement and may be financed.",
    context:
      "The exposure fee is typically the single largest cost component of EXIM financing. Sponsors should model exposure fees early using EXIM's online calculator, as they compound significantly on long-tenor transactions with extended disbursement periods.",
    source: "https://www.exim.gov/resources/exposure-fees",
    related: ["OECD Country Risk Category", "Credit Classification", "Minimum Premium Benchmark"],
  },

  {
    term: "OECD Country Risk Category",
    definition:
      "A 0-7 scale classifying countries by creditworthiness, established by the OECD for export credit pricing. Category 0 represents the lowest risk (e.g., US, Germany, Japan); Category 7 represents the highest risk. For countries not classified by the OECD, EXIM translates the U.S. Interagency Country Risk Assessment System (ICRAS) classification into a corresponding OECD level. Higher-risk categories (5-7) have fewer non-sovereign buyer risk sub-categories due to risk compression.",
    context:
      "The country risk category sets the floor for exposure fee pricing. Sponsors in Category 5-7 countries face materially higher financing costs and should factor this into project economics from the feasibility study stage.",
    source: "https://www.exim.gov/resources/exposure-fees/credit-classification-and-credit-rating-agency-rating-matrix",
    related: ["Exposure Fee", "Credit Classification", "Country Limitation Schedule", "ICRAS"],
  },

  {
    term: "Credit Classification",
    acronym: "CC",
    definition:
      "EXIM's OECD-compliant system of assigning risk levels to obligors/guarantors for pricing purposes. CC levels determine the exposure fee within a given country risk category. For transactions at or below $25 million with unrated borrowers, EXIM assigns CC levels using internal analysis. For rated entities, CC levels map to credit rating agency scales. Sovereign transactions price at the country-risk floor; non-sovereign fees cannot be below sovereign fees except under political-only cover (priced at 'Better than Sovereign' or BTS, 10% below sovereign rate).",
    context:
      "Sponsors should obtain and submit credit ratings for obligors and guarantors from recognized agencies (S&P, Moody's, Fitch) to enable the most favorable CC level assignment and reduce exposure fees.",
    source: "https://www.exim.gov/resources/exposure-fees/credit-classification-and-credit-rating-agency-rating-matrix",
    related: ["Exposure Fee", "OECD Country Risk Category", "Sovereign Guarantee"],
  },

  {
    term: "Buyer Credit",
    definition:
      "A financing structure where EXIM provides a loan or guarantee to a financial institution that lends directly to the foreign buyer to pay the U.S. exporter. The foreign buyer (or its bank) is the obligor. This is the predominant structure for medium- and long-term EXIM transactions.",
    context:
      "Sponsors should identify a lender willing to structure a buyer credit facility early, as EXIM guarantees require a participating financial institution to originate and service the loan.",
    source: "https://www.exim.gov/solutions/export-credit-insurance/financial-institution-buyer",
    related: ["Supplier Credit", "Obligor", "Loan Guarantee", "Direct Loan"],
  },

  {
    term: "Supplier Credit",
    definition:
      "A financing structure where the U.S. exporter extends credit directly to the foreign buyer and obtains EXIM insurance to protect against buyer non-payment. The exporter bears the initial credit exposure and is the policyholder. Typically used for shorter-term or smaller transactions.",
    context:
      "Sponsors who are also the exporter may prefer supplier credit for smaller deals where arranging a bank-intermediated buyer credit is disproportionately expensive.",
    source: "https://www.exim.gov/solutions/export-credit-insurance",
    related: ["Buyer Credit", "Export Credit Insurance"],
  },

  {
    term: "OECD Arrangement on Officially Supported Export Credits",
    acronym: "OECD Arrangement / Consensus",
    definition:
      "The multilateral framework (also called the 'Consensus') that sets minimum terms and conditions for officially supported export credits among OECD participant countries. It establishes floors for interest rates (CIRR), maximum repayment tenors, minimum premium benchmarks, down payment requirements (15%), and transparency obligations. Non-OECD countries (notably China) are not bound by the Arrangement.",
    context:
      "All EXIM pricing, tenor, and structure decisions are bounded by the OECD Arrangement. Sponsors cannot negotiate below-Arrangement terms from EXIM. However, the Arrangement also ensures EXIM offers internationally competitive terms.",
    source: "https://www.exim.gov/news/exim-helps-sign-major-oecd-reform-for-export-credit-agencies",
    related: ["Minimum Premium Benchmark", "CIRR", "Minimum Cash Payment", "CTEP"],
    recentChanges:
      "The 2023 modernization agreement extended maximum repayment terms to 22 years for climate projects, expanded the Climate Change Sector Understanding (CCSU), and reduced minimum premium rates for green transactions. Entered into force in 2024.",
  },

  {
    term: "Maximum Repayment Tenor",
    definition:
      "The longest permissible repayment period EXIM may offer, determined by the OECD Arrangement and varying by sector. Standard maximum tenors: 5 years (Category I/developed countries, most exports), 10 years (Category II/developing countries, large transactions), 10 years (ships), 12 years (non-nuclear power, large civil aircraft), 15 years (nuclear power, renewable energy, water projects), 18 years (pre-modernization nuclear), 22 years (CCSU-eligible climate projects, post-2023 modernization).",
    context:
      "Longer tenors improve project economics by reducing annual debt service. Sponsors in renewable energy, nuclear, and climate sectors benefit from the 2023 OECD modernization allowing up to 22-year terms.",
    source: "https://www.exim.gov/resources/exposure-fees/standard-repayment-terms",
    related: ["OECD Arrangement", "Climate Change Sector Understanding", "Grace Period"],
    recentChanges:
      "2023 OECD modernization extended maximum tenor from 18 to 22 years for eligible climate and nuclear projects.",
  },

  {
    term: "Grace Period",
    definition:
      "The interval between the starting point of credit (typically export completion or final disbursement) and the first principal repayment. Standard EXIM grace period is approximately six months, after which semi-annual principal and interest payments begin. Project finance transactions may negotiate extended grace periods aligned with construction timelines.",
    context:
      "Sponsors of projects with extended construction periods should negotiate longer grace periods to avoid debt service obligations before revenue generation begins.",
    source: "https://www.exim.gov/resources/exposure-fees/standard-repayment-terms",
    related: ["Disbursement Period", "Repayment Schedule", "Interest During Construction"],
  },

  {
    term: "Disbursement Period",
    definition:
      "The timeframe during which EXIM financing is drawn down to pay the U.S. exporter, typically aligned with the project's construction and delivery schedule. Longer disbursement periods increase the nominal exposure fee because fees accrue from each disbursement date. EXIM disburses based on verified shipment and Exporter's Certificate documentation.",
    context:
      "Sponsors should optimize disbursement scheduling to minimize exposure fee accrual. Front-loaded disbursement profiles result in lower total nominal fees.",
    source: "https://www.exim.gov/solutions/project-and-structured-finance/fees-for-project-finance",
    related: ["Exposure Fee", "Grace Period", "Interest During Construction"],
  },

  {
    term: "Commercial Interest Reference Rate",
    acronym: "CIRR",
    definition:
      "The official fixed lending rate for EXIM direct loans, set monthly on the 15th based on average U.S. Treasury rates for the preceding month plus a 100 basis point spread. CIRRs are mandated by the OECD Arrangement as the minimum interest rate for officially supported fixed-rate export credits. Rates vary by repayment tenor.",
    context:
      "Sponsors considering an EXIM direct loan should monitor CIRR monthly, as rates lock at the time of disbursement (or earlier if a rate lock is obtained). In rising rate environments, early rate lock can save significant interest cost.",
    source: "https://www.exim.gov/resources/commercial-interest-reference-rates",
    related: ["Direct Loan", "OECD Arrangement", "Exposure Fee"],
  },

  {
    term: "Commitment Fee",
    definition:
      "A fee charged on the undisbursed portion of an EXIM loan or guarantee from the date of authorization until drawdown. For project finance with pre-completion coverage (direct loans, comprehensive or political-only guarantees): 0.50% (1/2 of 1%), including one post-completion option. Additional options: 0.125% (1/8 of 1%) each. For transactions without pre-completion coverage: 0.125%.",
    context:
      "Sponsors should minimize the gap between final commitment authorization and first disbursement to reduce commitment fee costs. Delayed construction starts directly increase this cost.",
    source: "https://www.exim.gov/solutions/project-and-structured-finance/fees-for-project-finance",
    related: ["Exposure Fee", "Disbursement Period", "Interest During Construction"],
  },

  {
    term: "Interest During Construction",
    acronym: "IDC",
    definition:
      "The capitalization of interest that accrues on EXIM-financed disbursements during the project construction period before revenue generation begins. EXIM generally permits IDC capitalization for limited-recourse project finance transactions because the project has no revenue to service interest during construction. The accrued interest is added to the principal loan/guarantee amount.",
    context:
      "IDC can represent 10-20% of total project cost on large infrastructure deals with multi-year construction. Sponsors must model IDC carefully as it increases the total guaranteed amount and affects exposure fee calculations.",
    source: "https://www.exim.gov/policies/capitalization-interestinterest-during-construction-idc",
    related: ["Commitment Fee", "Disbursement Period", "Grace Period", "Project Finance"],
  },

  {
    term: "Minimum Premium Benchmark",
    acronym: "MPB",
    definition:
      "The OECD-mandated floor for total fees (including exposure fees, commitment fees, and other charges) that an export credit agency must charge on officially supported transactions. MPBs vary by country risk category and obligor credit classification, preventing ECAs from undercutting each other on price.",
    context:
      "Sponsors cannot negotiate total fees below the MPB. Understanding the MPB floor for a given country/credit combination helps sponsors accurately model financing costs from the outset.",
    source: "https://www.exim.gov/resources/exposure-fees",
    related: ["Exposure Fee", "OECD Arrangement", "Credit Classification"],
  },

  {
    term: "Default Rate Cap",
    definition:
      "A statutory 2% ceiling on EXIM's default rate. If defaults reach or exceed 2% in any quarter, EXIM's lending authority immediately freezes at the outstanding level as of the last day of that quarter -- no new authorizations are permitted until the rate falls below 2%. EXIM also maintains a 5% reserve against aggregate disbursed and outstanding exposure.",
    context:
      "The default rate cap is a systemic risk to the EXIM pipeline. As of March 2025, EXIM's default rate was 0.929%, providing meaningful headroom. Sponsors should monitor this metric during periods of global credit stress.",
    source: "https://www.exim.gov/who-we-serve/congressional-and-government-stakeholders/facts-about-exim/default-rate-reports",
    related: ["Exposure Fee", "Reserve Requirement"],
  },

  // ─── 4. COVERAGE TYPES ───────────────────────────────────────────────

  {
    term: "Comprehensive Cover",
    definition:
      "EXIM's standard guarantee/insurance covering both commercial risks (buyer insolvency, protracted default, currency devaluation) and political risks (war, expropriation, currency inconvertibility, government-caused payment blockage). Available for both sovereign and private obligors.",
    context:
      "Most EXIM project finance transactions use comprehensive cover. Sponsors should default to comprehensive cover unless they have strong reasons to self-insure commercial risk and want to reduce the exposure fee via political-only pricing.",
    source: "https://www.exim.gov/solutions/export-credit-insurance",
    related: ["Political-Only Cover", "Exposure Fee", "Loan Guarantee"],
  },

  {
    term: "Political-Only Cover",
    definition:
      "A narrower EXIM guarantee covering only political perils (war, civil disturbance, expropriation, currency inconvertibility, government-mandated payment moratorium) but excluding commercial risks such as buyer insolvency or market-driven default. Available only for private-sector (non-government) obligors where political and commercial risks can be distinguished. Priced at 'Better than Sovereign' (BTS) level, 10% below the sovereign exposure fee.",
    context:
      "Sponsors with commercially creditworthy private-sector buyers can reduce EXIM fees by electing political-only cover. However, the lender and/or exporter must absorb commercial credit risk, which may require additional credit enhancements.",
    source: "https://www.exim.gov/solutions/export-credit-insurance",
    related: ["Comprehensive Cover", "Exposure Fee", "Credit Classification"],
  },

  {
    term: "Direct Loan",
    definition:
      "An EXIM loan made directly to a foreign buyer (or its bank) to finance the purchase of U.S. exports. Interest is fixed at the CIRR. Direct loans are a full-faith-and-credit obligation of the U.S. government and are used when private-sector lending is unavailable or insufficient for the transaction.",
    context:
      "Sponsors in markets where commercial banks are unwilling to lend (often Category 5-7 countries) may need to structure their EXIM support as a direct loan rather than a guarantee. Direct loans may carry longer processing times.",
    source: "https://www.exim.gov/solutions/direct-loan",
    related: ["CIRR", "Loan Guarantee", "Buyer Credit", "Additionality"],
  },

  {
    term: "Loan Guarantee",
    definition:
      "EXIM's guarantee to a private lender of repayment of a loan made to a foreign buyer for purchasing U.S. exports. The guarantee covers principal and interest against both political and commercial risks (under comprehensive cover) or political risks only. The guarantee carries the full faith and credit of the U.S. government.",
    context:
      "The loan guarantee is EXIM's most common medium/long-term product. Sponsors must identify a participating lender willing to originate and service the guaranteed loan.",
    source: "https://www.exim.gov/solutions/loan-guarantee/application-process",
    related: ["Direct Loan", "Comprehensive Cover", "Political-Only Cover", "Buyer Credit"],
  },

  // ─── 5. CONTENT & ELIGIBILITY ────────────────────────────────────────

  {
    term: "US Content Policy (Medium/Long-Term)",
    definition:
      "EXIM finances the lesser of 85% of the net contract price or 100% of U.S. content value. U.S. content includes goods produced or originated entirely in the United States. Eligible foreign content is foreign-origin goods shipped from the U.S. as part of the export package. Ineligible foreign content includes transshipped goods and items from bonded warehouses. Under CTEP, EXIM may provide full financing for transactions with at least 51% U.S. content, and all PRC-origin content is automatically ineligible.",
    context:
      "Sponsors must prepare an Exporter's Certificate documenting the U.S./foreign content breakdown. Material changes during execution require notification and may adjust future disbursements. Content shortfalls can reduce EXIM's financing amount.",
    source: "https://www.exim.gov/policies/content/medium-and-long-term",
    related: ["Minimum Cash Payment", "CTEP", "Local Cost Support", "Exporter's Certificate"],
  },

  {
    term: "Local Cost Support",
    definition:
      "EXIM financing of in-country project costs (local labor, materials, services) incurred in the buyer's country. Generally available up to 30% of the U.S. contract value for project finance transactions, and up to 40-50% under broader medium/long-term policies. Local costs must be directly related to the U.S. export transaction.",
    context:
      "Sponsors can use local cost support to finance host-country construction labor, local materials, and in-country services, reducing the equity requirement. This is particularly valuable in infrastructure projects with significant civil works.",
    source: "https://www.exim.gov/policies/local-cost/calculating-local-cost-support",
    related: ["US Content Policy", "Project Finance", "Eligible Costs"],
  },

  {
    term: "Additionality",
    definition:
      "EXIM's statutory obligation to supplement and encourage, not compete with, private capital. Before approving any transaction, EXIM must determine that its support is necessary for the U.S. export to proceed -- i.e., that private financing is unavailable or insufficient on comparable terms. Updated guidance and a revised checklist for medium/long-term transactions were published for public comment in November 2024.",
    context:
      "Sponsors must demonstrate that private financing is unavailable for their specific transaction. Applications should clearly articulate why commercial banks cannot or will not provide the needed financing without EXIM support.",
    source: "https://www.federalregister.gov/documents/2024/11/25/2024-27519/review-of-updated-additionality-guidance-and-checklist-for-exims-medium-and-long-term-transactions",
    related: ["Economic Impact Procedures", "Direct Loan", "Loan Guarantee"],
    recentChanges:
      "November 2024 Federal Register notice initiated public comment on updated additionality guidance and checklist, replacing 2020 guidance.",
  },

  // ─── 6. ENVIRONMENTAL & SOCIAL ───────────────────────────────────────

  {
    term: "Environmental Category A",
    definition:
      "EXIM's highest environmental risk classification for projects with potential significant adverse environmental and/or social impacts that are diverse, irreversible, and/or unprecedented. Impacts may extend beyond project boundaries. Includes large greenfield projects in sectors such as hydroelectric, mining, oil & gas, thermal power (>140 MWe), and refineries. Requires a full Environmental and Social Impact Assessment (ESIA) that must be posted publicly for at least 30 calendar days before EXIM may authorize a Final Commitment.",
    context:
      "Category A classification triggers the most rigorous and time-consuming environmental review. Sponsors should budget 6-12 months for the ESIA process and factor the 30-day public notice period into their timeline to Final Commitment.",
    source: "https://www.exim.gov/policies/exim-bank-and-environment/environmental-and-social",
    related: ["Environmental Category B", "Environmental Category C", "ESIA", "Equator Principles"],
  },

  {
    term: "Environmental Category B",
    definition:
      "EXIM's moderate environmental risk classification for projects with less severe impacts than Category A. Typically applies to expansions, upgrades, and projects with site-specific impacts. Includes thermal power plants below 140 MWe and new facilities with manageable mitigation. A full ESIA is not required, but EXIM conducts an objective environmental evaluation.",
    context:
      "Category B projects have a significantly faster environmental review than Category A. Sponsors of expansion projects should aim for Category B classification where the project scope supports it.",
    source: "https://www.exim.gov/policies/exim-bank-and-environment/environmental-and-social",
    related: ["Environmental Category A", "Environmental Category C", "ESIA"],
  },

  {
    term: "Environmental Category C",
    definition:
      "EXIM's lowest environmental risk classification for transactions exceeding $10 million that are not related to a physical project or involve projects with minimal or no adverse environmental/social impacts. Includes aircraft sales, telecommunications equipment, and feasibility studies. No further environmental review required beyond initial classification.",
    context:
      "Sponsors of non-physical projects or equipment-only transactions can expect minimal environmental processing time under Category C.",
    source: "https://www.exim.gov/policies/exim-bank-and-environment/environmental-and-social",
    related: ["Environmental Category A", "Environmental Category B"],
  },

  {
    term: "Environmental and Social Impact Assessment",
    acronym: "ESIA",
    definition:
      "A comprehensive study required for Category A projects demonstrating compliance with host-country environmental regulations and international guidelines (IFC Performance Standards, World Bank Group EHS Guidelines). The ESIA must address project alternatives, baseline conditions, impact analysis, mitigation measures, and stakeholder engagement. For Category A transactions, EXIM must make the ESIA publicly available for at least 30 calendar days before authorizing a Final Commitment.",
    context:
      "Sponsors should commission the ESIA early in project development, ideally during feasibility study phase, as it must be substantially complete before EXIM can begin final credit review. Inadequate ESIAs are a leading cause of EXIM application delays.",
    source: "https://www.exim.gov/policies/exim-bank-and-environment/procedures-and-guidelines",
    related: ["Environmental Category A", "Equator Principles", "IFC Performance Standards"],
  },

  {
    term: "Equator Principles",
    definition:
      "A globally recognized risk management framework adopted by EXIM in March 2011 for determining, assessing, and managing environmental and social risks in project finance. Projects producing over 100,000 tonnes CO2e annually must publicly report emissions during the operational phase. Projects above 25,000 tonnes CO2e are encouraged to report. EXIM's environmental procedures are designed to satisfy Equator Principles requirements.",
    context:
      "Sponsors familiar with Equator Principles from commercial bank project finance will find EXIM's environmental procedures largely aligned. Compliance with EXIM's procedures satisfies Equator Principles requirements, reducing duplicative analysis for co-financed transactions.",
    source: "https://www.exim.gov/policies/exim-and-environment/equator-principles",
    related: ["ESIA", "Environmental Category A", "Carbon Intensity Policy"],
  },

  {
    term: "Climate Change Sector Understanding",
    acronym: "CCSU",
    definition:
      "An annex to the OECD Arrangement providing extended repayment terms and pricing flexibilities for climate-friendly projects. The 2023 modernization expanded eligible technologies to include: environmentally sustainable energy production, CO2 capture/storage/transport, energy transmission/distribution/storage, clean hydrogen and ammonia, low-emissions manufacturing, zero/low-emissions transport, and clean energy minerals. Maximum repayment term: 22 years.",
    context:
      "Sponsors of renewable energy, battery storage, hydrogen, carbon capture, or critical minerals projects should structure their EXIM application under the CCSU to access the longest available repayment terms and reduced premium rates.",
    source: "https://www.exim.gov/news/exim-announces-longer-repayment-terms-flexibilities-for-climate-projects",
    related: ["OECD Arrangement", "Maximum Repayment Tenor", "Exposure Fee"],
    recentChanges:
      "2023 OECD modernization significantly expanded CCSU-eligible technologies and extended maximum tenor to 22 years. The expanded CCSU categories entered force in 2024.",
  },

  // ─── 7. APPLICATION MILESTONES ───────────────────────────────────────

  {
    term: "Letter of Interest",
    acronym: "LOI / LI",
    definition:
      "A non-binding letter from EXIM indicating preliminary willingness to consider financing a specific transaction, issued when the export contract has not yet been awarded. Processed within seven working days. Valid for six months, renewable for up to two years total. Terms stated in the LOI are indicative and subject to change upon final application.",
    context:
      "The LOI is a critical early milestone for sponsors because it signals EXIM's preliminary interest to potential buyers, EPC contractors, and co-financiers. It costs nothing and can be obtained before a contract is signed, making it a powerful business development tool.",
    source: "https://www.exim.gov/resources/applications-forms/letter-interest",
    related: ["Final Commitment", "Preliminary Commitment", "Data Room"],
  },

  {
    term: "Final Commitment",
    acronym: "FC / AP",
    definition:
      "EXIM's binding authorization of financing for a specific transaction, issued after all financial, technical, environmental, and legal analyses are completed and approved by EXIM's Board of Directors (for transactions exceeding $25 million). May result from conversion of an LOI or Preliminary Commitment, or be a standalone application. For project finance, the process from Phase I application to Final Commitment typically takes 6-9 months.",
    context:
      "Final Commitment is the definitive EXIM milestone that sponsors work toward throughout the project development cycle. All conditions precedent (substantially final contracts, completed ESIA, credit analysis) must be satisfied before the Board will authorize.",
    source: "https://www.exim.gov/solutions/loan-guarantee/application-process",
    related: ["Letter of Interest", "Conditions Precedent", "Board Authorization"],
  },

  {
    term: "Preliminary Commitment",
    acronym: "PC",
    definition:
      "A binding EXIM commitment issued after the export contract has been awarded but before all final commitment documentation is complete. It provides greater certainty than an LOI but less than a Final Commitment. Terms and conditions are specified and binding, subject to completion of remaining due diligence.",
    context:
      "Sponsors with signed export contracts but incomplete ESIA or financial documentation can use a PC to demonstrate committed EXIM financing to stakeholders while finalizing remaining requirements.",
    source: "https://www.exim.gov/solutions/loan-guarantee/application-process",
    related: ["Letter of Interest", "Final Commitment"],
  },

  // ─── 8. COMPLIANCE & POLICY ──────────────────────────────────────────

  {
    term: "Foreign Corrupt Practices Act Compliance",
    acronym: "FCPA",
    definition:
      "EXIM's anti-corruption policy implementing the FCPA prohibition against corrupt payments to foreign government officials to obtain or retain business. EXIM requires anti-bribery representations from all applicants and reserves the right to reject or cancel any transaction where there is a reasonable basis to believe bribery has occurred. Extends to U.S. persons and certain foreign securities issuers. EXIM also adheres to OECD anti-bribery recommendations, conducting enhanced due diligence for exporters/applicants indicted, convicted, or debarred for bribery.",
    context:
      "Sponsors must implement robust anti-corruption compliance programs covering all project participants. EXIM will investigate allegations of corruption at any stage of the transaction and can cancel authorized commitments.",
    source: "https://www.exim.gov/policies/foreign-corrupt-practices-and-other-anti-bribery-measures",
    related: ["Sanctions Compliance", "Illicit Finance"],
  },

  {
    term: "Tied Aid",
    definition:
      "Official development aid tied to the procurement of goods and services from the donor country, offered at concessional (below-market) terms. The OECD Helsinki Package (1992) and subsequent rules restrict tied aid to prevent trade-distorting subsidies. EXIM maintains a 'tied aid war chest' -- Congressional authority to match foreign tied aid offers that would unfairly disadvantage U.S. exporters. EXIM must notify the OECD before deploying matching tied aid.",
    context:
      "Sponsors competing against foreign ECA-backed bids with tied aid components should alert EXIM early. EXIM can match concessional terms under its tied aid authority, but the process requires OECD notification and takes additional time.",
    source: "https://www.exim.gov/policies/tied-aid",
    related: ["OECD Arrangement", "Co-Financing"],
    recentChanges: "New Tied Aid Procedures agreed October 2020.",
  },

  {
    term: "U.S. Flag Shipping Requirement (MARAD)",
    definition:
      "Federal requirement, enforced by the Maritime Administration (MARAD), that cargo financed by EXIM Bank loans and loan guarantees exceeding $20 million or with terms over 7 years must be shipped exclusively on U.S.-flag vessels. Waivers may be available when U.S.-flag vessels are not reasonably available.",
    context:
      "Sponsors of large equipment exports (turbines, transformers, heavy machinery) must factor U.S.-flag shipping costs into project economics. U.S.-flag vessel rates can be 2-3x foreign-flag rates. Waiver applications should be filed early with MARAD.",
    source: "https://www.maritime.dot.gov/cargo-preference/civilian-agencies/shipping-guidance-cargo-financed-ex-im-bank",
    related: ["US Content Policy", "Disbursement Period"],
  },

  {
    term: "Co-Financing",
    definition:
      "EXIM's framework for structuring transactions jointly with other export credit agencies when the export package includes goods and services from multiple countries. Co-financing enables sponsors to access ECA support from several countries under coordinated terms, reducing documentation complexity and aligning repayment schedules.",
    context:
      "Sponsors with multi-country supply chains should explore co-financing early to maximize ECA coverage across the entire project. EXIM has established co-financing frameworks with several partner ECAs.",
    source: "https://www.exim.gov/policies/co-financing",
    related: ["OECD Arrangement", "US Content Policy", "Tied Aid"],
  },

  // ─── 9. PROJECT FINANCE SPECIFICS ────────────────────────────────────

  {
    term: "Limited Recourse Project Finance",
    definition:
      "EXIM's financing structure for projects dependent on project cash flows for repayment, as defined by contractual relationships within each project, rather than relying on the balance sheet of a sovereign or corporate sponsor. EXIM has no dollar limits based on project size, sector, or country. Suitable for greenfield projects and significant facility expansions. Requires long-term contracts from creditworthy entities for output purchase and major input supply extending beyond the financing term.",
    context:
      "Sponsors pursuing EXIM project finance must demonstrate bankable contractual structures (PPA, offtake, EPC, O&M) with appropriate risk allocation. EXIM requires sensitivity analysis showing sufficient DSCR across stress scenarios.",
    source: "https://www.exim.gov/solutions/project-and-structured-finance/our-approach-to-project-finance",
    related: ["Interest During Construction", "DSCR", "Off-Taker", "EPC"],
  },

  {
    term: "Debt Service Coverage Ratio",
    acronym: "DSCR",
    definition:
      "The ratio of a project's net operating cash flow to its total debt service obligations (principal plus interest) in any given period. EXIM requires sensitivity analysis demonstrating sufficient DSCR to ensure uninterrupted debt servicing throughout the loan term under various stress scenarios including revenue shortfall, cost overrun, and delay.",
    context:
      "EXIM does not publish a fixed minimum DSCR, but project finance market practice and EXIM precedent typically require 1.2-1.4x for infrastructure projects. Sponsors should model DSCR under base, downside, and break-even scenarios in their financial projections.",
    source: "https://www.exim.gov/solutions/project-and-structured-finance/our-approach-to-project-finance",
    related: ["Limited Recourse Project Finance", "Interest During Construction", "Sensitivity Analysis"],
  },

  {
    term: "Substantially Final Form",
    definition:
      "EXIM's standard requiring that key project agreements (EPC contract, PPA/offtake agreement, concession agreement, O&M contract, shareholder agreement) must be in near-executed form -- not summaries, outlines, or term sheets -- before EXIM will authorize a Final Commitment. This means all material commercial terms must be agreed and the documents must be ready for signature.",
    context:
      "Sponsors frequently underestimate the time required to bring all project agreements to substantially final form simultaneously. This is typically the most time-consuming condition precedent and the primary driver of delays to Final Commitment.",
    source: "https://www.exim.gov/solutions/project-and-structured-finance/guidelines-for-submitting-successful-application",
    related: ["Final Commitment", "Conditions Precedent", "Data Room"],
  },

  // ─── 10. ADDITIONAL PROGRAMS & PRODUCTS ──────────────────────────────

  {
    term: "Working Capital Guarantee Program",
    acronym: "WCGP",
    definition:
      "An EXIM asset-based lending program that guarantees 90% of principal and accrued interest on working capital loans from commercial lenders to U.S. exporters. Borrowing capacity is determined by a formula-based borrowing base calculated on export-related inventory and accounts receivable. Carries the full faith and credit of the U.S. government.",
    context:
      "U.S. exporters (including EPC contractors) can use the WCGP to finance pre-export manufacturing, raw materials procurement, and labor costs while awaiting payment from foreign buyers.",
    source: "https://www.exim.gov/coronavirus-response/fact-sheet-background-on-working-capital-guarantee-program",
    related: ["Supply Chain Finance Guarantee", "Small Business Mandate"],
  },

  {
    term: "Supply Chain Finance Guarantee",
    acronym: "SCFG",
    definition:
      "EXIM guarantee to lenders covering 90% of eligible accounts receivable in supply chain financing arrangements between U.S. exporters and their suppliers. Designed to increase liquidity in export supply chains and provide suppliers (particularly small businesses) with faster, lower-cost access to capital. Exported products must contain more than 50% U.S. content.",
    context:
      "Sponsors can help their U.S.-based suppliers access capital by facilitating EXIM supply chain finance, strengthening the domestic supply chain and supporting EXIM's small business mandate.",
    source: "https://www.exim.gov/solutions/working-capital/supply-chain-finance",
    related: ["Working Capital Guarantee Program", "Small Business Mandate", "US Content Policy"],
  },

  {
    term: "Interagency Country Risk Assessment System",
    acronym: "ICRAS",
    definition:
      "The U.S. government's interagency system for classifying country credit risk across eleven categories, used when a country has not been classified by the OECD process. EXIM translates ICRAS classifications into corresponding OECD country risk categories (0-7) for exposure fee pricing purposes.",
    context:
      "For projects in frontier markets not yet classified by the OECD, sponsors should anticipate that EXIM will use the ICRAS-to-OECD translation to determine pricing. These markets may lack the pricing transparency available in OECD-classified countries.",
    source: "https://www.exim.gov/resources/exposure-fees/credit-classification-and-credit-rating-agency-rating-matrix",
    related: ["OECD Country Risk Category", "Exposure Fee", "Country Limitation Schedule"],
  },

  {
    term: "Reauthorization (2019 / 2026 Sunset)",
    definition:
      "In December 2019, Congress reauthorized EXIM through December 31, 2026 via the Further Consolidated Appropriations Act, 2020. This seven-year reauthorization established CTEP, mandated the 20% transformational exports target, and set temporary Board quorum procedures. Both EXIM's charter and CTEP sunset on December 31, 2026. S. 3772 (119th Congress) proposes a 10-year extension.",
    context:
      "Sponsors with project timelines extending beyond 2026 should monitor reauthorization progress closely. If EXIM's charter lapses, the bank cannot authorize new transactions, though existing commitments remain enforceable.",
    source: "https://www.congress.gov/crs-product/IF10017",
    related: ["CTEP", "Small Business Mandate", "Default Rate Cap"],
    recentChanges:
      "The 119th Congress is actively debating reauthorization options: clean extension, comprehensive reform, or allowing sunset. S. 3772 would extend by 10 years.",
  },

  {
    term: "Export Credit Insurance",
    definition:
      "EXIM insurance policies protecting U.S. exporters and their lenders against non-payment by foreign buyers due to commercial risks (buyer insolvency, protracted default) and/or political risks (war, expropriation, currency inconvertibility). Available as multi-buyer policies, single-buyer policies, and financial institution buyer credit policies. Coverage percentages vary by policy type.",
    context:
      "Sponsors who are also exporters can use EXIM credit insurance for shorter-term or smaller transactions where a full guarantee or direct loan structure is not warranted.",
    source: "https://www.exim.gov/solutions/export-credit-insurance",
    related: ["Comprehensive Cover", "Political-Only Cover", "Supplier Credit"],
  },
];
