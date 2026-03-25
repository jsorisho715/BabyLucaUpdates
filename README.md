# WebApp Template - Full Starter Kit

A zero-to-deployed starter template for new Next.js + Supabase projects. Built from patterns across all Real Tech LLC projects.

**Stack:** Next.js 16 (App Router) | React 19 | TypeScript | Tailwind CSS v4 | shadcn/ui (new-york) | Supabase | Vercel

---

## Prerequisites

Ensure these tools are installed before starting. Run `setup.ps1` to validate automatically.

| Tool | Required Version | Install |
|------|-----------------|---------|
| Node.js | >= 22.x | `nvm install 22` (nvm4w) |
| pnpm | >= 10.x | `npm i -g pnpm` |
| Git | >= 2.x | [git-scm.com](https://git-scm.com) |
| Docker | >= 29.x | [Docker Desktop](https://docker.com/products/docker-desktop) |
| GitHub CLI | >= 2.x | `winget install GitHub.cli` |
| Vercel CLI | >= 47.x | `npm i -g vercel` |
| Supabase CLI | >= 2.x | `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase` |
| Claude Code | latest | `npm i -g @anthropic-ai/claude-code` |

---

## Quick Start

### Option A: Automated Setup (Recommended)

```powershell
# 1. Copy this template folder to your new project location
Copy-Item "C:\Users\jonat\WebApp Template" -Destination "C:\Users\jonat\MyNewApp" -Recurse

# 2. Navigate to the new project
cd "C:\Users\jonat\MyNewApp"

# 3. Run the bootstrap script
.\setup.ps1 -ProjectName "my-new-app"
```

### Option B: Manual Setup

#### Step 1: Scaffold Next.js

```powershell
pnpm create next-app@latest my-new-app --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
cd my-new-app
```

#### Step 2: Copy Config Files

```powershell
# From this template folder, copy configs into your new project:
Copy-Item "configs\tsconfig.json" -Destination ".\tsconfig.json" -Force
Copy-Item "configs\next.config.ts" -Destination ".\next.config.ts" -Force
Copy-Item "configs\postcss.config.mjs" -Destination ".\postcss.config.mjs" -Force
Copy-Item "configs\eslint.config.mjs" -Destination ".\eslint.config.mjs" -Force
Copy-Item "configs\.prettierrc.json" -Destination ".\.prettierrc.json" -Force
Copy-Item "configs\components.json" -Destination ".\components.json" -Force
Copy-Item "configs\.gitignore" -Destination ".\.gitignore" -Force
Copy-Item "configs\.dockerignore" -Destination ".\.dockerignore" -Force
Copy-Item "configs\docker-compose.yml" -Destination ".\docker-compose.yml" -Force
Copy-Item "configs\docker-compose.dev.yml" -Destination ".\docker-compose.dev.yml" -Force
Copy-Item "configs\vitest.config.ts" -Destination ".\vitest.config.ts" -Force
```

#### Step 3: Copy Scaffold Files

```powershell
# Supabase client/server utilities
New-Item -ItemType Directory -Path "lib\supabase" -Force
Copy-Item "scaffold\supabase-client.ts" -Destination "lib\supabase\client.ts"
Copy-Item "scaffold\supabase-server.ts" -Destination "lib\supabase\server.ts"
Copy-Item "scaffold\supabase-middleware.ts" -Destination "lib\supabase\middleware.ts"
Copy-Item "scaffold\utils.ts" -Destination "lib\utils.ts"
Copy-Item "scaffold\globals.css" -Destination "app\globals.css" -Force
Copy-Item "scaffold\middleware.ts" -Destination ".\middleware.ts"

# Copy env template
Copy-Item ".env.example" -Destination ".\.env.example"
Copy-Item ".env.example" -Destination ".\.env.local"

# Copy VSCode and GitHub configs
Copy-Item ".vscode" -Destination ".\.vscode" -Recurse -Force
Copy-Item ".github" -Destination ".\.github" -Recurse -Force
```

#### Step 4: Install Dependencies

```powershell
# Merge the template dependencies into your package.json, then install.
# Or install them directly:

# Core UI
pnpm add @supabase/ssr @supabase/supabase-js class-variance-authority clsx tailwind-merge lucide-react

# Radix primitives (shadcn foundation)
pnpm add @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-tooltip

# Forms, validation, utilities
pnpm add react-hook-form @hookform/resolvers zod date-fns

# UI enhancements
pnpm add framer-motion sonner vaul cmdk next-themes recharts embla-carousel-react

# Email
pnpm add resend

# Dev dependencies
pnpm add -D @tailwindcss/postcss tailwindcss tw-animate-css sharp prettier vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @playwright/test happy-dom
```

#### Step 5: Initialize shadcn/ui

```powershell
pnpm dlx shadcn@latest init -y
```

When prompted, select:
- Style: **New York**
- Base color: **Neutral**
- CSS variables: **Yes**

Then add common components:

```powershell
pnpm dlx shadcn@latest add button card input label dialog dropdown-menu select tabs toast tooltip separator switch checkbox
```

#### Step 6: Set Up Supabase

```powershell
# Initialize Supabase locally
supabase init

# Start local Supabase (requires Docker)
supabase start

# This outputs your local keys — copy them into .env.local
```

Update `.env.local` with the keys from `supabase start` output:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
```

For production, create a project at [supabase.com](https://supabase.com) and use those keys.

#### Step 7: Docker Local Dev

```powershell
# Start development environment with hot reload
docker compose -f docker-compose.dev.yml up -d

# Or just the database
docker compose up db -d

# View logs
docker compose logs -f app
```

#### Step 8: Vercel Deployment

```powershell
# Link to Vercel
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy
vercel --prod
```

#### Step 9: Git + GitHub

```powershell
git init
git add .
git commit -m "Initial scaffold from WebApp Template"

# Create GitHub repo and push
gh repo create my-new-app --private --source=. --push
```

---

## Integration Setup Guides

### Resend (Email)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your domain
4. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

### Stripe (Payments)

1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard > Developers > API keys
3. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
   ```
4. Install: `pnpm add stripe @stripe/stripe-js`

### Anthropic AI

1. Get API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxx
   AI_PROVIDER=anthropic
   AI_MODEL=claude-sonnet-4-20250514
   ```
3. Install: `pnpm add @anthropic-ai/sdk`

### Google Analytics

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com)
2. Add to `.env.local`:
   ```
   GOOGLE_ANALYTICS_PROPERTY_ID=G-XXXXXXXXXX
   ```
3. Install: `pnpm add @vercel/analytics`

### n8n (Workflow Automation)

1. Set up n8n instance (self-hosted or cloud)
2. Create webhook workflows
3. Add to `.env.local`:
   ```
   N8N_INTEGRATION_TOKEN=your_webhook_token
   ```

---

## Project Structure After Setup

```
my-new-app/
  app/
    globals.css          # Tailwind v4 + shadcn CSS variables
    layout.tsx           # Root layout (from Next.js scaffold)
    page.tsx             # Home page
  components/
    ui/                  # shadcn components (auto-generated)
  lib/
    supabase/
      client.ts          # Browser Supabase client
      server.ts          # Server Supabase client
      middleware.ts       # Session refresh helper
    utils.ts             # cn() helper + common utilities
  middleware.ts           # Auth + route protection
  .env.local             # Environment variables (never commit)
  .env.example           # Template for env vars
  docker-compose.yml     # Production Docker setup
  docker-compose.dev.yml # Dev Docker with hot reload
  components.json        # shadcn/ui configuration
  next.config.ts         # Next.js config with security headers
  tsconfig.json          # TypeScript strict config
  vitest.config.ts       # Test configuration
  .github/
    workflows/
      deploy.yml         # CI/CD to Vercel
    PULL_REQUEST_TEMPLATE.md
  .vscode/
    settings.json        # Editor settings
    launch.json          # Debug configs
    extensions.json      # Recommended extensions
```

---

## Helpful Commands

```powershell
# Development
pnpm dev                    # Start Next.js dev server
pnpm build                  # Production build
pnpm lint                   # Run ESLint
pnpm test                   # Run Vitest
pnpm test:e2e               # Run Playwright E2E tests

# Docker
docker compose up -d        # Start services
docker compose down          # Stop services
docker compose logs -f app   # Tail app logs

# Supabase
supabase start              # Start local Supabase
supabase stop               # Stop local Supabase
supabase db reset            # Reset database + apply migrations
supabase migration new <name> # Create new migration
supabase gen types typescript --local > lib/database.types.ts  # Generate types

# Deployment
vercel                      # Preview deploy
vercel --prod               # Production deploy

# shadcn
pnpm dlx shadcn@latest add <component>  # Add a new component
```

---

## Conventions

- **No semicolons**, single quotes, 2-space tabs, trailing commas (es5), 100 char line width
- **`@/*` import alias** maps to project root
- **shadcn/ui new-york style** with Lucide icons
- **Server Components by default** — only add `"use client"` when needed
- **Supabase for auth and data** — use `createClient()` from `lib/supabase/server.ts` in server components, `lib/supabase/client.ts` in client components
- **Zod for validation** in forms and API routes
- **Mobile-first responsive design** — always test at 375px minimum

---

*Last Updated: March 2026 | Maintainer: Real Tech LLC*
