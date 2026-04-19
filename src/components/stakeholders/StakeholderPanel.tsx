"use client";

import { useEffect, useState, useTransition } from "react";
import { addStakeholder, removeStakeholder, updateStakeholder, markStakeholderContacted } from "@/actions/stakeholders";
import type { StakeholderRow } from "@/lib/db/stakeholders";
import { StakeholderGraph } from "@/components/projects/StakeholderGraph";
import type { FunderRelationshipRow } from "@/lib/db/funders";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { DealPartyChecklist } from "@/components/stakeholders/DealPartyChecklist";
import type { DealPartyRow } from "@/lib/db/deal-parties";

const ROLE_OPTIONS = [
  { value: "epc_contact",        label: "EPC Contact" },
  { value: "offtaker_contact",   label: "Off-taker Contact" },
  { value: "legal_counsel",      label: "Legal Counsel" },
  { value: "exim_officer",       label: "EXIM Officer" },
  { value: "government_liaison", label: "Government Liaison" },
  { value: "financial_advisor",  label: "Financial Advisor" },
  { value: "community_rep",      label: "Community Rep" },
  { value: "sponsor_team",       label: "Sponsor Team" },
  { value: "other",              label: "Other" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  epc_contact:        "var(--teal)",
  offtaker_contact:   "var(--gold)",
  legal_counsel:      "var(--ink-mid)",
  exim_officer:       "var(--accent)",
  government_liaison: "var(--ink-mid)",
  financial_advisor:  "var(--gold)",
  community_rep:      "var(--ink-muted)",
  sponsor_team:       "var(--teal)",
  other:              "var(--ink-muted)",
};

const ROLE_BG: Record<string, string> = {
  epc_contact:        "var(--teal-soft)",
  offtaker_contact:   "var(--gold-soft)",
  legal_counsel:      "var(--bg)",
  exim_officer:       "var(--accent-soft)",
  government_liaison: "var(--bg)",
  financial_advisor:  "var(--gold-soft)",
  community_rep:      "var(--bg)",
  sponsor_team:       "var(--teal-soft)",
  other:              "var(--bg)",
};

const inputStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "7px 10px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500 as const,
  letterSpacing: "0.10em",
  textTransform: "uppercase" as const,
  color: "var(--ink-muted)",
  display: "block" as const,
  marginBottom: "5px",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "var(--ink-muted)",
  medium: "var(--gold)",
  high: "var(--accent)",
  critical: "var(--accent)",
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  in_person: "In Person",
  virtual: "Virtual",
  phone_call: "Phone Call",
  site_visit: "Site Visit",
};

function formatDate(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLastContact(stakeholder: StakeholderRow) {
  return stakeholder.lastContactAt ? new Date(stakeholder.lastContactAt) : null;
}

function getRecommendedFollowUpDate(stakeholder: StakeholderRow) {
  const dueDates = [...stakeholder.openActionItems, ...stakeholder.documentsOwed]
    .map((item) => (item.dueDate ? new Date(item.dueDate) : null))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  if (dueDates.length > 0) return dueDates[0];

  const lastContact = getLastContact(stakeholder);
  if (!lastContact || !stakeholder.needsFollowUp) return null;

  const next = new Date(lastContact);
  next.setDate(next.getDate() + 7);
  return next;
}

function getResponsiveness(stakeholder: StakeholderRow) {
  const overdue =
    stakeholder.openActionItems.some(
      (item) => item.dueDate && new Date(item.dueDate).getTime() < Date.now()
    ) ||
    stakeholder.documentsOwed.some(
      (item) => item.dueDate && new Date(item.dueDate).getTime() < Date.now()
    );
  const lastContact = getLastContact(stakeholder);

  if (overdue) return { label: "Blocked", color: "var(--accent)", background: "var(--accent-soft)" };
  if (lastContact && Date.now() - lastContact.getTime() <= 1000 * 60 * 60 * 24 * 10) {
    return { label: "Engaged", color: "var(--teal)", background: "var(--teal-soft)" };
  }
  if (stakeholder.needsFollowUp) {
    return { label: "Stale", color: "var(--gold)", background: "var(--gold-soft)" };
  }
  return { label: "Quiet", color: "var(--ink-muted)", background: "var(--bg)" };
}

function getLastTouchLabel(stakeholder: StakeholderRow) {
  const meeting = stakeholder.recentMeetings[0];
  if (!meeting) return "No meetings yet";
  const type = MEETING_TYPE_LABELS[meeting.meetingType] ?? meeting.meetingType;
  return `${type} · ${formatDate(meeting.meetingDate)}`;
}

function getContactBadge(stakeholder: StakeholderRow): {
  label: string;
  color: string;
  background: string;
} | null {
  if (!stakeholder.lastContactedAt) {
    return { label: "Follow up", color: "var(--gold)", background: "var(--gold-soft)" };
  }

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(stakeholder.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceContact > 14) {
    return { label: "Follow up", color: "var(--gold)", background: "var(--gold-soft)" };
  }

  return { label: "Recent", color: "var(--teal)", background: "var(--teal-soft)" };
}

function withDerivedFollowUp(stakeholder: StakeholderRow): StakeholderRow {
  const now = Date.now();
  const overdueRequestCount = stakeholder.documentsOwed.filter(
    (item) => item.dueDate && new Date(item.dueDate).getTime() < now
  ).length;
  const overdueActionCount = stakeholder.openActionItems.filter(
    (item) => item.dueDate && new Date(item.dueDate).getTime() < now
  ).length;
  const lastContact = getLastContact(stakeholder);
  const hasAgingContact =
    lastContact !== null && now - lastContact.getTime() > 1000 * 60 * 60 * 24 * 21;

  const followUpReason = overdueRequestCount > 0
    ? `${overdueRequestCount} overdue document request${overdueRequestCount === 1 ? "" : "s"}`
    : overdueActionCount > 0
    ? `${overdueActionCount} overdue item${overdueActionCount === 1 ? "" : "s"}`
    : stakeholder.documentsOwed.length > 0
    ? `${stakeholder.documentsOwed.length} open document request${stakeholder.documentsOwed.length === 1 ? "" : "s"}`
    : stakeholder.openActionItems.length > 0
    ? `${stakeholder.openActionItems.length} open action item${stakeholder.openActionItems.length === 1 ? "" : "s"}`
    : hasAgingContact
    ? "No recent contact in 21+ days"
    : null;

  return {
    ...stakeholder,
    documentsOwedCount: stakeholder.documentsOwed.length,
    needsFollowUp: followUpReason !== null,
    followUpReason,
  };
}

type Props = {
  projectId: string;
  slug: string;
  initialStakeholders: StakeholderRow[];
  initialDealParties?: DealPartyRow[];
  projectName: string;
  readinessBps: number | null;
  funderRelationships: FunderRelationshipRow[];
  requirements: ProjectRequirementRow[];
  graphLayout: Record<string, { x: number; y: number }> | null;
};

type StakeholderEditDraft = {
  name: string;
  email: string;
  phone: string;
  title: string;
  organizationName: string;
  roleDescription: string;
};

function buildEditDraft(stakeholder: StakeholderRow): StakeholderEditDraft {
  return {
    name: stakeholder.name,
    email: stakeholder.email ?? "",
    phone: stakeholder.phone ?? "",
    title: stakeholder.title ?? "",
    organizationName: stakeholder.organizationName ?? "",
    roleDescription: stakeholder.roleDescription ?? "",
  };
}

export function StakeholderPanel({
  projectId,
  slug,
  initialStakeholders,
  initialDealParties = [],
  projectName,
  readinessBps,
  funderRelationships,
  requirements,
  graphLayout,
}: Props) {
  const [stakeholders, setStakeholders] = useState(initialStakeholders);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [replacementRoleId, setReplacementRoleId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<StakeholderEditDraft | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "follow_up" | "primary">("all");
  const [view, setView] = useState<"list" | "graph">("list");

  const selectedStakeholder =
    stakeholders.find((stakeholder) => stakeholder.roleId === selectedRoleId) ?? null;
  const replacementOptions = selectedStakeholder
    ? stakeholders.filter(
        (stakeholder) =>
          stakeholder.roleId !== selectedStakeholder.roleId &&
          stakeholder.roleType === selectedStakeholder.roleType
      )
    : [];
  const selectedResponsiveness = selectedStakeholder ? getResponsiveness(selectedStakeholder) : null;
  const selectedRecommendedFollowUp = selectedStakeholder
    ? getRecommendedFollowUpDate(selectedStakeholder)
    : null;
  const filteredStakeholders = stakeholders.filter((stakeholder) => {
    const haystack = [
      stakeholder.name,
      stakeholder.email,
      stakeholder.phone,
      stakeholder.title,
      stakeholder.organizationName,
      stakeholder.roleDescription,
      stakeholder.followUpReason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      search.trim().length === 0 || haystack.includes(search.trim().toLowerCase());
    const matchesFilter =
      filterMode === "all"
        ? true
        : filterMode === "follow_up"
        ? stakeholder.needsFollowUp
        : stakeholder.isPrimary;

    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    if (!selectedStakeholder) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedRoleId(null);
        setConfirmingDelete(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedStakeholder]);

  useEffect(() => {
    setReplacementRoleId("");
    setConfirmingDelete(false);
    setIsEditing(false);
    setEditDraft(selectedStakeholder ? buildEditDraft(selectedStakeholder) : null);
  }, [selectedRoleId]);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await addStakeholder({
        projectId,
        slug,
        name: fd.get("name") as string,
        email: (fd.get("email") as string) || null,
        phone: (fd.get("phone") as string) || null,
        title: (fd.get("title") as string) || null,
        organizationName: (fd.get("organizationName") as string) || null,
        roleType: fd.get("roleType") as string,
        isPrimary: fd.get("isPrimary") === "on",
      });

      if (!result.ok) {
        setError(result.error.message);
      } else {
        form.reset();
        setShowForm(false);
        // Optimistic: re-fetch via revalidate will update on next navigation;
        // for immediate feedback add a placeholder row
        setStakeholders((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: fd.get("name") as string,
            email: (fd.get("email") as string) || null,
            phone: (fd.get("phone") as string) || null,
            title: (fd.get("title") as string) || null,
            organizationId: null,
            organizationName: (fd.get("organizationName") as string) || null,
            roleType: fd.get("roleType") as StakeholderRow["roleType"],
            roleId: "__pending__",
            roleDescription: null,
            isPrimary: fd.get("isPrimary") === "on",
            organizationWebsite: null,
            organizationCountryCode: null,
            recentMeetings: [],
            openActionItems: [],
            meetingCount: 0,
            openActionItemCount: 0,
            documentsOwed: [],
            documentsOwedCount: 0,
            lastContactAt: null,
            lastContactedAt: null,
            lastMeetingOutcome: null,
            needsFollowUp: false,
            followUpReason: null,
          },
        ]);
      }
    });
  }

  function handleRemove(roleId: string, name: string, replacementId?: string) {
    setRemovingId(roleId);
    startTransition(async () => {
      const replacement =
        replacementId
          ? stakeholders.find((stakeholder) => stakeholder.roleId === replacementId) ?? null
          : null;
      const result = await removeStakeholder({
        projectId,
        slug,
        roleId,
        stakeholderName: name,
        replacementRoleId: replacementId || null,
        replacementStakeholderName: replacement?.name ?? null,
      });
      if (!result.ok) {
        setError(result.error.message);
      } else {
        setStakeholders((prev) =>
          prev
            .filter((stakeholder) => stakeholder.roleId !== roleId)
            .map((stakeholder) =>
              replacement && stakeholder.roleId === replacement.roleId
                ? { ...stakeholder, isPrimary: true }
                : selectedStakeholder &&
                    selectedStakeholder.isPrimary &&
                    stakeholder.roleType === selectedStakeholder.roleType
                  ? { ...stakeholder, isPrimary: false }
                  : stakeholder
            )
        );
        setSelectedRoleId(null);
        setConfirmingDelete(false);
        setReplacementRoleId("");
      }
      setRemovingId(null);
    });
  }

  function handleSaveEdit() {
    if (!selectedStakeholder || !editDraft) return;
    setError(null);

    startTransition(async () => {
      const result = await updateStakeholder({
        projectId,
        slug,
        roleId: selectedStakeholder.roleId,
        name: editDraft.name,
        email: editDraft.email || null,
        phone: editDraft.phone || null,
        title: editDraft.title || null,
        organizationName: editDraft.organizationName || null,
        roleDescription: editDraft.roleDescription || null,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setStakeholders((prev) =>
        prev.map((stakeholder) =>
          stakeholder.roleId === selectedStakeholder.roleId
            ? {
                ...stakeholder,
                name: editDraft.name,
                email: editDraft.email || null,
                phone: editDraft.phone || null,
                title: editDraft.title || null,
                organizationName: editDraft.organizationName || null,
                organizationWebsite:
                  editDraft.organizationName !== stakeholder.organizationName
                    ? null
                    : stakeholder.organizationWebsite,
                organizationCountryCode:
                  editDraft.organizationName !== stakeholder.organizationName
                    ? null
                    : stakeholder.organizationCountryCode,
                roleDescription: editDraft.roleDescription || null,
              }
            : stakeholder
        )
      );
      setIsEditing(false);
    });
  }

  const OVERDUE_DAYS = 14;
  const overdueStakeholders = stakeholders.filter((s) => {
    const ref = s.lastContactedAt ?? s.lastContactAt;
    if (!ref) return true;
    const daysSince = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= OVERDUE_DAYS;
  });

  return (
    <div style={{ marginBottom: "40px" }}>
      {/* Overdue Contacts */}
      {overdueStakeholders.length > 0 && (
        <div
          style={{
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "4px",
            padding: "16px 20px",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 12px",
            }}
          >
            Overdue Contacts — {overdueStakeholders.length} contact{overdueStakeholders.length === 1 ? "" : "s"} not reached in 14+ days
          </p>
          <div style={{ display: "grid", gap: "8px" }}>
            {overdueStakeholders.map((s) => {
              const ref = s.lastContactedAt ?? s.lastContactAt;
              const daysSince = ref
                ? Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const roleLabel = ROLE_OPTIONS.find((r) => r.value === s.roleType)?.label ?? s.roleType;
              return (
                <div
                  key={s.roleId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    padding: "10px 14px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <div>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--ink)",
                          display: "block",
                        }}
                      >
                        {s.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                        }}
                      >
                        {roleLabel}
                        {s.organizationName ? ` · ${s.organizationName}` : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        color: "var(--gold)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {daysSince !== null ? `${daysSince}d ago` : "Never contacted"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(async () => {
                          const result = await markStakeholderContacted({
                            projectId,
                            slug,
                            stakeholderId: s.id,
                            stakeholderName: s.name,
                          });
                          if (result.ok) {
                            setStakeholders((prev) =>
                              prev.map((sh) =>
                                sh.id === s.id ? { ...sh, lastContactedAt: new Date() } : sh
                              )
                            );
                          }
                        });
                      }}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        fontWeight: 500,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--teal)",
                        backgroundColor: "var(--teal-soft)",
                        border: "1px solid var(--teal)",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Mark Contacted
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deal Party Checklist */}
      <DealPartyChecklist
        projectId={projectId}
        slug={slug}
        initialDealParties={initialDealParties}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p className="eyebrow">Deal Parties</p>
        <button
          onClick={() => {
            if (view === "graph") {
              setView("list");
              setShowForm(true);
            } else {
              setShowForm((v) => !v);
            }
          }}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: showForm ? "var(--ink-muted)" : "var(--accent)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* View toggle: List / Graph */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
        {(["list", "graph"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: view === v ? "var(--teal)" : "var(--ink-muted)",
              backgroundColor: view === v ? "var(--teal-soft)" : "transparent",
              border: view === v ? "1px solid var(--teal)" : "1px solid var(--border)",
              borderRadius: "3px",
              padding: "5px 12px",
              cursor: "pointer",
            }}
          >
            {v === "list" ? "List" : "Graph"}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--accent)", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {view === "graph" && (
        <div>
          <StakeholderGraph
            projectId={projectId}
            projectSlug={slug}
            projectName={projectName}
            readinessBps={readinessBps}
            stakeholders={stakeholders}
            funderRelationships={funderRelationships}
            requirements={requirements}
            graphLayout={graphLayout}
          />
        </div>
      )}

      {view === "list" && (stakeholders.length > 0 || search.length > 0) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <div style={{ flex: "1 1 280px", minWidth: "240px" }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contact, org, notes, or follow-up"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {[
              { value: "all", label: "All" },
              { value: "follow_up", label: "Needs Follow-Up" },
              { value: "primary", label: "Primary" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilterMode(option.value as typeof filterMode)}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: filterMode === option.value ? "var(--accent)" : "var(--ink-muted)",
                  backgroundColor: filterMode === option.value ? "var(--accent-soft)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "999px",
                  padding: "7px 12px",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "20px 24px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input name="name" required placeholder="Jane Smith" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Role *</label>
              <select name="roleType" required style={inputStyle}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Organization</label>
              <input name="organizationName" placeholder="Acme EPC Ltd" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input name="title" placeholder="Project Director" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input name="email" type="email" placeholder="jane@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input name="phone" placeholder="+1 202 555 0100" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "8px" }}>
              <input name="isPrimary" type="checkbox" id="isPrimary" style={{ cursor: "pointer" }} />
              <label
                htmlFor="isPrimary"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", cursor: "pointer" }}
              >
                Primary contact for this role
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-inverse)",
                backgroundColor: "var(--accent)",
                border: "none",
                borderRadius: "3px",
                padding: "8px 18px",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Adding…" : "Add Deal Party"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "8px 18px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Stakeholder grid — list view only */}
      {view === "list" && stakeholders.length === 0 && !showForm ? (
        <div
          style={{
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "4px",
            padding: "20px 24px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 8px",
            }}
          >
            Getting Started
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "18px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 10px",
            }}
          >
            Name every transaction party before you proceed
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              margin: "0 0 10px",
              lineHeight: 1.6,
              maxWidth: "560px",
            }}
          >
            EXIM requires named contacts for every party in the transaction — the EPC contractor,
            off-taker, host government liaison, legal counsel, and your assigned EXIM officer.
            Adding deal parties here enables meeting attendance tracking, action item assignment,
            and document routing throughout due diligence.
          </p>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "var(--ink-mid)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Suggested roles: EPC Contact · Off-taker Contact · Government Liaison · Legal Counsel · EXIM Officer
          </p>
        </div>
      ) : filteredStakeholders.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "24px 20px",
            backgroundColor: "var(--bg-card)",
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-muted)",
              margin: 0,
            }}
          >
            No deal parties match the current search or filter.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
          {filteredStakeholders.map((s) => {
            const roleLabel = ROLE_OPTIONS.find((r) => r.value === s.roleType)?.label ?? s.roleType;
            const color = ROLE_COLORS[s.roleType] ?? "var(--ink-muted)";
            const bg = ROLE_BG[s.roleType] ?? "var(--bg)";
            const isRemoving = removingId === s.roleId;
            const responsiveness = getResponsiveness(s);
            const recommendedFollowUp = getRecommendedFollowUpDate(s);

            return (
              <div
                key={s.roleId}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setError(null);
                  setSelectedRoleId(s.roleId);
                  setConfirmingDelete(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setError(null);
                    setSelectedRoleId(s.roleId);
                    setConfirmingDelete(false);
                  }
                }}
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "16px 18px 18px",
                  opacity: isRemoving ? 0.4 : 1,
                  transition: "opacity 0.2s, border-color 0.15s, transform 0.15s",
                  position: "relative",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
                }}
              >
                {/* Role badge */}
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color,
                    backgroundColor: bg,
                    padding: "2px 7px",
                    borderRadius: "2px",
                    marginBottom: "10px",
                  }}
                >
                  {roleLabel}{s.isPrimary ? " · Primary" : ""}
                </span>

                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--ink)",
                      margin: 0,
                    }}
                  >
                    {s.name}
                  </p>
                  {(() => {
                    const badge = getContactBadge(s);
                    return badge ? (
                      <span
                        style={{
                          display: "inline-block",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "8px",
                          fontWeight: 500,
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: badge.color,
                          backgroundColor: badge.background,
                          padding: "2px 6px",
                          borderRadius: "2px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {badge.label}
                      </span>
                    ) : null;
                  })()}
                </div>

                {/* Contact */}
                <div style={{ display: "grid", gap: "8px", marginBottom: "10px" }}>
                  {(s.title || s.organizationName) && (
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        color: "var(--ink-mid)",
                        margin: 0,
                        lineHeight: 1.55,
                      }}
                    >
                      {[s.title, s.organizationName].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  {s.email && (
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--accent)",
                        lineHeight: 1.4,
                      }}
                    >
                      {s.email}
                    </span>
                  )}
                  {s.phone && (
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--ink)",
                        lineHeight: 1.4,
                      }}
                    >
                      {s.phone}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    padding: "10px 0 12px",
                    borderTop: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: responsiveness.color,
                        backgroundColor: responsiveness.background,
                        padding: "3px 7px",
                        borderRadius: "999px",
                      }}
                    >
                      {responsiveness.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: s.needsFollowUp ? "var(--accent)" : "var(--ink-muted)",
                      }}
                    >
                      {s.needsFollowUp ? "Follow-up due" : "No immediate chase"}
                    </span>
                  </div>

                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      margin: 0,
                    }}
                  >
                    Last touch: {getLastTouchLabel(s)}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      margin: 0,
                    }}
                  >
                    {recommendedFollowUp
                      ? `Recommended follow-up ${formatDate(recommendedFollowUp)}`
                      : "No follow-up date recommended"}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--border)",
                    marginBottom: "8px",
                  }}
                >
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                      }}
                    >
                    {s.documentsOwedCount > 0
                      ? `${s.documentsOwedCount} document${s.documentsOwedCount === 1 ? "" : "s"} owed`
                      : "Open card"}
                  </span>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      color: "var(--ink-muted)",
                    }}
                  >
                    →
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startTransition(async () => {
                      const result = await markStakeholderContacted({
                        projectId,
                        slug,
                        stakeholderId: s.id,
                        stakeholderName: s.name,
                      });
                      if (result.ok) {
                        setStakeholders((prev) =>
                          prev.map((sh) =>
                            sh.id === s.id ? { ...sh, lastContactedAt: new Date() } : sh
                          )
                        );
                      }
                    });
                  }}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--teal)",
                    backgroundColor: "var(--teal-soft)",
                    border: "1px solid var(--teal)",
                    borderRadius: "3px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Mark contacted
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedStakeholder && (
        <div
          onClick={() => {
            setError(null);
            setSelectedRoleId(null);
            setConfirmingDelete(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            backgroundColor: "rgba(0,0,0,0.34)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, calc(100vw - 32px))",
              maxHeight: "min(82vh, 860px)",
              overflowY: "auto",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "20px",
                padding: "26px 28px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      fontWeight: 500,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: ROLE_COLORS[selectedStakeholder.roleType] ?? "var(--ink-muted)",
                      backgroundColor: ROLE_BG[selectedStakeholder.roleType] ?? "var(--bg)",
                      padding: "3px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {(ROLE_OPTIONS.find((role) => role.value === selectedStakeholder.roleType)?.label ??
                      selectedStakeholder.roleType) +
                      (selectedStakeholder.isPrimary ? " · Primary" : "")}
                  </span>
                  {selectedStakeholder.needsFollowUp && (
                    <span
                      style={{
                        display: "inline-block",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        backgroundColor: "var(--accent-soft)",
                        padding: "3px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      Needs follow-up
                    </span>
                  )}
                </div>

                <h3
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: "34px",
                    lineHeight: 1.1,
                    color: "var(--ink)",
                    margin: "0 0 10px",
                  }}
                >
                  {selectedStakeholder.name}
                </h3>

                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "15px",
                    color: "var(--ink-mid)",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {[selectedStakeholder.title, selectedStakeholder.organizationName]
                    .filter(Boolean)
                    .join(" · ") || "No title or organization recorded yet."}
                </p>
                {selectedStakeholder.followUpReason && (
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      margin: "12px 0 0",
                    }}
                  >
                    {selectedStakeholder.followUpReason}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing && selectedStakeholder) {
                      setEditDraft(buildEditDraft(selectedStakeholder));
                    }
                    setIsEditing((value) => !value);
                  }}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: isEditing ? "var(--ink-muted)" : "var(--accent)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "999px",
                    padding: "9px 14px",
                    cursor: "pointer",
                  }}
                >
                  {isEditing ? "Cancel edit" : "Edit contact"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSelectedRoleId(null);
                    setConfirmingDelete(false);
                  }}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "999px",
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                    color: "var(--ink-muted)",
                    cursor: "pointer",
                    fontSize: "18px",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: "24px 28px 28px", display: "grid", gap: "24px" }}>
              {error && (
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--accent)",
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                }}
              >
                {[
                  {
                    label: "Role",
                    value:
                      ROLE_OPTIONS.find((role) => role.value === selectedStakeholder.roleType)?.label ??
                      selectedStakeholder.roleType,
                  },
                  {
                    label: "Meetings",
                    value:
                      selectedStakeholder.meetingCount > 0
                        ? `${selectedStakeholder.meetingCount} logged`
                        : "No meetings yet",
                  },
                  {
                    label: "Open Actions",
                    value:
                      selectedStakeholder.openActionItemCount > 0
                        ? `${selectedStakeholder.openActionItemCount} open`
                        : "No open items",
                  },
                  {
                    label: "Last Contact",
                    value: selectedStakeholder.lastContactAt
                      ? formatDate(selectedStakeholder.lastContactAt) ?? "No meetings yet"
                      : "No meetings yet",
                  },
                  {
                    label: "Responsiveness",
                    value: selectedResponsiveness?.label ?? "Quiet",
                  },
                  {
                    label: "Documents Owed",
                    value:
                      selectedStakeholder.documentsOwedCount > 0
                        ? `${selectedStakeholder.documentsOwedCount} tracked`
                        : "None tracked",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      backgroundColor: "color-mix(in srgb, var(--bg-card) 92%, var(--bg))",
                    }}
                  >
                    <p style={{ ...labelStyle, marginBottom: "8px" }}>{item.label}</p>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--ink-mid)",
                        margin: 0,
                        lineHeight: 1.45,
                      }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "14px",
                }}
              >
                {isEditing && editDraft
                  ? [
                      { label: "Name", value: editDraft.name, key: "name", type: "text" },
                      { label: "Email", value: editDraft.email, key: "email", type: "email" },
                      { label: "Phone", value: editDraft.phone, key: "phone", type: "text" },
                      { label: "Organization", value: editDraft.organizationName, key: "organizationName", type: "text" },
                      { label: "Title", value: editDraft.title, key: "title", type: "text" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          padding: "16px 18px",
                          backgroundColor: "color-mix(in srgb, var(--bg-card) 92%, var(--bg))",
                        }}
                      >
                        <label style={{ ...labelStyle, marginBottom: "8px" }}>{item.label}</label>
                        <input
                          type={item.type}
                          value={editDraft[item.key as keyof StakeholderEditDraft]}
                          onChange={(event) =>
                            setEditDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    [item.key]: event.target.value,
                                  }
                                : prev
                            )
                          }
                          style={inputStyle}
                        />
                      </div>
                    ))
                  : [
                      { label: "Email", value: selectedStakeholder.email, href: selectedStakeholder.email ? `mailto:${selectedStakeholder.email}` : null },
                      { label: "Phone", value: selectedStakeholder.phone, href: selectedStakeholder.phone ? `tel:${selectedStakeholder.phone}` : null },
                      { label: "Organization", value: selectedStakeholder.organizationName, href: null },
                      { label: "Title", value: selectedStakeholder.title, href: null },
                      { label: "Website", value: selectedStakeholder.organizationWebsite, href: selectedStakeholder.organizationWebsite ?? null },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          padding: "16px 18px",
                          backgroundColor: "color-mix(in srgb, var(--bg-card) 92%, var(--bg))",
                        }}
                      >
                        <p style={{ ...labelStyle, marginBottom: "8px" }}>{item.label}</p>
                        {item.value ? (
                          item.href ? (
                            <a
                              href={item.href}
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "15px",
                                fontWeight: 500,
                                color: item.label === "Email" ? "var(--accent)" : "var(--ink-mid)",
                                textDecoration: "none",
                                lineHeight: 1.5,
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "15px",
                                fontWeight: 500,
                                color: "var(--ink-mid)",
                                margin: 0,
                                lineHeight: 1.5,
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {item.value}
                            </p>
                          )
                        ) : (
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "14px",
                              color: "var(--ink-muted)",
                              margin: 0,
                            }}
                          >
                            Not captured yet
                          </p>
                        )}
                      </div>
                    ))}
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ ...labelStyle, marginBottom: 0 }}>Outreach Snapshot</p>
                  {selectedResponsiveness && (
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: selectedResponsiveness.color,
                        backgroundColor: selectedResponsiveness.background,
                        padding: "4px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      {selectedResponsiveness.label}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      backgroundColor: "color-mix(in srgb, var(--bg-card) 92%, var(--bg))",
                    }}
                  >
                    <p style={{ ...labelStyle, marginBottom: "8px" }}>Last Touch</p>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--ink)",
                        margin: "0 0 4px",
                      }}
                    >
                      {getLastTouchLabel(selectedStakeholder)}
                    </p>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        color: "var(--ink-muted)",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {selectedStakeholder.followUpReason ?? "No active follow-up pressure recorded."}
                    </p>
                  </div>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      backgroundColor: "color-mix(in srgb, var(--bg-card) 92%, var(--bg))",
                    }}
                  >
                    <p style={{ ...labelStyle, marginBottom: "8px" }}>Recommended Follow-Up</p>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--ink)",
                        margin: "0 0 4px",
                      }}
                    >
                      {selectedRecommendedFollowUp
                        ? formatDate(selectedRecommendedFollowUp)
                        : "No date recommended"}
                    </p>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        color: "var(--ink-muted)",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {selectedStakeholder.documentsOwedCount > 0
                        ? `${selectedStakeholder.documentsOwedCount} tracked deliverable${selectedStakeholder.documentsOwedCount === 1 ? "" : "s"} still open.`
                        : "No open deliverable asks tied to this contact."}
                    </p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ ...labelStyle, marginBottom: 0 }}>Relationship Notes</p>
                  {selectedStakeholder.roleDescription && !isEditing && (
                    <p
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        margin: 0,
                      }}
                    >
                      Project-specific
                    </p>
                  )}
                </div>

                {isEditing && editDraft ? (
                  <div style={{ display: "grid", gap: "12px" }}>
                    <textarea
                      value={editDraft.roleDescription}
                      onChange={(event) =>
                        setEditDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                roleDescription: event.target.value,
                              }
                            : prev
                        )
                      }
                      style={{
                        ...inputStyle,
                        minHeight: "104px",
                        resize: "vertical",
                      }}
                      placeholder="Relationship notes, counterpart sensitivities, or diligence context."
                    />
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isPending || !editDraft.name.trim()}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: "var(--text-inverse)",
                          backgroundColor: "var(--accent)",
                          border: "none",
                          borderRadius: "999px",
                          padding: "9px 14px",
                          cursor: isPending || !editDraft.name.trim() ? "not-allowed" : "pointer",
                          opacity: isPending || !editDraft.name.trim() ? 0.6 : 1,
                        }}
                      >
                        {isPending ? "Saving…" : "Save contact"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStakeholder) {
                            setEditDraft(buildEditDraft(selectedStakeholder));
                          }
                          setIsEditing(false);
                        }}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "999px",
                          padding: "9px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : selectedStakeholder.roleDescription ? (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      color: "var(--ink-mid)",
                      lineHeight: 1.8,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedStakeholder.roleDescription}
                  </p>
                ) : (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      color: "var(--ink-muted)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    No relationship notes recorded yet.
                  </p>
                )}
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ ...labelStyle, marginBottom: 0 }}>Last Contact</p>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      margin: 0,
                    }}
                  >
                    {selectedStakeholder.lastContactAt
                      ? formatDate(selectedStakeholder.lastContactAt)
                      : "No meetings yet"}
                  </p>
                </div>
                {selectedStakeholder.lastMeetingOutcome ? (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      color: "var(--ink-mid)",
                      lineHeight: 1.8,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedStakeholder.lastMeetingOutcome}
                  </p>
                ) : (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      color: "var(--ink-muted)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    No meeting outcome has been captured for this contact yet.
                  </p>
                )}
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ ...labelStyle, marginBottom: 0 }}>Documents Owed</p>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      margin: 0,
                    }}
                  >
                    {selectedStakeholder.documentsOwedCount} tracked
                  </p>
                </div>

                {selectedStakeholder.documentsOwed.length === 0 ? (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      color: "var(--ink-muted)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    No document or deliverable requests are assigned to this contact yet.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {selectedStakeholder.documentsOwed.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          borderTop: "1px solid var(--border)",
                          paddingTop: "10px",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--ink-mid)",
                            margin: "0 0 4px",
                            lineHeight: 1.55,
                          }}
                        >
                          {item.title}
                        </p>
                        {item.description && (
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "13px",
                              color: "var(--ink-muted)",
                              margin: "0 0 6px",
                              lineHeight: 1.65,
                            }}
                          >
                            {item.description}
                          </p>
                        )}
                        <p
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--ink-muted)",
                            margin: 0,
                          }}
                        >
                          {[ 
                            item.requirementName ? `Requirement: ${item.requirementName}` : null,
                            item.dueDate ? `Due ${formatDate(item.dueDate)}` : null,
                            `Requested ${formatDate(item.createdAt)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ ...labelStyle, marginBottom: 0 }}>Recent Meetings</p>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      margin: 0,
                    }}
                  >
                    {selectedStakeholder.meetingCount} total
                  </p>
                </div>

                {selectedStakeholder.recentMeetings.length === 0 ? (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      color: "var(--ink-muted)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    No meetings tied to this contact yet.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {selectedStakeholder.recentMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        style={{
                          borderTop: "1px solid var(--border)",
                          paddingTop: "10px",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "var(--ink)",
                            margin: "0 0 4px",
                          }}
                        >
                          {meeting.title}
                        </p>
                        <p
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--ink-muted)",
                            margin: 0,
                          }}
                        >
                          {[
                            formatDate(meeting.meetingDate),
                            MEETING_TYPE_LABELS[meeting.meetingType] ?? meeting.meetingType,
                            meeting.location,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ ...labelStyle, marginBottom: 0 }}>Open Action Items</p>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      margin: 0,
                    }}
                  >
                    {selectedStakeholder.openActionItemCount} open
                  </p>
                </div>

                {selectedStakeholder.openActionItems.length === 0 ? (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      color: "var(--ink-muted)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    No open action items assigned to this contact.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {selectedStakeholder.openActionItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          borderTop: "1px solid var(--border)",
                          paddingTop: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: "14px",
                            marginBottom: "6px",
                          }}
                        >
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "15px",
                              fontWeight: 600,
                              color: "var(--ink)",
                              margin: 0,
                              lineHeight: 1.45,
                            }}
                          >
                            {item.title}
                          </p>
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              fontWeight: 600,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: PRIORITY_COLORS[item.priority] ?? "var(--ink-muted)",
                              flexShrink: 0,
                            }}
                          >
                            {item.priority}
                          </span>
                        </div>
                        <p
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--ink-muted)",
                            margin: 0,
                          }}
                        >
                          {[
                            item.meetingTitle,
                            item.requirementName ? `Requirement: ${item.requirementName}` : null,
                            formatDate(item.dueDate) ? `Due ${formatDate(item.dueDate)}` : null,
                            item.status.replace(/_/g, " "),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <p style={{ ...labelStyle, marginBottom: "10px" }}>CRM Enrichment</p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    color: "var(--ink-mid)",
                  lineHeight: 1.75,
                  margin: "0 0 12px",
                }}
              >
                  This card is now carrying the project-side relationship context. The next layer can add
                  organization research, public profile lookup, prior interactions, and counterparty-specific
                  diligence notes without turning deletion into the primary interaction.
                </p>
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    margin: 0,
                  }}
                >
                  Online profile enrichment not wired yet
                </p>
              </div>

              <div
                style={{
                  border: "1px solid color-mix(in srgb, var(--accent) 24%, var(--border))",
                  backgroundColor: "color-mix(in srgb, var(--accent) 4%, var(--bg-card))",
                  borderRadius: "10px",
                  padding: "18px 20px",
                }}
              >
                <p style={{ ...labelStyle, color: "var(--accent)", marginBottom: "10px" }}>Danger Zone</p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    color: "var(--ink-mid)",
                    lineHeight: 1.7,
                    margin: "0 0 16px",
                  }}
                >
                  Removing a stakeholder role should be intentional. This action removes the project-role link,
                  and it should not be the easiest click on the card.
                </p>

                {selectedStakeholder.isPrimary && (
                  <div
                    style={{
                      border: "1px solid color-mix(in srgb, var(--accent) 20%, var(--border))",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      marginBottom: "16px",
                      backgroundColor: "color-mix(in srgb, var(--accent) 3%, var(--bg-card))",
                    }}
                  >
                    <p style={{ ...labelStyle, color: "var(--accent)", marginBottom: "8px" }}>
                      Reassign Primary First
                    </p>
                    {replacementOptions.length > 0 ? (
                      <>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            color: "var(--ink-mid)",
                            lineHeight: 1.7,
                            margin: "0 0 12px",
                          }}
                        >
                          This is the primary contact for this role. Pick the next primary before removal.
                        </p>
                        <select
                          value={replacementRoleId}
                          onChange={(event) => setReplacementRoleId(event.target.value)}
                          style={inputStyle}
                        >
                          <option value="">Select replacement contact</option>
                          {replacementOptions.map((stakeholder) => (
                            <option key={stakeholder.roleId} value={stakeholder.roleId}>
                              {stakeholder.name}
                              {stakeholder.title ? ` · ${stakeholder.title}` : ""}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "14px",
                          color: "var(--ink-mid)",
                          lineHeight: 1.7,
                          margin: 0,
                        }}
                      >
                        Add another contact in this role before removing the current primary.
                      </p>
                    )}
                  </div>
                )}

                {!confirmingDelete ? (
                  <button
                    type="button"
                    disabled={
                      selectedStakeholder.roleId === "__pending__" ||
                      removingId === selectedStakeholder.roleId ||
                      (selectedStakeholder.isPrimary &&
                        (replacementOptions.length === 0 || replacementRoleId.length === 0))
                    }
                    onClick={() => setConfirmingDelete(true)}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      fontWeight: 500,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      backgroundColor: "transparent",
                      border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
                      borderRadius: "999px",
                      padding: "9px 14px",
                      cursor:
                        selectedStakeholder.roleId === "__pending__" ||
                        removingId === selectedStakeholder.roleId ||
                        (selectedStakeholder.isPrimary &&
                          (replacementOptions.length === 0 || replacementRoleId.length === 0))
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        selectedStakeholder.roleId === "__pending__" ||
                        removingId === selectedStakeholder.roleId ||
                        (selectedStakeholder.isPrimary &&
                          (replacementOptions.length === 0 || replacementRoleId.length === 0))
                          ? 0.5
                          : 1,
                    }}
                  >
                    Remove stakeholder role
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() =>
                        handleRemove(
                          selectedStakeholder.roleId,
                          selectedStakeholder.name,
                          selectedStakeholder.isPrimary ? replacementRoleId : undefined
                        )
                      }
                      disabled={removingId === selectedStakeholder.roleId}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--text-inverse)",
                        backgroundColor: "var(--accent)",
                        border: "none",
                        borderRadius: "999px",
                        padding: "9px 14px",
                        cursor: removingId === selectedStakeholder.roleId ? "not-allowed" : "pointer",
                        opacity: removingId === selectedStakeholder.roleId ? 0.6 : 1,
                      }}
                    >
                      {removingId === selectedStakeholder.roleId ? "Removing…" : "Confirm remove"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "999px",
                        padding: "9px 14px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
