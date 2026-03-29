"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/actions/projects";

const SECTOR_OPTIONS = [
  { value: "power", label: "Power" },
  { value: "transport", label: "Transport" },
  { value: "water", label: "Water" },
  { value: "telecom", label: "Telecom" },
  { value: "mining", label: "Mining" },
  { value: "other", label: "Other" },
] as const;

const COVER_TYPE_OPTIONS = [
  { value: "comprehensive", label: "Comprehensive" },
  { value: "political_only", label: "Political Only" },
] as const;

type SectorValue = (typeof SECTOR_OPTIONS)[number]["value"];
type CoverTypeValue = (typeof COVER_TYPE_OPTIONS)[number]["value"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "'Inter', sans-serif",
  fontSize: "15px",
  color: "#0d0d0b",
  backgroundColor: "#ffffff",
  border: "1px solid #d9d4c8",
  borderRadius: "4px",
  padding: "10px 14px",
  outline: "none",
  lineHeight: 1.5,
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
  color: "#6b6b64",
  display: "block",
  marginBottom: "6px",
};

const fieldStyle: React.CSSProperties = {
  marginBottom: "24px",
};

interface ProjectFormProps {
  initialSector?: SectorValue;
}

export function ProjectForm({ initialSector }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sector, setSector] = useState<SectorValue | "">(initialSector ?? "");
  const [coverType, setCoverType] = useState<CoverTypeValue | "">("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getFocusStyle = (name: string): React.CSSProperties =>
    focusedField === name
      ? { borderColor: "#c24a1e", boxShadow: "0 0 0 2px #f5e8e2" }
      : {};

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!sector) {
      setErrorMessage("Please select a sector.");
      return;
    }

    setIsSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const capexRaw = data.get("capexUsd") as string;
    const targetLoiRaw = data.get("targetLoiDate") as string;

    const result = await createProject({
      name: data.get("name") as string,
      countryCode: data.get("countryCode") as string,
      sector,
      capexUsd: capexRaw ? Number(capexRaw) : null,
      eximCoverType: coverType || null,
      targetLoiDate: targetLoiRaw ? new Date(targetLoiRaw) : null,
      description: (data.get("description") as string) || null,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={fieldStyle}>
        <label htmlFor="name" style={labelStyle}>Project name *</label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          placeholder="e.g. Meridian Power Project"
          style={{ ...inputStyle, ...getFocusStyle("name") }}
          onFocus={() => setFocusedField("name")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={fieldStyle}>
          <label htmlFor="countryCode" style={labelStyle}>Country code *</label>
          <input
            id="countryCode"
            name="countryCode"
            required
            minLength={2}
            maxLength={2}
            placeholder="e.g. KE"
            style={{
              ...inputStyle,
              textTransform: "uppercase",
              width: "100%",
              ...getFocusStyle("countryCode"),
            }}
            onFocus={() => setFocusedField("countryCode")}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="sector" style={labelStyle}>Sector *</label>
          <select
            id="sector"
            name="sector"
            required
            value={sector}
            onChange={(e) => setSector(e.target.value as SectorValue)}
            style={{ ...selectStyle, ...getFocusStyle("sector") }}
            onFocus={() => setFocusedField("sector")}
            onBlur={() => setFocusedField(null)}
          >
            <option value="" disabled>Select sector</option>
            {SECTOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={fieldStyle}>
          <label htmlFor="capexUsd" style={labelStyle}>CAPEX (USD)</label>
          <input
            id="capexUsd"
            name="capexUsd"
            type="number"
            min={0}
            step={1000000}
            placeholder="e.g. 250000000"
            style={{ ...inputStyle, ...getFocusStyle("capexUsd") }}
            onFocus={() => setFocusedField("capexUsd")}
            onBlur={() => setFocusedField(null)}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="eximCoverType" style={labelStyle}>EXIM cover type</label>
          <select
            id="eximCoverType"
            name="eximCoverType"
            value={coverType}
            onChange={(e) => setCoverType(e.target.value as CoverTypeValue)}
            style={{ ...selectStyle, ...getFocusStyle("eximCoverType") }}
            onFocus={() => setFocusedField("eximCoverType")}
            onBlur={() => setFocusedField(null)}
          >
            <option value="">Not yet determined</option>
            {COVER_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="targetLoiDate" style={labelStyle}>Target LOI date</label>
        <input
          id="targetLoiDate"
          name="targetLoiDate"
          type="date"
          style={{ ...inputStyle, ...getFocusStyle("targetLoiDate") }}
          onFocus={() => setFocusedField("targetLoiDate")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="description" style={labelStyle}>Description</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          placeholder="Brief description of the project..."
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: "100px",
            ...getFocusStyle("description"),
          }}
          onFocus={() => setFocusedField("description")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      {errorMessage && (
        <div
          style={{
            backgroundColor: "#f5e8e2",
            border: "1px solid #c24a1e",
            borderRadius: "4px",
            padding: "12px 16px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "#c24a1e",
              margin: 0,
            }}
          >
            {errorMessage}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "#ffffff",
          backgroundColor: isSubmitting ? "#d9d4c8" : "#c24a1e",
          border: "none",
          borderRadius: "3px",
          padding: "14px 24px",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          transition: "background-color 0.15s",
        }}
      >
        {isSubmitting ? "Creating…" : "Create Project"}
      </button>
    </form>
  );
}
