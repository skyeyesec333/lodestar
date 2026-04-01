"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/actions/projects";
import {
  DealTypeOption,
  type DealTypeValue,
  DEAL_TYPES,
} from "@/components/projects/DealTypeScreen";
import {
  EximEligibilityScreen,
  type EligibilityResult,
} from "@/components/projects/EximEligibilityScreen";
import { getWorkspaceTemplate, type WorkspaceTemplate } from "@/lib/templates/directory";

const SECTOR_OPTIONS = [
  { value: "power", label: "Power / Energy" },
  { value: "mining", label: "Mining / Extractives" },
  { value: "water", label: "Water / Infrastructure" },
  { value: "transport", label: "Transportation" },
  { value: "telecom", label: "Telecommunications" },
  { value: "other", label: "Other" },
] as const;

type SectorValue = (typeof SECTOR_OPTIONS)[number]["value"];

const COVER_OPTIONS = [
  { value: "comprehensive", label: "Comprehensive Cover" },
  { value: "political_only", label: "Political-Only Cover" },
] as const;

type CoverValue = (typeof COVER_OPTIONS)[number]["value"];

const ENV_CATEGORY_OPTIONS = [
  { value: "category_a", label: "Category A — Significant impact" },
  { value: "category_b", label: "Category B — Moderate impact" },
  { value: "category_c", label: "Category C — Minimal impact" },
  { value: "category_fi", label: "Category FI — Financial intermediary" },
] as const;

type EnvCategoryValue = (typeof ENV_CATEGORY_OPTIONS)[number]["value"];

const PROGRAM_PATH_OPTIONS = [
  { value: "standard", label: "Standard long-term" },
  { value: "ctep", label: "CTEP" },
  { value: "mmia", label: "MMIA" },
  { value: "critical_minerals", label: "Critical minerals" },
  { value: "engineering_multiplier", label: "Engineering multiplier" },
] as const;

type ProgramPathValue = (typeof PROGRAM_PATH_OPTIONS)[number]["value"];

const STAGE_OPTIONS = [
  { value: "concept", label: "Concept" },
  { value: "pre_loi", label: "Early development" },
  { value: "loi_submitted", label: "Mandate / Approval" },
  { value: "loi_approved", label: "Due diligence" },
  { value: "pre_commitment", label: "Pre-commitment" },
  { value: "final_commitment", label: "Committed" },
  { value: "financial_close", label: "Financial close" },
] as const;

type StageValue = (typeof STAGE_OPTIONS)[number]["value"];

const COUNTRY_OPTIONS = [
  { code: "AO", name: "Angola" },
  { code: "AR", name: "Argentina" },
  { code: "BD", name: "Bangladesh" },
  { code: "BR", name: "Brazil" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CO", name: "Colombia" },
  { code: "EG", name: "Egypt" },
  { code: "ET", name: "Ethiopia" },
  { code: "GH", name: "Ghana" },
  { code: "ID", name: "Indonesia" },
  { code: "IN", name: "India" },
  { code: "IQ", name: "Iraq" },
  { code: "JO", name: "Jordan" },
  { code: "KE", name: "Kenya" },
  { code: "MA", name: "Morocco" },
  { code: "MX", name: "Mexico" },
  { code: "MZ", name: "Mozambique" },
  { code: "NG", name: "Nigeria" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PK", name: "Pakistan" },
  { code: "RW", name: "Rwanda" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "TZ", name: "Tanzania" },
  { code: "UA", name: "Ukraine" },
  { code: "UG", name: "Uganda" },
  { code: "VN", name: "Vietnam" },
  { code: "ZA", name: "South Africa" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
] as const;

interface WizardState {
  name: string;
  countryCode: string;
  sector: SectorValue | "";
  description: string;
  capexMillions: string;
  stage: StageValue | "";
  targetCloseDate: string;
  dealType: DealTypeValue | "";
  targetLoiDate: string;
  eximCoverType: CoverValue | "";
  envCategory: EnvCategoryValue | "";
  programPath: ProgramPathValue;
  sponsorRationale: string;
  targetOutcome: string;
  knownUnknowns: string;
  fatalFlaws: string;
  nextActions: string;
  goNoGoRecommendation: string;
}

const initialState: WizardState = {
  name: "",
  countryCode: "",
  sector: "",
  description: "",
  capexMillions: "",
  stage: "",
  targetCloseDate: "",
  dealType: "",
  targetLoiDate: "",
  eximCoverType: "",
  envCategory: "",
  programPath: "standard",
  sponsorRationale: "",
  targetOutcome: "",
  knownUnknowns: "",
  fatalFlaws: "",
  nextActions: "",
  goNoGoRecommendation: "",
};

function mapTemplateSector(template: WorkspaceTemplate): SectorValue {
  switch (template.sector) {
    case "energy":
      return "power";
    case "water":
      return "water";
    case "transport":
      return "transport";
    case "industrial":
    case "cross_sector":
    default:
      return "other";
  }
}

function mapTemplateDealType(template: WorkspaceTemplate): DealTypeValue {
  switch (template.capitalPath) {
    case "exim_project_finance":
    case "commercial_finance":
    case "development_finance":
    case "private_equity":
      return template.capitalPath;
    case "hybrid":
    default:
      return "other";
  }
}

function buildInitialState(template: WorkspaceTemplate | null): WizardState {
  if (!template) return initialState;
  return {
    ...initialState,
    sector: mapTemplateSector(template),
    dealType: mapTemplateDealType(template),
    description: template.summary,
    targetOutcome: template.summary,
  };
}

interface OnboardingWizardProps {
  onComplete: (projectSlug: string) => void;
  onBack: () => void;
  templateId?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "'Inter', sans-serif",
  fontSize: "15px",
  color: "var(--ink)",
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  padding: "10px 14px",
  outline: "none",
  lineHeight: 1.5,
  boxSizing: "border-box",
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: "var(--teal)",
  boxShadow: "0 0 0 2px var(--teal-soft)",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  backgroundImage:
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b6b64' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: "36px",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: "6px",
};

const fieldStyle: React.CSSProperties = {
  marginBottom: "20px",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  color: "var(--accent)",
  marginTop: "4px",
};

function ContextBox({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "var(--gold-soft)",
        border: "1px solid var(--gold)",
        borderRadius: "6px",
        padding: "16px 18px",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 8px 0",
        }}
      >
        {label ?? "Context"}
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink-mid)",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {children}
      </p>
    </div>
  );
}

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "32px",
      }}
    >
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < current;
        const isCurrent = stepNum === current;

        const circleStyle: React.CSSProperties = {
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          fontWeight: 600,
          flexShrink: 0,
          backgroundColor: isCompleted ? "var(--teal)" : "transparent",
          border: isCompleted
            ? "2px solid var(--teal)"
            : isCurrent
              ? "2px solid var(--teal)"
              : "2px solid var(--border)",
          color: isCompleted ? "#ffffff" : isCurrent ? "var(--teal)" : "var(--ink-muted)",
        };

        return (
          <div key={stepNum} style={{ display: "flex", alignItems: "center", flex: idx < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div style={circleStyle}>
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "8px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: isCurrent ? "var(--teal)" : "var(--ink-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "1px",
                  backgroundColor: isCompleted ? "var(--teal)" : "var(--border)",
                  margin: "0 6px",
                  marginBottom: "18px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          minWidth: "130px",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px",
          color: "var(--ink)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={fieldStyle}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required && <span style={{ color: "var(--accent)", marginLeft: "2px" }}>*</span>}
      </label>
      {children}
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

export function OnboardingWizard({ onComplete, onBack, templateId }: OnboardingWizardProps) {
  const selectedTemplate = getWorkspaceTemplate(templateId);
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(() => buildInitialState(selectedTemplate));
  const [errors, setErrors] = useState<Partial<Record<keyof WizardState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [showEximEligibility, setShowEximEligibility] = useState(false);

  const isExim = state.dealType === "exim_project_finance";
  const steps = ["Workspace", "Concept", "Capital", "Launch"];

  function setField<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function setDealType(value: DealTypeValue) {
    setState((prev) => ({
      ...prev,
      dealType: value,
      ...(value === "exim_project_finance"
        ? {}
        : {
            eximCoverType: "",
            envCategory: "",
            programPath: "standard",
            targetLoiDate: "",
          }),
    }));
    setSubmitError(null);
    if (value !== "exim_project_finance") {
      setEligibilityResult(null);
    }
    if (errors.dealType) {
      setErrors((prev) => ({ ...prev, dealType: undefined }));
    }
  }

  function getFocusStyle(name: string): React.CSSProperties {
    return focusedField === name ? inputFocusStyle : {};
  }

  function validateStep1(): boolean {
    const nextErrors: Partial<Record<keyof WizardState, string>> = {};
    if (!state.name.trim()) nextErrors.name = "Workspace name is required.";
    else if (state.name.trim().length < 2) nextErrors.name = "Name must be at least 2 characters.";
    if (!state.countryCode) nextErrors.countryCode = "Country is required.";
    if (!state.sector) nextErrors.sector = "Sector is required.";
    if (!state.description.trim()) nextErrors.description = "A short concept statement is required.";
    else if (state.description.trim().length < 12) nextErrors.description = "Add a little more context so the workspace starts with a usable concept.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2(): boolean {
    const nextErrors: Partial<Record<keyof WizardState, string>> = {};
    if (state.capexMillions !== "" && Number(state.capexMillions) <= 0) {
      nextErrors.capexMillions = "CAPEX must be a positive number.";
    }
    if (!state.targetOutcome.trim()) {
      nextErrors.targetOutcome = "State the concrete outcome the team is pursuing.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep3(): boolean {
    const nextErrors: Partial<Record<keyof WizardState, string>> = {};
    if (!state.dealType) nextErrors.dealType = "Choose a financing path.";
    if (isExim && !eligibilityResult) nextErrors.dealType = "Run the EXIM pre-screen before continuing.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    const valid =
      step === 1 ? validateStep1() :
      step === 2 ? validateStep2() :
      step === 3 ? validateStep3() :
      true;
    if (valid) {
      setStep((current) => current + 1);
    }
  }

  function handleBack() {
    if (step === 1) {
      onBack();
    } else {
      setStep((current) => current - 1);
    }
  }

  function handleEligibilityPass(result: EligibilityResult) {
    setEligibilityResult(result);
    setShowEximEligibility(false);
    if (result.sector && state.sector === "other") {
      setField("sector", result.sector);
    }
    if (errors.dealType) {
      setErrors((prev) => ({ ...prev, dealType: undefined }));
    }
  }

  function handleSubmit() {
    setSubmitError(null);
    startTransition(async () => {
      const capexUsd =
        state.capexMillions !== ""
          ? Math.round(parseFloat(state.capexMillions) * 1_000_000)
          : null;

      const result = await createProject({
        name: state.name.trim(),
        countryCode: state.countryCode,
        sector: state.sector as SectorValue,
        description: state.description.trim(),
        capexUsd: capexUsd && !Number.isNaN(capexUsd) && capexUsd > 0 ? capexUsd : null,
        stage: (state.stage || "concept") as StageValue,
        dealType: (state.dealType || "other") as DealTypeValue,
        targetCloseDate: state.targetCloseDate ? new Date(state.targetCloseDate) : null,
        targetLoiDate: isExim && state.targetLoiDate ? new Date(state.targetLoiDate) : null,
        eximCoverType: isExim ? (state.eximCoverType as CoverValue) || null : null,
        environmentalCategory: isExim ? (state.envCategory as EnvCategoryValue) || null : null,
        programPath: isExim ? state.programPath : "standard",
        sponsorRationale: state.sponsorRationale.trim() || null,
        targetOutcome: state.targetOutcome.trim() || null,
        knownUnknowns: state.knownUnknowns.trim() || null,
        fatalFlaws: state.fatalFlaws.trim() || null,
        nextActions: state.nextActions.trim() || null,
        goNoGoRecommendation: state.goNoGoRecommendation.trim() || null,
      });

      if (!result.ok) {
        setSubmitError(result.error.message);
        return;
      }

      onComplete(result.value.slug);
    });
  }

  function sectorLabel(value: string) {
    return SECTOR_OPTIONS.find((option) => option.value === value)?.label ?? value;
  }

  function coverLabel(value: string) {
    return COVER_OPTIONS.find((option) => option.value === value)?.label ?? value;
  }

  function envLabel(value: string) {
    return ENV_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
  }

  function stageLabel(value: string) {
    return STAGE_OPTIONS.find((option) => option.value === value)?.label ?? value;
  }

  function countryLabel(code: string) {
    return COUNTRY_OPTIONS.find((country) => country.code === code)?.name ?? code;
  }

  const twoColGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  };

  return (
    <>
      {showEximEligibility ? (
        <EximEligibilityScreen
          onPass={handleEligibilityPass}
          onExit={() => setShowEximEligibility(false)}
        />
      ) : null}

      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {selectedTemplate ? (
          <div
            style={{
              marginBottom: "18px",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              backgroundColor: "color-mix(in srgb, var(--teal) 8%, var(--bg-card))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                  margin: "0 0 6px",
                }}
              >
                Selected template
              </p>
              <p
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "22px",
                  fontWeight: 400,
                  color: "var(--ink)",
                  margin: "0 0 4px",
                }}
              >
                {selectedTemplate.name}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: "var(--ink-mid)",
                  margin: 0,
                  maxWidth: "560px",
                }}
              >
                {selectedTemplate.summary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.history.replaceState(window.history.state, "", window.location.pathname)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              Clear template
            </button>
          </div>
        ) : null}

        <StepIndicator current={step} steps={steps} />

        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "32px",
          }}
        >
          {step === 1 ? (
            <div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                  margin: "0 0 6px 0",
                }}
              >
                Step 1 of 4
              </p>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "24px",
                  fontWeight: 400,
                  color: "var(--ink)",
                  margin: "0 0 10px 0",
                }}
              >
                Create deal workspace
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                }}
              >
                Start with the deal shell itself: what the project is, where it sits, and the short concept statement the team will rally around.
              </p>

              <div
                className="wizard-layout"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                  gap: "24px",
                }}
              >
                <div>
                  <Field id="name" label="Workspace name" required error={errors.name}>
                    <input
                      id="name"
                      value={state.name}
                      onChange={(event) => setField("name", event.target.value)}
                      maxLength={120}
                      placeholder="e.g. Rufiji Water Treatment Expansion"
                      style={{ ...inputStyle, ...getFocusStyle("name") }}
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </Field>

                  <div style={twoColGrid}>
                    <Field id="countryCode" label="Country" required error={errors.countryCode}>
                      <select
                        id="countryCode"
                        value={state.countryCode}
                        onChange={(event) => setField("countryCode", event.target.value)}
                        style={{ ...selectStyle, ...getFocusStyle("countryCode") }}
                        onFocus={() => setFocusedField("countryCode")}
                        onBlur={() => setFocusedField(null)}
                      >
                        <option value="" disabled>Select country</option>
                        {COUNTRY_OPTIONS.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name} ({country.code})
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field id="sector" label="Sector" required error={errors.sector}>
                      <select
                        id="sector"
                        value={state.sector}
                        onChange={(event) => setField("sector", event.target.value as SectorValue)}
                        style={{ ...selectStyle, ...getFocusStyle("sector") }}
                        onFocus={() => setFocusedField("sector")}
                        onBlur={() => setFocusedField(null)}
                      >
                        <option value="" disabled>Select sector</option>
                        {SECTOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field id="description" label="One-sentence concept" required error={errors.description}>
                    <textarea
                      id="description"
                      rows={4}
                      maxLength={500}
                      placeholder="Describe the asset, sponsor thesis, and what this deal is trying to achieve."
                      value={state.description}
                      onChange={(event) => setField("description", event.target.value)}
                      style={{
                        ...inputStyle,
                        resize: "vertical",
                        minHeight: "110px",
                        ...getFocusStyle("description"),
                      }}
                      onFocus={() => setFocusedField("description")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </Field>
                </div>

                <ContextBox label="Workspace seed">
                  Lodestar will create the full operating shell right away: Concept, Parties, Capital, Workplan, Evidence, and Execution. This first step makes sure those workspaces start with a useful thesis instead of a blank record.
                </ContextBox>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                  margin: "0 0 6px 0",
                }}
              >
                Step 2 of 4
              </p>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "24px",
                  fontWeight: 400,
                  color: "var(--ink)",
                  margin: "0 0 10px 0",
                }}
              >
                Concept framing
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                }}
              >
                Capture the first operating assumptions: deal size, current maturity, and the target closing horizon the team should work against.
              </p>

              <div
                className="wizard-layout"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                  gap: "24px",
                }}
              >
                <div>
                  <div style={twoColGrid}>
                    <Field id="capexMillions" label="CAPEX ($M)" error={errors.capexMillions}>
                      <input
                        id="capexMillions"
                        type="number"
                        min={0}
                        step={1}
                        placeholder="e.g. 250"
                        value={state.capexMillions}
                        onChange={(event) => setField("capexMillions", event.target.value)}
                        style={{ ...inputStyle, ...getFocusStyle("capexMillions") }}
                        onFocus={() => setFocusedField("capexMillions")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>

                    <Field id="stage" label="Current maturity">
                      <select
                        id="stage"
                        value={state.stage}
                        onChange={(event) => setField("stage", event.target.value as StageValue)}
                        style={{ ...selectStyle, ...getFocusStyle("stage") }}
                        onFocus={() => setFocusedField("stage")}
                        onBlur={() => setFocusedField(null)}
                      >
                        <option value="">Select maturity</option>
                        {STAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field id="targetCloseDate" label="Target close / decision date">
                    <input
                      id="targetCloseDate"
                      type="date"
                      value={state.targetCloseDate}
                      onChange={(event) => setField("targetCloseDate", event.target.value)}
                      style={{ ...inputStyle, ...getFocusStyle("targetCloseDate") }}
                      onFocus={() => setFocusedField("targetCloseDate")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </Field>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                    <Field id="targetOutcome" label="Target outcome" required error={errors.targetOutcome}>
                      <textarea
                        id="targetOutcome"
                        rows={3}
                        maxLength={500}
                        placeholder="What concrete outcome should this workspace drive toward: mandate, LOI, diligence decision, close, or another milestone?"
                        value={state.targetOutcome}
                        onChange={(event) => setField("targetOutcome", event.target.value)}
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: "96px",
                          ...getFocusStyle("targetOutcome"),
                        }}
                        onFocus={() => setFocusedField("targetOutcome")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>

                    <Field id="sponsorRationale" label="Sponsor rationale">
                      <textarea
                        id="sponsorRationale"
                        rows={3}
                        maxLength={500}
                        placeholder="Why is the sponsor pursuing this now, and what strategic angle matters most?"
                        value={state.sponsorRationale}
                        onChange={(event) => setField("sponsorRationale", event.target.value)}
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: "96px",
                          ...getFocusStyle("sponsorRationale"),
                        }}
                        onFocus={() => setFocusedField("sponsorRationale")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                    <Field id="knownUnknowns" label="Known unknowns">
                      <textarea
                        id="knownUnknowns"
                        rows={3}
                        maxLength={500}
                        placeholder="What is still unclear enough that it could change the financing path or project shape?"
                        value={state.knownUnknowns}
                        onChange={(event) => setField("knownUnknowns", event.target.value)}
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: "96px",
                          ...getFocusStyle("knownUnknowns"),
                        }}
                        onFocus={() => setFocusedField("knownUnknowns")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>

                    <Field id="fatalFlaws" label="Fatal flaws">
                      <textarea
                        id="fatalFlaws"
                        rows={3}
                        maxLength={500}
                        placeholder="What could kill the deal outright if confirmed?"
                        value={state.fatalFlaws}
                        onChange={(event) => setField("fatalFlaws", event.target.value)}
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: "96px",
                          ...getFocusStyle("fatalFlaws"),
                        }}
                        onFocus={() => setFocusedField("fatalFlaws")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                    <Field id="nextActions" label="Next actions">
                      <textarea
                        id="nextActions"
                        rows={3}
                        maxLength={500}
                        placeholder="List the first actions the team should take to validate or de-risk the concept."
                        value={state.nextActions}
                        onChange={(event) => setField("nextActions", event.target.value)}
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: "96px",
                          ...getFocusStyle("nextActions"),
                        }}
                        onFocus={() => setFocusedField("nextActions")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>

                    <Field id="goNoGoRecommendation" label="Go / no-go recommendation">
                      <textarea
                        id="goNoGoRecommendation"
                        rows={3}
                        maxLength={500}
                        placeholder="State the current recommendation and why."
                        value={state.goNoGoRecommendation}
                        onChange={(event) => setField("goNoGoRecommendation", event.target.value)}
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: "96px",
                          ...getFocusStyle("goNoGoRecommendation"),
                        }}
                        onFocus={() => setFocusedField("goNoGoRecommendation")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>
                  </div>
                </div>

                <ContextBox label="Concept guidance">
                  This step should orient the team before the real work starts. Capture enough context that Concept, Capital, and Workplan open with a usable point of view instead of a blank shell.
                </ContextBox>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                  margin: "0 0 6px 0",
                }}
              >
                Step 3 of 4
              </p>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "24px",
                  fontWeight: 400,
                  color: "var(--ink)",
                  margin: "0 0 10px 0",
                }}
              >
                Capital path and program module
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                }}
              >
                Choose the most likely financing path now. Program-specific framing only appears after that choice, instead of dominating the front door for every deal.
              </p>

              <div
                className="wizard-layout"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                  gap: "24px",
                }}
              >
                <div>
                  <Field id="dealType" label="Financing path" required error={errors.dealType}>
                    <div>
                      {DEAL_TYPES.map((option) => (
                        <DealTypeOption
                          key={option.value}
                          value={option.value}
                          label={option.label}
                          description={option.description}
                          badge={option.badge}
                          selected={state.dealType === option.value}
                          onClick={() => setDealType(option.value)}
                        />
                      ))}
                    </div>
                  </Field>

                  {isExim ? (
                    <div
                      style={{
                        backgroundColor: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        padding: "16px 18px",
                        marginTop: "8px",
                      }}
                    >
                      <p className="eyebrow" style={{ marginBottom: "8px" }}>EXIM module</p>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          color: "var(--ink-mid)",
                          lineHeight: 1.6,
                          margin: "0 0 14px",
                        }}
                      >
                        Run the EXIM pre-screen so the workspace starts with the right sector and risk advisories instead of assuming eligibility.
                      </p>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: eligibilityResult ? "14px" : 0 }}>
                        <button
                          type="button"
                          onClick={() => setShowEximEligibility(true)}
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "11px",
                            fontWeight: 500,
                            letterSpacing: "0.10em",
                            textTransform: "uppercase",
                            color: "#ffffff",
                            backgroundColor: "var(--teal)",
                            border: "none",
                            borderRadius: "3px",
                            padding: "10px 16px",
                            cursor: "pointer",
                          }}
                        >
                          {eligibilityResult ? "Re-run EXIM module" : "Run EXIM module"}
                        </button>
                        {eligibilityResult ? (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "10px",
                              letterSpacing: "0.10em",
                              textTransform: "uppercase",
                              color: eligibilityResult.passed ? "var(--teal)" : "var(--gold)",
                            }}
                          >
                            {eligibilityResult.passed ? "Pre-screen passed" : "Continue with advisory risk"}
                          </span>
                        ) : null}
                      </div>

                      {eligibilityResult ? (
                        <div style={{ display: "grid", gap: "12px" }}>
                          <div style={twoColGrid}>
                            <Field id="programPath" label="Program path">
                              <select
                                id="programPath"
                                value={state.programPath}
                                onChange={(event) => setField("programPath", event.target.value as ProgramPathValue)}
                                style={{ ...selectStyle, ...getFocusStyle("programPath") }}
                                onFocus={() => setFocusedField("programPath")}
                                onBlur={() => setFocusedField(null)}
                              >
                                {PROGRAM_PATH_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>

                            <Field id="targetLoiDate" label="Target LOI date">
                              <input
                                id="targetLoiDate"
                                type="date"
                                value={state.targetLoiDate}
                                onChange={(event) => setField("targetLoiDate", event.target.value)}
                                style={{ ...inputStyle, ...getFocusStyle("targetLoiDate") }}
                                onFocus={() => setFocusedField("targetLoiDate")}
                                onBlur={() => setFocusedField(null)}
                              />
                            </Field>
                          </div>

                          <div style={twoColGrid}>
                            <Field id="eximCoverType" label="EXIM cover type">
                              <select
                                id="eximCoverType"
                                value={state.eximCoverType}
                                onChange={(event) => setField("eximCoverType", event.target.value as CoverValue)}
                                style={{ ...selectStyle, ...getFocusStyle("eximCoverType") }}
                                onFocus={() => setFocusedField("eximCoverType")}
                                onBlur={() => setFocusedField(null)}
                              >
                                <option value="">Not yet determined</option>
                                {COVER_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>

                            <Field id="envCategory" label="Environmental category">
                              <select
                                id="envCategory"
                                value={state.envCategory}
                                onChange={(event) => setField("envCategory", event.target.value as EnvCategoryValue)}
                                style={{ ...selectStyle, ...getFocusStyle("envCategory") }}
                                onFocus={() => setFocusedField("envCategory")}
                                onBlur={() => setFocusedField(null)}
                              >
                                <option value="">Not yet determined</option>
                                {ENV_CATEGORY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <ContextBox label={isExim ? "Program context" : "Capital context"}>
                  {isExim
                    ? "EXIM is now a chosen module, not the default shape of every new deal. Complete the pre-screen, capture the likely program path, and only then let EXIM-specific assumptions seed the workspace."
                    : "This choice sets the tone for the Capital workspace and later requirement taxonomies. You can change the financing path later, but the initial choice helps Lodestar seed the right defaults."}
                </ContextBox>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--teal)",
                  margin: "0 0 6px 0",
                }}
              >
                Step 4 of 4
              </p>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "24px",
                  fontWeight: 400,
                  color: "var(--ink)",
                  margin: "0 0 10px 0",
                }}
              >
                Review and launch workspace
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                }}
              >
                Review the starting assumptions. Lodestar will create the workspace shell first, then seed Concept, Parties, Capital, Workplan, Evidence, and Execution around this baseline.
              </p>

              <div
                className="wizard-layout"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                  gap: "24px",
                }}
              >
                <div>
                  <div
                    style={{
                      backgroundColor: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "16px 18px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        margin: "0 0 8px 0",
                      }}
                    >
                      Workspace summary
                    </p>
                    <ReviewRow label="Deal name" value={state.name || "—"} />
                    <ReviewRow label="Country" value={state.countryCode ? countryLabel(state.countryCode) : null} />
                    <ReviewRow label="Sector" value={state.sector ? sectorLabel(state.sector) : null} />
                    <ReviewRow label="Concept" value={state.description || null} />
                    <ReviewRow label="Target outcome" value={state.targetOutcome || null} />
                    <ReviewRow label="Sponsor rationale" value={state.sponsorRationale || null} />
                    <ReviewRow label="Known unknowns" value={state.knownUnknowns || null} />
                    <ReviewRow label="Fatal flaws" value={state.fatalFlaws || null} />
                    <ReviewRow label="Next actions" value={state.nextActions || null} />
                    <ReviewRow label="Go / no-go" value={state.goNoGoRecommendation || null} />
                    <ReviewRow label="Capital path" value={DEAL_TYPES.find((option) => option.value === state.dealType)?.label ?? null} />
                    {state.capexMillions ? <ReviewRow label="CAPEX" value={`$${parseFloat(state.capexMillions).toLocaleString()}M`} /> : null}
                    {state.stage ? <ReviewRow label="Current maturity" value={stageLabel(state.stage)} /> : null}
                    {state.targetCloseDate ? (
                      <ReviewRow label="Target close" value={new Date(state.targetCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
                    ) : null}
                    {isExim && state.programPath ? (
                      <ReviewRow
                        label="Program path"
                        value={PROGRAM_PATH_OPTIONS.find((option) => option.value === state.programPath)?.label ?? state.programPath}
                      />
                    ) : null}
                    {isExim && state.eximCoverType ? <ReviewRow label="EXIM cover" value={coverLabel(state.eximCoverType)} /> : null}
                    {isExim && state.envCategory ? <ReviewRow label="Env. category" value={envLabel(state.envCategory)} /> : null}
                    {isExim && state.targetLoiDate ? (
                      <ReviewRow label="Target LOI" value={new Date(state.targetLoiDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
                    ) : null}
                  </div>

                  {eligibilityResult?.advisories.length ? (
                    <div
                      style={{
                        backgroundColor: "var(--gold-soft)",
                        border: "1px solid var(--gold)",
                        borderRadius: "6px",
                        padding: "14px 16px",
                        marginTop: "14px",
                      }}
                    >
                      <p className="eyebrow" style={{ marginBottom: "8px" }}>EXIM advisories</p>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {eligibilityResult.advisories.map((note) => (
                          <p
                            key={note}
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "13px",
                              color: "var(--ink-mid)",
                              lineHeight: 1.55,
                              margin: 0,
                            }}
                          >
                            {note}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <ContextBox label="Workspace launch">
                  Lodestar will launch the deal with the six-workspace shell already in place. The capital path you selected will shape the defaults, while the concept statement will anchor Beacon and the initial workplan.
                </ContextBox>
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-mid)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "10px 20px",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              ← Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "#ffffff",
                  backgroundColor: "var(--teal)",
                  border: "none",
                  borderRadius: "3px",
                  padding: "10px 24px",
                  cursor: "pointer",
                }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "#ffffff",
                  backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                  border: "none",
                  borderRadius: "3px",
                  padding: "10px 24px",
                  cursor: isPending ? "not-allowed" : "pointer",
                  transition: "background-color 0.15s",
                }}
              >
                {isPending ? "Creating workspace…" : "Launch Workspace →"}
              </button>
            )}
          </div>

          {submitError ? (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--accent)",
                margin: "10px 0 0",
                textAlign: "right",
              }}
            >
              {submitError}
            </p>
          ) : null}
        </div>

        <style>{`
          @media (max-width: 639px) {
            .wizard-layout,
            [style*="minmax(0, 2fr) minmax(0, 1fr)"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </>
  );
}
