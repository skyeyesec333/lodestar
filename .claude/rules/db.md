---
glob: src/lib/db/**/*.ts
---

# DB layer rules

- Every Prisma query must include an explicit `select` object — no unbounded `.findMany()` without field selection
- Never import `PrismaClient` directly — use the singleton from `src/lib/db/index.ts`
- All functions return `Result<T>`: `{ ok: true, value: T } | { ok: false, error: { code: string, message: string } }`
- Monetary values are stored as `BigInt` in the DB (`amountUsdCents`, `capexUsdCents`, `sizeBytes`) — convert with `Number()` in the mapper before returning
- Never use `as never` or `as any` for Prisma enum fields — import the correct enum type from `@prisma/client`
- Paginated functions return `{ items: T[]; nextCursor: string | null }` — use `take: limit + 1` and cursor pagination
- Do not use `$queryRaw` unless a join/aggregation is provably impossible with typed Prisma — add a comment explaining why
