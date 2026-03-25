param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,

    [string]$DestinationPath = (Get-Location).Path,

    [switch]$SkipSupabase,
    [switch]$SkipDocker,
    [switch]$SkipGit
)

$ErrorActionPreference = "Stop"
$TemplateDir = $PSScriptRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  WebApp Template - Project Bootstrap" -ForegroundColor Cyan
Write-Host "  Real Tech LLC" -ForegroundColor DarkGray
Write-Host "========================================`n" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 1. Validate Prerequisites
# ---------------------------------------------------------------------------
Write-Host "[1/9] Checking prerequisites..." -ForegroundColor Yellow

$tools = @(
    @{ Name = "node";   Cmd = "node --version";   Required = $true  },
    @{ Name = "pnpm";   Cmd = "pnpm --version";   Required = $true  },
    @{ Name = "git";    Cmd = "git --version";     Required = $true  },
    @{ Name = "docker"; Cmd = "docker --version";  Required = $false },
    @{ Name = "gh";     Cmd = "gh --version";      Required = $false },
    @{ Name = "vercel"; Cmd = "vercel --version";  Required = $false },
    @{ Name = "supabase"; Cmd = "supabase --version"; Required = $false }
)

$missing = @()
foreach ($tool in $tools) {
    try {
        $null = Invoke-Expression $tool.Cmd 2>&1
        Write-Host "  [OK] $($tool.Name)" -ForegroundColor Green
    } catch {
        if ($tool.Required) {
            Write-Host "  [MISSING] $($tool.Name) (REQUIRED)" -ForegroundColor Red
            $missing += $tool.Name
        } else {
            Write-Host "  [MISSING] $($tool.Name) (optional)" -ForegroundColor DarkYellow
        }
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`nMissing required tools: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "Install them and try again.`n" -ForegroundColor Red
    exit 1
}

# Check for supabase CLI and offer to install via Scoop
try {
    $null = Invoke-Expression "supabase --version" 2>&1
} catch {
    Write-Host "`n  Supabase CLI not found. Installing via Scoop..." -ForegroundColor DarkYellow
    try {
        $null = Invoke-Expression "scoop --version" 2>&1
    } catch {
        Write-Host "  Scoop not found. Installing Scoop first..." -ForegroundColor DarkYellow
        Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
    }
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git 2>$null
    scoop install supabase
}

# ---------------------------------------------------------------------------
# 2. Scaffold Next.js Project
# ---------------------------------------------------------------------------
Write-Host "`n[2/9] Scaffolding Next.js project: $ProjectName..." -ForegroundColor Yellow

$projectPath = Join-Path $DestinationPath $ProjectName

pnpm create next-app@latest $projectPath `
    --typescript `
    --tailwind `
    --eslint `
    --app `
    --import-alias "@/*" `
    --turbopack `
    --yes

Set-Location $projectPath
Write-Host "  Project created at: $projectPath" -ForegroundColor Green

# ---------------------------------------------------------------------------
# 3. Copy Configuration Files
# ---------------------------------------------------------------------------
Write-Host "`n[3/9] Copying configuration files..." -ForegroundColor Yellow

$configFiles = @(
    @{ Src = "configs\tsconfig.json";          Dst = "tsconfig.json" },
    @{ Src = "configs\next.config.ts";         Dst = "next.config.ts" },
    @{ Src = "configs\postcss.config.mjs";     Dst = "postcss.config.mjs" },
    @{ Src = "configs\eslint.config.mjs";      Dst = "eslint.config.mjs" },
    @{ Src = "configs\.prettierrc.json";       Dst = ".prettierrc.json" },
    @{ Src = "configs\components.json";        Dst = "components.json" },
    @{ Src = "configs\.gitignore";             Dst = ".gitignore" },
    @{ Src = "configs\.dockerignore";          Dst = ".dockerignore" },
    @{ Src = "configs\docker-compose.yml";     Dst = "docker-compose.yml" },
    @{ Src = "configs\docker-compose.dev.yml"; Dst = "docker-compose.dev.yml" },
    @{ Src = "configs\vitest.config.ts";       Dst = "vitest.config.ts" }
)

foreach ($file in $configFiles) {
    $src = Join-Path $TemplateDir $file.Src
    if (Test-Path $src) {
        Copy-Item $src -Destination $file.Dst -Force
        Write-Host "  Copied: $($file.Dst)" -ForegroundColor DarkGray
    }
}

# ---------------------------------------------------------------------------
# 4. Copy Scaffold Files
# ---------------------------------------------------------------------------
Write-Host "`n[4/9] Copying scaffold files..." -ForegroundColor Yellow

New-Item -ItemType Directory -Path "lib\supabase" -Force | Out-Null
New-Item -ItemType Directory -Path "hooks" -Force | Out-Null
New-Item -ItemType Directory -Path "tests" -Force | Out-Null

$scaffoldFiles = @(
    @{ Src = "scaffold\supabase-client.ts";     Dst = "lib\supabase\client.ts" },
    @{ Src = "scaffold\supabase-server.ts";     Dst = "lib\supabase\server.ts" },
    @{ Src = "scaffold\supabase-middleware.ts";  Dst = "lib\supabase\middleware.ts" },
    @{ Src = "scaffold\utils.ts";               Dst = "lib\utils.ts" },
    @{ Src = "scaffold\globals.css";            Dst = "app\globals.css" },
    @{ Src = "scaffold\middleware.ts";          Dst = "middleware.ts" }
)

foreach ($file in $scaffoldFiles) {
    $src = Join-Path $TemplateDir $file.Src
    if (Test-Path $src) {
        Copy-Item $src -Destination $file.Dst -Force
        Write-Host "  Copied: $($file.Dst)" -ForegroundColor DarkGray
    }
}

# Copy env template
Copy-Item (Join-Path $TemplateDir ".env.example") -Destination ".env.example" -Force
Copy-Item (Join-Path $TemplateDir ".env.example") -Destination ".env.local" -Force
Write-Host "  Copied: .env.example -> .env.local" -ForegroundColor DarkGray

# Copy VSCode settings
if (Test-Path (Join-Path $TemplateDir ".vscode")) {
    Copy-Item (Join-Path $TemplateDir ".vscode") -Destination ".vscode" -Recurse -Force
    Write-Host "  Copied: .vscode/" -ForegroundColor DarkGray
}

# Copy GitHub workflows
if (Test-Path (Join-Path $TemplateDir ".github")) {
    Copy-Item (Join-Path $TemplateDir ".github") -Destination ".github" -Recurse -Force
    Write-Host "  Copied: .github/" -ForegroundColor DarkGray
}

# Copy AI assistant config
Copy-Item (Join-Path $TemplateDir "CLAUDE.md") -Destination "CLAUDE.md" -Force
Copy-Item (Join-Path $TemplateDir ".cursorrules") -Destination ".cursorrules" -Force
Write-Host "  Copied: CLAUDE.md, .cursorrules" -ForegroundColor DarkGray

# ---------------------------------------------------------------------------
# 5. Install Dependencies
# ---------------------------------------------------------------------------
Write-Host "`n[5/9] Installing dependencies..." -ForegroundColor Yellow

# Core UI
pnpm add `
    @supabase/ssr @supabase/supabase-js `
    class-variance-authority clsx tailwind-merge lucide-react `
    @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-avatar `
    @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu `
    @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-progress `
    @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot `
    @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast `
    @radix-ui/react-toggle @radix-ui/react-tooltip `
    react-hook-form @hookform/resolvers zod date-fns `
    framer-motion sonner vaul cmdk next-themes `
    recharts embla-carousel-react resend

# Dev dependencies
pnpm add -D `
    @tailwindcss/postcss tailwindcss tw-animate-css `
    sharp prettier `
    vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom happy-dom `
    @playwright/test

Write-Host "  Dependencies installed." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 6. Initialize shadcn/ui
# ---------------------------------------------------------------------------
Write-Host "`n[6/9] Initializing shadcn/ui..." -ForegroundColor Yellow

pnpm dlx shadcn@latest init -y -d

# Add common components
pnpm dlx shadcn@latest add button card input label dialog dropdown-menu select tabs toast tooltip separator switch checkbox -y

Write-Host "  shadcn/ui initialized with common components." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 7. Update package.json scripts
# ---------------------------------------------------------------------------
Write-Host "`n[7/9] Updating package.json scripts..." -ForegroundColor Yellow

$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$pkg.scripts | Add-Member -NotePropertyName "test" -NotePropertyValue "vitest" -Force
$pkg.scripts | Add-Member -NotePropertyName "test:run" -NotePropertyValue "vitest run" -Force
$pkg.scripts | Add-Member -NotePropertyName "test:e2e" -NotePropertyValue "playwright test" -Force
$pkg.scripts | Add-Member -NotePropertyName "docker:up" -NotePropertyValue "docker compose up -d" -Force
$pkg.scripts | Add-Member -NotePropertyName "docker:down" -NotePropertyValue "docker compose down" -Force
$pkg.scripts | Add-Member -NotePropertyName "docker:dev" -NotePropertyValue "docker compose -f docker-compose.dev.yml up -d" -Force
$pkg.scripts | Add-Member -NotePropertyName "docker:logs" -NotePropertyValue "docker compose logs -f app" -Force
$pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8
Write-Host "  Scripts updated." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 8. Supabase Setup
# ---------------------------------------------------------------------------
if (-not $SkipSupabase) {
    Write-Host "`n[8/9] Setting up Supabase..." -ForegroundColor Yellow
    try {
        supabase init
        Write-Host "  Supabase initialized. Run 'supabase start' to launch locally." -ForegroundColor Green
        Write-Host "  Then update .env.local with the output keys." -ForegroundColor DarkYellow
    } catch {
        Write-Host "  Supabase init failed (CLI may not be installed). Skipping." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "`n[8/9] Skipping Supabase setup (--SkipSupabase)." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 9. Git Init
# ---------------------------------------------------------------------------
if (-not $SkipGit) {
    Write-Host "`n[9/9] Initializing Git..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial scaffold from WebApp Template"
    Write-Host "  Git initialized with initial commit." -ForegroundColor Green
} else {
    Write-Host "`n[9/9] Skipping Git init (--SkipGit)." -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. cd $projectPath" -ForegroundColor White
Write-Host "  2. Update .env.local with your API keys" -ForegroundColor White
Write-Host "  3. supabase start  (for local DB)" -ForegroundColor White
Write-Host "  4. pnpm dev        (start dev server)" -ForegroundColor White
Write-Host "  5. gh repo create  (push to GitHub)" -ForegroundColor White
Write-Host "  6. vercel          (deploy to Vercel)" -ForegroundColor White
Write-Host ""
