"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/actions/projects";

// ── Constants ──────────────────────────────────────────────────────────────────

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

// Collected for UX but not submitted (not in createProjectSchema).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type EnvCategoryValue = (typeof ENV_CATEGORY_OPTIONS)[number]["value"];

// Stage options — for UX display only; createProject does not accept stage.
const STAGE_OPTIONS = [
  { value: "concept", label: "Concept" },
  { value: "pre_loi", label: "Pre-Feasibility" },
  { value: "loi_submitted", label: "Feasibility" },
  { value: "loi_approved", label: "Development" },
  { value: "pre_commitment", label: "Construction" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// ── Wizard state ───────────────────────────────────────────────────────────────

interface WizardState {
  // Step 1
  name: string;
  countryCode: string;
  sector: SectorValue | "";
  // Step 2
  capexMillions: string;
  eximCoverType: CoverValue | "";
  envCategory: EnvCategoryValue | "";
  // Step 3
  targetLoiDate: string;
  targetCloseDate: string;
  stage: StageValue | "";
  // Step 4
  description: string;
}

const initialState: WizardState = {
  name: "",
  countryCode: "",
  sector: "",
  capexMillions: "",
  eximCoverType: "",
  envCategory: "",
  targetLoiDate: "",
  targetCloseDate: "",
  stage: "",
  description: "",
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  dealType?: string;
  initialSector?: string;
  onComplete: (projectSlug: string) => void;
  onBack: () => void;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

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
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b6b64' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
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
  textTransform: "uppercase" as const,
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

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function StepIndicator({ current }: { current: number }) {
  const steps = ["Identity", "Financing", "Timeline", "Review"];
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
          backgroundColor: isCompleted
            ? "var(--teal)"
            : isCurrent
            ? "transparent"
            : "transparent",
          border: isCompleted
            ? "2px solid var(--teal)"
            : isCurrent
            ? "2px solid var(--teal)"
            : "2px solid var(--border)",
          color: isCompleted
            ? "#ffffff"
            : isCurrent
            ? "var(--teal)"
            : "var(--ink-muted)",
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

// ── Review card ────────────────────────────────────────────────────────────────

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

// ── Controlled field helpers ───────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

export function OnboardingWizard({ dealType, initialSector, onComplete, onBack }: OnboardingWizardProps) {
  const isExim = !dealType || dealType === "exim_project_finance";

  const resolvedInitialSector: SectorValue | "" =
    initialSector && SECTOR_OPTIONS.some((o) => o.value === initialSector)
      ? (initialSector as SectorValue)
      : "";

  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    ...initialState,
    sector: resolvedInitialSector,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof WizardState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function getFocusStyle(name: string): React.CSSProperties {
    return focusedField === name ? inputFocusStyle : {};
  }

  // ── Per-step validation ──────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const newErrors: Partial<Record<keyof WizardState, string>> = {};
    if (!state.name.trim()) newErrors.name = "Deal name is required.";
    else if (state.name.trim().length < 2) newErrors.name = "Name must be at least 2 characters.";
    if (!state.countryCode) newErrors.countryCode = "Country is required.";
    if (!state.sector) newErrors.sector = "Sector is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Steps 2 and 3 are optional — no required fields
  function validateStep2(): boolean {
    return true;
  }
  function validateStep3(): boolean {
    return true;
  }

  function handleNext() {
    const valid =
      step === 1 ? validateStep1() :
      step === 2 ? validateStep2() :
      step === 3 ? validateStep3() :
      true;
    if (valid) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step === 1) {
      onBack();
    } else {
      setStep((s) => s - 1);
    }
  }

  // ── Submission ───────────────────────────────────────────────────────────────

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
        dealType: (dealType ?? "exim_project_finance") as "exim_project_finance" | "commercial_finance" | "development_finance" | "private_equity" | "other",
        capexUsd: capexUsd && !isNaN(capexUsd) && capexUsd > 0 ? capexUsd : null,
        eximCoverType: (state.eximCoverType as CoverValue) || null,
        targetLoiDate: state.targetLoiDate ? new Date(state.targetLoiDate) : null,
        description: state.description.trim() || null,
      });

      if (!result.ok) {
        setSubmitError(result.error.message);
        return;
      }

      onComplete(result.value.slug);
    });
  }

  // ── Display helpers ──────────────────────────────────────────────────────────

  function sectorLabel(v: string) {
    return SECTOR_OPTIONS.find((o) => o.value === v)?.label ?? v;
  }
  function coverLabel(v: string) {
    return COVER_OPTIONS.find((o) => o.value === v)?.label ?? v;
  }
  function envLabel(v: string) {
    return ENV_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v;
  }
  function stageLabel(v: string) {
    return STAGE_OPTIONS.find((o) => o.value === v)?.label ?? v;
  }
  function countryLabel(code: string) {
    return COUNTRY_OPTIONS.find((c) => c.code === code)?.name ?? code;
  }

  // ── Layout helpers ───────────────────────────────────────────────────────────

  const twoColGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "0 auto",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Main card */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "32px",
        }}
      >
        {/* ── Step 1 — Project Identity ───────────────────────────────── */}
        {step === 1 && (
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
                margin: "0 0 24px 0",
              }}
            >
              Deal Identity
            </h2>

            {/* Responsive layout: fields + context */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                gap: "24px",
              }}
              className="wizard-layout"
            >
              {/* Fields */}
              <div>
                <Field id="name" label="Deal Name" required error={errors.name}>
                  <input
                    id="name"
                    value={state.name}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={120}
                    placeholder="e.g. Meridian Power Project"
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
                      onChange={(e) => set("countryCode", e.target.value)}
                      style={{ ...selectStyle, ...getFocusStyle("countryCode") }}
                      onFocus={() => setFocusedField("countryCode")}
                      onBlur={() => setFocusedField(null)}
                    >
                      <option value="" disabled>Select country</option>
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="sector" label="Sector" required error={errors.sector}>
                    <select
                      id="sector"
                      value={state.sector}
                      onChange={(e) => set("sector", e.target.value as SectorValue)}
                      style={{ ...selectStyle, ...getFocusStyle("sector") }}
                      onFocus={() => setFocusedField("sector")}
                      onBlur={() => setFocusedField(null)}
                    >
                      <option value="" disabled>Select sector</option>
                      {SECTOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <ContextBox label={isExim ? "EXIM Context" : "Context"}>
                {isExim
                  ? "EXIM finances infrastructure deals in eligible countries. The sector determines which requirements apply — power deals need a PPA, mining deals need an offtake agreement."
                  : "The deal name, country, and sector help Lodestar organize your workplan and surface the right counterparties and documents for your financing type."}
              </ContextBox>
            </div>
          </div>
        )}

        {/* ── Step 2 — Financing Scope ────────────────────────────────── */}
        {step === 2 && (
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
                margin: "0 0 24px 0",
              }}
            >
              Financing Scope
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                gap: "24px",
              }}
            >
              <div>
                <Field id="capexMillions" label="CAPEX ($M)" error={errors.capexMillions}>
                  <input
                    id="capexMillions"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="e.g. 250"
                    value={state.capexMillions}
                    onChange={(e) => set("capexMillions", e.target.value)}
                    style={{ ...inputStyle, ...getFocusStyle("capexMillions") }}
                    onFocus={() => setFocusedField("capexMillions")}
                    onBlur={() => setFocusedField(null)}
                  />
                </Field>

                {isExim && (
                  <>
                    <Field id="eximCoverType" label="EXIM Cover Type">
                      <select
                        id="eximCoverType"
                        value={state.eximCoverType}
                        onChange={(e) => set("eximCoverType", e.target.value as CoverValue)}
                        style={{ ...selectStyle, ...getFocusStyle("eximCoverType") }}
                        onFocus={() => setFocusedField("eximCoverType")}
                        onBlur={() => setFocusedField(null)}
                      >
                        <option value="">Not yet determined</option>
                        {COVER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field id="envCategory" label="Environmental Category">
                      <select
                        id="envCategory"
                        value={state.envCategory}
                        onChange={(e) => set("envCategory", e.target.value as EnvCategoryValue)}
                        style={{ ...selectStyle, ...getFocusStyle("envCategory") }}
                        onFocus={() => setFocusedField("envCategory")}
                        onBlur={() => setFocusedField(null)}
                      >
                        <option value="">Not yet determined</option>
                        {ENV_CATEGORY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
              </div>

              <ContextBox label={isExim ? "EXIM Context" : "Context"}>
                {isExim
                  ? "EXIM typically covers 85% of US export content. Comprehensive cover includes commercial risk; political-only is available for stronger off-takers. Environmental category determines your ESIA scope and EXIM\u2019s disclosure timeline."
                  : "CAPEX sets the deal size, which Lodestar uses to contextualize your data room and funder workspace. You can update this at any time from deal settings."}
              </ContextBox>
            </div>
          </div>
        )}

        {/* ── Step 3 — Timeline ───────────────────────────────────────── */}
        {step === 3 && (
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
                margin: "0 0 24px 0",
              }}
            >
              Timeline
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                gap: "24px",
              }}
            >
              <div>
                <div style={twoColGrid}>
                  {isExim && (
                    <Field id="targetLoiDate" label="Target LOI Date">
                      <input
                        id="targetLoiDate"
                        type="date"
                        value={state.targetLoiDate}
                        onChange={(e) => set("targetLoiDate", e.target.value)}
                        style={{ ...inputStyle, ...getFocusStyle("targetLoiDate") }}
                        onFocus={() => setFocusedField("targetLoiDate")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>
                  )}

                  <Field id="targetCloseDate" label="Target Financial Close">
                    <input
                      id="targetCloseDate"
                      type="date"
                      value={state.targetCloseDate}
                      onChange={(e) => set("targetCloseDate", e.target.value)}
                      style={{ ...inputStyle, ...getFocusStyle("targetCloseDate") }}
                      onFocus={() => setFocusedField("targetCloseDate")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </Field>
                </div>

                <Field id="stage" label="Current Deal Phase">
                  <select
                    id="stage"
                    value={state.stage}
                    onChange={(e) => set("stage", e.target.value as StageValue)}
                    style={{ ...selectStyle, ...getFocusStyle("stage") }}
                    onFocus={() => setFocusedField("stage")}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="">Not yet determined</option>
                    {STAGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <ContextBox label={isExim ? "EXIM Context" : "Context"}>
                {isExim
                  ? "The LOI (Letter of Interest) is EXIM\u2019s first formal milestone. Most sponsors target LOI 12\u201318 months before financial close. Setting a target date activates the countdown timer and urgency alerts."
                  : "Setting a target financial close date activates the deal countdown and helps Lodestar surface timing pressure across your workplan."}
              </ContextBox>
            </div>
          </div>
        )}

        {/* ── Step 4 — Description & Review ──────────────────────────── */}
        {step === 4 && (
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
                margin: "0 0 24px 0",
              }}
            >
              Description &amp; Review
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                gap: "24px",
              }}
            >
              <div>
                <Field id="description" label="Deal Description">
                  <textarea
                    id="description"
                    rows={4}
                    maxLength={500}
                    placeholder="Describe the technology type, capacity, and key counterparties…"
                    value={state.description}
                    onChange={(e) => set("description", e.target.value)}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: "100px",
                      ...getFocusStyle("description"),
                    }}
                    onFocus={() => setFocusedField("description")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      color: "var(--ink-muted)",
                      textAlign: "right",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {state.description.length} / 500
                  </p>
                </Field>

                {/* Review summary */}
                <div
                  style={{
                    backgroundColor: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "16px 18px",
                    marginTop: "4px",
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
                    Summary
                  </p>
                  <ReviewRow label="Deal Name" value={state.name || "—"} />
                  <ReviewRow label="Country" value={state.countryCode ? countryLabel(state.countryCode) : null} />
                  <ReviewRow label="Sector" value={state.sector ? sectorLabel(state.sector) : null} />
                  {state.capexMillions && (
                    <ReviewRow label="CAPEX" value={`$${parseFloat(state.capexMillions).toLocaleString()}M`} />
                  )}
                  {isExim && state.eximCoverType && (
                    <ReviewRow label="Cover Type" value={coverLabel(state.eximCoverType)} />
                  )}
                  {isExim && state.envCategory && (
                    <ReviewRow label="Env. Category" value={envLabel(state.envCategory)} />
                  )}
                  {isExim && state.targetLoiDate && (
                    <ReviewRow label="Target LOI" value={new Date(state.targetLoiDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
                  )}
                  {state.targetCloseDate && (
                    <ReviewRow label="Financial Close" value={new Date(state.targetCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
                  )}
                  {state.stage && (
                    <ReviewRow label="Current Deal Phase" value={stageLabel(state.stage)} />
                  )}
                </div>
              </div>

              <ContextBox label={isExim ? "EXIM Context" : "Context"}>
                {isExim
                  ? "A clear deal description helps your EXIM officer understand the transaction at a glance. Include the technology type, capacity, and key counterparties."
                  : "A clear description helps your team and advisors understand the deal at a glance. Include the asset type, capacity, and key counterparties."}
              </ContextBox>
            </div>

          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────────── */}
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
              {isPending ? "Creating deal…" : "Structure This Deal →"}
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

      {/* Mobile styles — inject a small style tag for the responsive layout */}
      <style>{`
        @media (max-width: 639px) {
          .wizard-layout,
          [style*="minmax(0, 2fr) minmax(0, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
