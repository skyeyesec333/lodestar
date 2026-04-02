---
glob: src/app/api/**/*.ts
---

# API route rules

- Validate all request bodies with Zod before any DB access
- Check auth with Clerk (`auth()`) at the top of every handler — return 401 if no userId
- Apply rate limiting via `checkRateLimit` from `src/lib/rate-limit.ts` immediately after auth:
  - AI routes (chat, gap-analysis, meetings/extract): 10–20 req/min
  - Search: 60 req/min
- Never call Prisma directly — use helpers from `src/lib/db/`
- Never call the Anthropic SDK directly — use helpers from `src/lib/ai/`
- Return typed JSON responses — include appropriate status codes (400 validation, 401 auth, 429 rate limit, 500 server error)
