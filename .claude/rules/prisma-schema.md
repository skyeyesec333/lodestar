---
glob: prisma/schema.prisma
---

# Prisma schema rules

- All monetary/percentage values use `Int` or `BigInt` — never `Float` or `Decimal`
- Table names use `@@map("snake_case_plural")` — model names use PascalCase singular
- Always add `@@map` for new models
- Run `npx prisma generate` after any schema change
- Push to DB with the direct connection URL (port 5432), NOT the pooler URL (port 6543):
  `DATABASE_URL=[direct_url] npx prisma db push`
- Never run `prisma db pull` — it overwrites manually added models
- New relation fields need both sides declared (the relation and the back-relation)
