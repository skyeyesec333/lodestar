import { ProjectForm } from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div style={{ maxWidth: "560px" }}>
      <div style={{ marginBottom: "40px" }}>
        <p className="eyebrow" style={{ marginBottom: "10px" }}>
          New Project
        </p>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "36px",
            fontWeight: 400,
            color: "#0d0d0b",
            margin: "0 0 8px",
          }}
        >
          Create a project
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px",
            color: "#6b6b64",
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          Track an infrastructure project toward EXIM Bank financing.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #d9d4c8",
          borderRadius: "4px",
          padding: "32px",
        }}
      >
        <ProjectForm />
      </div>
    </div>
  );
}
