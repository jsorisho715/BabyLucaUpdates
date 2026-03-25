# CLAUDE.md — Project Bootstrap Instructions

This file instructs Claude Code (or any AI assistant) to fully scaffold and configure a new Next.js + Supabase web application using Real Tech LLC's standard patterns.

## Stack

- **Runtime:** Node.js 22+ (nvm4w)
- **Package Manager:** pnpm 10+
- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack)
- **UI:** Tailwind CSS v4 (PostCSS plugin, no tailwind.config), shadcn/ui (new-york style, Radix primitives, Lucide icons)
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Auth:** Supabase Auth with SSR helpers (`@supabase/ssr`)
- **Email:** Resend
- **AI:** Anthropic Claude (primary), OpenAI/Groq/Ollama as alternatives
- **Payments:** Stripe (when needed)
- **Deployment:** Vercel (primary), Docker for local dev
- **Testing:** Vitest (unit), Playwright (E2E)
- **CI/CD:** GitHub Actions → Vercel

## Code Style

- No semicolons
- Single quotes
- 2-space indentation
- Trailing commas (es5)
- 100 character line width
- `@/*` import alias maps to project root
- Server Components by default — only add `"use client"` when needed for interactivity
- Always optimize for mobile (375px minimum) and desktop

## Architecture Patterns

### File Structure
```
app/                    # Next.js App Router pages
  (auth)/               # Auth route group (login, signup)
  (dashboard)/          # Protected dashboard routes
  api/                  # API routes
  globals.css           # Tailwind v4 styles + CSS variables
  layout.tsx            # Root layout with providers
components/
  ui/                   # shadcn/ui components (auto-generated)
  [feature]/            # Feature-specific components
lib/
  supabase/
    client.ts           # createClient() — browser Supabase
    server.ts           # createClient() — server Supabase + createAdminClient()
    middleware.ts        # updateSession() for auth token refresh
  utils.ts              # cn() helper, common utilities
hooks/                  # Custom React hooks
middleware.ts           # Root middleware for auth protection
```

### Supabase Client Pattern (Browser)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Supabase Client Pattern (Server)
```typescript
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  )
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

### Middleware Pattern
```typescript
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### API Route Pattern
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ /* fields */ })

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // ... business logic with supabase
}
```

### Component Pattern (shadcn style)
```typescript
'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props { className?: string }

export function MyComponent({ className }: Props) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* content */}
      </CardContent>
    </Card>
  )
}
```

## When Scaffolding a New Project

1. **Run `pnpm create next-app@latest`** with TypeScript, Tailwind, ESLint, App Router, no src dir, `@/*` alias
2. **Copy config files** from `configs/` directory into project root
3. **Copy scaffold files** into `lib/`, `app/`, and root
4. **Install dependencies** — merge from `package-template.json`
5. **Initialize shadcn/ui** — `pnpm dlx shadcn@latest init -y` (new-york, neutral, CSS variables)
6. **Add common shadcn components:** button, card, input, label, dialog, dropdown-menu, select, tabs, toast, tooltip, separator, switch, checkbox
7. **Initialize Supabase** — `supabase init && supabase start`
8. **Copy `.env.example` to `.env.local`** and fill in Supabase keys from `supabase start` output
9. **Set up Git** — `git init && git add . && git commit -m "Initial scaffold"`
10. **Set up GitHub** — `gh repo create <name> --private --source=. --push`

## Branding

Projects use CSS variables for white-labeling. Common brand env vars:
```
NEXT_PUBLIC_BRAND_NAME=Real Tech LLC
NEXT_PUBLIC_BRAND_SHORT=Real Tech
NEXT_PUBLIC_BRAND_INITIALS=RT
NEXT_PUBLIC_BRAND_URL=https://realtechconsultant.com
NEXT_PUBLIC_BRAND_TAGLINE=Your Tagline
NEXT_PUBLIC_POWERED_BY=Powered by Real Tech LLC
```

## Security Defaults

- Security headers in `next.config.ts` (HSTS, X-Frame-Options, CSP, etc.)
- Never commit `.env` or `.env.local`
- Use Supabase RLS (Row Level Security) on all tables
- Validate all inputs with Zod
- Use `createAdminClient()` only in server-side code, never expose service role key

## Docker

- `docker-compose.yml` — production (app + postgres)
- `docker-compose.dev.yml` — development with hot reload and volume mounts
- Local Supabase runs via `supabase start` (uses Docker internally)

## Testing

- **Unit tests:** Vitest + Testing Library (`vitest.config.ts` at root)
- **E2E tests:** Playwright (`playwright.config.ts`)
- **Test files:** `*.test.ts` / `*.test.tsx` colocated with source or in `tests/`
- **Setup:** `tests/setup.ts` mocks Next.js router

## Common Integrations Reference

| Service | Package | Env Vars |
|---------|---------|----------|
| Supabase | `@supabase/ssr`, `@supabase/supabase-js` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Resend | `resend` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Stripe | `stripe`, `@stripe/stripe-js` | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Anthropic | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY`, `AI_PROVIDER`, `AI_MODEL` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Vercel Analytics | `@vercel/analytics` | (automatic on Vercel) |
| Google Analytics | N/A | `GOOGLE_ANALYTICS_PROPERTY_ID` |
| n8n | N/A (webhook) | `N8N_INTEGRATION_TOKEN` |
| Sentry | `@sentry/nextjs` | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
