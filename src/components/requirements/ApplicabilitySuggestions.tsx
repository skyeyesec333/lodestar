"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateRequirementResponsibilityAction } from "@/actions/requirements";
import type { ApplicabilitySuggestion } from "@/lib/ai/applicability";

type Props = {
  projectSlug: string;
  projectId: string;
};

type SuggestionState = {
  suggestion: ApplicabilitySuggestion;
  dismissed: boolean;
  applied: boolean;
  applying: boolean;
};

function confidenceVariant(
  confidence: ApplicabilitySuggestion["confidence"]
): "default" | "secondary" | "outline" {
  if (confidence === "high") return "default";
  if (confidence === "medium") return "secondary";
  return "outline";
}

function confidenceLabel(confidence: ApplicabilitySuggestion["confidence"]): string {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Medium confidence";
  return "Low confidence";
}

export function ApplicabilitySuggestions({ projectSlug, projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<SuggestionState[] | null>(null);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectSlug}/suggest-applicability`, {
        method: "POST",
      });
      if (res.status === 429) {
        setError("Rate limit reached. Please wait a minute before trying again.");
        return;
      }
      if (!res.ok) {
        setError("Failed to fetch suggestions. Please try again.");
        return;
      }
      const data: ApplicabilitySuggestion[] = await res.json() as ApplicabilitySuggestion[];
      setStates(
        data.map((suggestion) => ({
          suggestion,
          dismissed: false,
          applied: false,
          applying: false,
        }))
      );
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function applySuggestion(index: number) {
    if (!states) return;
    const item = states[index];
    if (!item || item.applied || item.applying) return;

    setStates((prev) =>
      prev
        ? prev.map((s, i) => (i === index ? { ...s, applying: true } : s))
        : prev
    );

    const result = await updateRequirementResponsibilityAction({
      projectId,
      requirementId: item.suggestion.requirementId,
      slug: projectSlug,
      isApplicable: false,
      applicabilityReason: item.suggestion.reasoning,
    });

    setStates((prev) =>
      prev
        ? prev.map((s, i) =>
            i === index
              ? { ...s, applying: false, applied: result.ok }
              : s
          )
        : prev
    );
  }

  function dismiss(index: number) {
    setStates((prev) =>
      prev
        ? prev.map((s, i) => (i === index ? { ...s, dismissed: true } : s))
        : prev
    );
  }

  const visibleStates = states?.filter((s) => !s.dismissed) ?? [];

  return (
    <div className="space-y-3">
      {states === null && (
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSuggestions}
          disabled={loading}
        >
          {loading ? "Analyzing…" : "AI Suggestions"}
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {states !== null && visibleStates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No inapplicability suggestions — all requirements appear relevant to this project.
        </p>
      )}

      {visibleStates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            AI Applicability Suggestions
          </p>
          {states?.map((item, index) => {
            if (item.dismissed) return null;
            return (
              <div
                key={item.suggestion.requirementId}
                className="flex flex-col gap-1.5 rounded-md border px-3 py-2 text-sm bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-medium truncate">
                      {item.suggestion.requirementLabel}
                    </span>
                    <Badge variant={confidenceVariant(item.suggestion.confidence)}>
                      {confidenceLabel(item.suggestion.confidence)}
                    </Badge>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      Suggested: not applicable
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(index)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Dismiss suggestion"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {item.suggestion.reasoning}
                </p>
                <div className="flex gap-2 pt-0.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => applySuggestion(index)}
                    disabled={item.applying || item.applied}
                  >
                    {item.applied
                      ? "Applied"
                      : item.applying
                      ? "Applying…"
                      : "Apply suggestion"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismiss(index)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
