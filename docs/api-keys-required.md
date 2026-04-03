# External API Keys Required

This file tracks every external service integration in Lodestar,
what feature it unlocks, and the environment variable to configure.

| Service | Feature | Env Var | Status |
|---------|---------|---------|--------|
| Resend | Email notifications (LOI alerts, mention alerts, approval reminders) | `RESEND_API_KEY` | Mock (logs to console when absent) |
| Upstash Redis | Distributed rate limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Mock (in-memory fallback when absent) |
| Clerk | Authentication and user management (sign-in, sign-up, session tokens) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Required — app cannot function without it |
| Supabase Storage | Document file uploads and signed download URLs | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required for document upload features |
| Anthropic Claude | In-app AI assistant (Beacon), meeting transcript extraction, gap analysis | `ANTHROPIC_API_KEY` | Required for AI features |
| Anthropic Model Override | Use a different Claude model for in-app AI features | `ANTHROPIC_MODEL` | Optional (defaults to `claude-sonnet-4-6`) |
| PostgreSQL (Supabase or self-hosted) | Primary application database via Prisma | `DATABASE_URL`, `DIRECT_URL` | Required — app cannot function without it |

## Setup Instructions

### Resend (Email Notifications)
1. Sign up at https://resend.com
2. Create an API key in the Resend dashboard
3. Add to .env.local:
   ```
   RESEND_API_KEY=re_...
   ```
4. Verify your sending domain in the Resend dashboard, or use the sandbox domain for testing

### Upstash Redis (Distributed Rate Limiting)
1. Sign up at https://upstash.com
2. Create a Redis database (free tier available)
3. Copy the REST URL and REST token from the database details page
4. Add to .env.local:
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

---

## Backlog — Deferred Until Pre-Production

These tasks are not blocking development. Both services have working fallbacks for local dev and alpha.

| Task | Urgency | Blocker? |
|------|---------|----------|
| Add `RESEND_API_KEY` to `.env.local` and production env | Before first real user email is needed | No — falls back to `console.log` |
| Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to `.env.local` and production env | Before multi-user production deploy | No — falls back to in-memory per-instance |

**When to action:** Wire Resend before sending any real user-facing email (LOI alerts, mention alerts). Wire Upstash before deploying to production with multiple serverless instances — in-memory rate limiting doesn't share state across instances.

---

### Anthropic Model Override (Optional)
1. By default, Lodestar uses `claude-sonnet-4-6` for in-app AI features
2. To use a different model, add to .env.local:
   ```
   ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
   ```
3. Valid models: any Claude model ID supported by your Anthropic API account
