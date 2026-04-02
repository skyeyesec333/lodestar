---
glob: src/actions/**/*.ts
---

# Server action rules

- Every file must start with `"use server"`
- Validate all input with Zod before touching the database — never trust raw `unknown` input directly
- Call `revalidatePath(\`/projects/${slug}\`)` after any mutation that affects project detail data
- Return `Result<T>` — never throw, never return raw data without wrapping
- Use `assertProjectAccess(projectId, userId, role)` from `src/lib/db/project-access.ts` to gate access
- Fire-and-forget activity logging: `recordActivity(...).catch(() => {})` — never await it in the critical path
- Use `UNAUTHORIZED` (not `FORBIDDEN`) as the error code for unauthenticated requests
