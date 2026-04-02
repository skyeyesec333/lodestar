---
glob: src/components/**/*.tsx
---

# Component rules

- Server components by default — only add `"use client"` when the component needs interactivity (onClick, useState, useEffect, etc.)
- No business logic in components — call server actions or read props only
- No direct DB imports — components never import from `src/lib/db/`
- No direct Prisma imports — never import from `@prisma/client` in components (use types from `src/types/`)
- `WatchButton` requires a `slug: string` prop in addition to `projectId` — always pass it
- Monetary display: values arrive as integer cents/bps — divide by 100 for display, never store floats
- Do not add comments or docstrings to code you didn't change
