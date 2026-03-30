import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

// Prisma 7's prisma.config.ts does not auto-load .env — load it explicitly.
dotenv.config({ path: '.env.local' })

export default defineConfig({
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    // directUrl is used by Prisma Migrate to bypass connection pooling.
    // Required when DATABASE_URL points to a Supabase pooler (port 6543).
    directUrl: process.env.DIRECT_URL,
  },
})
