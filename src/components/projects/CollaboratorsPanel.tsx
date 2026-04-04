"use client";

import { useState, useTransition } from "react";
import { inviteMemberByEmail, changeMemberRole, removeMember } from "@/actions/members";
import type { ProjectMemberRow } from "@/lib/db/members";

const inputStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "7px 10px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: "5px",
};

function RoleBadge({ role }: { role: string }) {
  const isEditor = role === "editor";
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: isEditor ? "var(--teal)" : "var(--ink-muted)",
        backgroundColor: isEditor ? "var(--teal-soft)" : "var(--bg)",
        border: `1px solid ${isEditor ? "var(--teal)" : "var(--border)"}`,
        borderRadius: "3px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {isEditor ? "Editor" : "Viewer"}
    </span>
  );
}

function OwnerBadge() {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: "var(--gold)",
        backgroundColor: "var(--gold-soft)",
        border: "1px solid var(--gold)",
        borderRadius: "3px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      Owner
    </span>
  );
}

export function CollaboratorsPanel({
  projectId,
  slug,
  ownerClerkId,
  currentUserId,
  initialMembers,
  resolvedNames = {},
}: {
  projectId: string;
  slug: string;
  ownerClerkId: string;
  currentUserId: string;
  initialMembers: ProjectMemberRow[];
  resolvedNames?: Record<string, string>;
}) {
  const [members, setMembers] = useState<ProjectMemberRow[]>(initialMembers);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOwner = currentUserId === ownerClerkId;
  const invitedCount = members.length;
  const totalAccessCount = invitedCount + 1;

  function handleInvite() {
    setInviteError(null);
    setInviteSuccess(false);
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setInviteError("Please enter an email address.");
      return;
    }

    startTransition(async () => {
      const result = await inviteMemberByEmail({
        projectId,
        slug,
        email: trimmed,
        role: inviteRole,
      });

      if (!result.ok) {
        setInviteError(result.error.message);
        return;
      }

      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    });
  }

  function handleChangeRole(member: ProjectMemberRow) {
    const newRole = member.role === "editor" ? "viewer" : "editor";
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
    );

    startTransition(async () => {
      const result = await changeMemberRole({
        memberId: member.id,
        slug,
        role: newRole,
      });

      if (!result.ok) {
        // Revert on failure
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, role: member.role } : m))
        );
      }
    });
  }

  function handleRemove(member: ProjectMemberRow) {
    if (
      !confirm(
        `Remove ${resolvedNames[member.clerkUserId] ?? `User •••${member.clerkUserId.slice(-4)}`} from this deal? They will lose access immediately.`
      )
    )
      return;

    // Optimistic remove
    setMembers((prev) => prev.filter((m) => m.id !== member.id));

    startTransition(async () => {
      const result = await removeMember({ memberId: member.id, slug });
      if (!result.ok) {
        // Revert on failure
        setMembers((prev) => [...prev, member]);
      }
    });
  }

  const hasCollaborators = members.length > 0;

  return (
    <section
      id="section-collaborators"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "28px 32px",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "grid", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Collaborators
            </p>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "3px 8px",
              }}
            >
              {totalAccessCount} total
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--ink-muted)",
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            {invitedCount > 0
              ? `1 owner and ${invitedCount} invited collaborator${invitedCount === 1 ? "" : "s"} have access.`
              : "Only the owner has access right now."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <a
            href={`/api/projects/${slug}/export`}
            download
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "5px 10px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Export
          </a>

          {isOwner && (
            <button
              type="button"
              onClick={() => setShowInviteForm((v) => !v)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: showInviteForm ? "var(--ink-muted)" : "var(--teal)",
                backgroundColor: showInviteForm ? "var(--bg)" : "transparent",
                border: `1px solid ${showInviteForm ? "var(--border)" : "var(--teal)"}`,
                borderRadius: "3px",
                padding: "5px 10px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {showInviteForm ? "Hide invite" : "Invite"}
            </button>
          )}
        </div>
      </div>

      {/* Invite form — collapsed by default */}
      {isOwner && showInviteForm && (
        <div
          style={{
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 10px",
            }}
          >
            Invite collaborator
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: "10px",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                style={inputStyle}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                disabled={isPending}
              />
            </div>

            <div>
              <label style={labelStyle}>Role</label>
              <select
                style={{ ...inputStyle, width: "auto", paddingRight: "28px" }}
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "editor" | "viewer")
                }
                disabled={isPending}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <button
              onClick={handleInvite}
              disabled={isPending || !inviteEmail.trim()}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--bg)",
                backgroundColor:
                  isPending || !inviteEmail.trim()
                    ? "var(--ink-muted)"
                    : "var(--teal)",
                border: "none",
                borderRadius: "3px",
                padding: "7px 14px",
                cursor:
                  isPending || !inviteEmail.trim() ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                height: "34px",
                alignSelf: "flex-end",
              }}
            >
              {isPending ? "Saving…" : "Invite"}
            </button>
          </div>

          {inviteError && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--accent)",
                margin: "8px 0 0",
              }}
            >
              {inviteError}
            </p>
          )}

          {inviteSuccess && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--teal)",
                margin: "8px 0 0",
              }}
            >
              Invitation sent.
            </p>
          )}

          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              color: "var(--ink-muted)",
              margin: "10px 0 0",
              lineHeight: 1.45,
            }}
          >
            The invitee must already have a Lodestar account.
          </p>
        </div>
      )}

      {/* Members list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

        {/* Synthetic owner row — always first */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
              minWidth: 0,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {resolvedNames[ownerClerkId] ?? `User •••${ownerClerkId.slice(-4)}`}
            </span>
            {ownerClerkId === currentUserId && (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  color: "var(--ink-muted)",
                  letterSpacing: "0.08em",
                }}
              >
                (you)
              </span>
            )}
            <OwnerBadge />
          </div>
        </div>

        {/* Invited collaborator rows */}
        {members.map((member) => (
          <div
            key={member.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flex: 1,
                minWidth: 0,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {resolvedNames[member.clerkUserId] ?? `User •••${member.clerkUserId.slice(-4)}`}
              </span>
              {member.clerkUserId === currentUserId && (
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    color: "var(--ink-muted)",
                    letterSpacing: "0.08em",
                  }}
                >
                  (you)
                </span>
              )}
              <RoleBadge role={member.role} />
            </div>

            {/* Owner controls */}
            {isOwner && (
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexShrink: 0,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => handleChangeRole(member)}
                  disabled={isPending}
                  title={`Switch to ${member.role === "editor" ? "viewer" : "editor"}`}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--teal)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--teal)",
                    borderRadius: "3px",
                    padding: "3px 8px",
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {member.role === "editor" ? "Viewer" : "Editor"}
                </button>
                <button
                  onClick={() => handleRemove(member)}
                  disabled={isPending}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    padding: "3px 8px",
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!hasCollaborators && (
        <div
          style={{
            marginTop: "12px",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "12px 14px",
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--ink-muted)",
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            Only the owner has access right now.
          </p>
        </div>
      )}
    </section>
  );
}
