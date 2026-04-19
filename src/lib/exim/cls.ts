// EXIM Country Limitation Schedule — simplified 3-tier starter map.
//
// This is a *starter* reduction of EXIM's published CLS, grouping the real categories
// (short-term, medium-term, long-term, public/private-sector restrictions) into three
// coarse tiers suitable for a globe tint. It is NOT authoritative and should not drive
// eligibility decisions — consult the official CLS for any project finance analysis.
//
// Source: https://www.exim.gov/policies/country-limitation-schedule
// Captured: 2026-Q1 (update quarterly; owner: sponsor operations).
// When refreshing, also update the `sourceDate` export below.

export const CLS_SOURCE_DATE = "2026-Q1";

export type ClsTier = "eligible" | "restricted" | "off_cover";

export const CLS_TIER_LABEL: Record<ClsTier, string> = {
  eligible:   "Eligible",
  restricted: "Restricted",
  off_cover:  "Off-cover",
};

export const CLS_TIER_COLOR: Record<ClsTier, string> = {
  eligible:   "#1a6b6b",  // teal
  restricted: "#b07d2a",  // gold
  off_cover:  "#c24a1e",  // accent
};

// Starter list. Defaults to "eligible" for anything not in this map — verify against
// the official schedule before acting on it. Non-exhaustive by design.
export const CLS_TIERS: Record<string, ClsTier> = {
  // Off-cover / sanctioned / high-risk (illustrative starter set)
  AF: "off_cover", // Afghanistan
  BY: "off_cover", // Belarus
  CU: "off_cover", // Cuba
  IR: "off_cover", // Iran
  KP: "off_cover", // North Korea
  MM: "off_cover", // Myanmar
  RU: "off_cover", // Russia
  SD: "off_cover", // Sudan
  SS: "off_cover", // South Sudan
  SY: "off_cover", // Syria
  VE: "off_cover", // Venezuela — public sector off, private restricted (simplified)
  YE: "off_cover", // Yemen
  ZW: "off_cover", // Zimbabwe

  // Restricted (public-sector restrictions, medium/long-term caveats — simplified)
  AO: "restricted", // Angola
  AR: "restricted", // Argentina
  BO: "restricted", // Bolivia
  CM: "restricted", // Cameroon
  CD: "restricted", // DRC
  EC: "restricted", // Ecuador
  ER: "restricted", // Eritrea
  ET: "restricted", // Ethiopia
  GN: "restricted", // Guinea
  HT: "restricted", // Haiti
  IQ: "restricted", // Iraq
  LB: "restricted", // Lebanon
  LY: "restricted", // Libya
  ML: "restricted", // Mali
  NI: "restricted", // Nicaragua
  NG: "restricted", // Nigeria (certain sectors)
  PK: "restricted", // Pakistan
  SO: "restricted", // Somalia
  TJ: "restricted", // Tajikistan
  TM: "restricted", // Turkmenistan

  // Everything else defaults to "eligible"
};

export function getClsTier(countryCode: string): ClsTier {
  const key = countryCode?.toUpperCase();
  return (key && CLS_TIERS[key]) || "eligible";
}
