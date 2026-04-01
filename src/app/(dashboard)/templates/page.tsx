import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TemplatesMarketplaceClient } from "@/components/templates/TemplatesMarketplaceClient";
import { WORKSPACE_TEMPLATES } from "@/lib/templates/directory";

export default async function TemplatesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div>
      <div style={{ marginBottom: "28px", maxWidth: "780px" }}>
        <p className="eyebrow" style={{ marginBottom: "10px" }}>
          Marketplace
        </p>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "36px",
            fontWeight: 400,
            color: "var(--ink)",
            margin: "0 0 10px",
          }}
        >
          Template Marketplace
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px",
            color: "var(--ink-muted)",
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          Browse starter workspace templates for repeatable deal structures. This placeholder
          surface is the first step toward official bank templates, private firm standards, and
          open-source community contributions.
        </p>
      </div>

      <TemplatesMarketplaceClient templates={WORKSPACE_TEMPLATES} />
    </div>
  );
}
