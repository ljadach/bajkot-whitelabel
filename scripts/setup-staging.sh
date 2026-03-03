#!/bin/bash
set -euo pipefail

# ============================================================
# AITutor Staging Environment Setup
# ============================================================
# Vercel handles everything — builds frontend AND deploys Convex backend.
# No GitHub Actions needed.
#
# Architecture:
#   push to staging → Vercel auto-builds → convex deploy + vite build
#   push to main    → Vercel auto-builds → convex deploy + vite build (prod)
#
# Prerequisites: Convex CLI, Vercel CLI, GitHub CLI (gh)
#
# Usage:
#   chmod +x scripts/setup-staging.sh
#   ./scripts/setup-staging.sh
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

step() { echo -e "\n${GREEN}▸ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
info() { echo -e "  $1"; }

echo ""
echo "============================================"
echo "  AITutor Staging Setup"
echo "============================================"
echo ""

# --------------------------------------------------
# Step 1: Create Convex staging project
# --------------------------------------------------
step "Step 1: Convex staging project"
info "Go to https://dashboard.convex.dev → Create new project"
info "Name suggestion: ${BOLD}aitutorc-staging${NC}"
echo ""
read -p "  Staging CONVEX_DEPLOY_KEY: " STAGING_DEPLOY_KEY
[[ -z "$STAGING_DEPLOY_KEY" ]] && { echo "  Error: CONVEX_DEPLOY_KEY cannot be empty"; exit 1; }
read -p "  Staging CONVEX_URL (https://xxx.convex.cloud): " STAGING_CONVEX_URL
[[ -z "$STAGING_CONVEX_URL" ]] && { echo "  Error: CONVEX_URL cannot be empty"; exit 1; }

info "Deploying schema to staging..."
CONVEX_DEPLOY_KEY="$STAGING_DEPLOY_KEY" npx convex deploy
info "Done."

info "Seeding staging database..."
CONVEX_DEPLOY_KEY="$STAGING_DEPLOY_KEY" npx convex run --prod seed:seedStaging
info "Done."

# --------------------------------------------------
# Step 2: Set Convex staging env vars
# --------------------------------------------------
step "Step 2: Convex staging environment variables"
info "Set these in Convex dashboard → Settings → Environment Variables:"
echo ""
info "  ${BOLD}Required:${NC}"
info "    CLERK_ISSUER_URL           → from Clerk dashboard (dev instance)"
info "    OPENROUTER_API_KEY         → your OpenRouter key"
echo ""
info "  ${BOLD}Optional (full feature parity):${NC}"
info "    LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL"
info "    STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (test mode)"
info "    GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY"
info "    CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN"
echo ""
read -p "  Press Enter when done..."

# --------------------------------------------------
# Step 3: Create Vercel staging project
# --------------------------------------------------
step "Step 3: Vercel staging project"
info "Go to https://vercel.com/new → Import ${BOLD}c3z/aitutorc${NC} repo"
echo ""
info "Configure:"
info "  Framework:      Vite"
info "  Root Directory: ./"
info "  Build Command:  ${BOLD}npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL${NC}"
info "  Output Dir:     dist"
info "  Git Branch:     ${BOLD}staging${NC}"
echo ""
info "Environment Variables (scope: ${BOLD}All${NC}):"
info "  CONVEX_DEPLOY_KEY                = $STAGING_DEPLOY_KEY"
info "  VITE_CLERK_PUBLISHABLE_KEY       = pk_test_... (Clerk dev instance)"
info "  VITE_PUBLIC_POSTHOG_KEY          = phc_... (same as prod or separate)"
info "  VITE_PUBLIC_POSTHOG_HOST         = https://eu.i.posthog.com"
info "  VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN = gpnloy4tnwlnwyko"
echo ""
warn "VITE_CONVEX_URL is auto-injected by --cmd-url-env-var-name. Don't set it manually."
echo ""
read -p "  Press Enter when done..."

# --------------------------------------------------
# Step 4: Update existing prod Vercel project
# --------------------------------------------------
step "Step 4: Update production Vercel project"
info "Update your existing Vercel project to match the same pattern."
echo ""
info "Settings → General:"
info "  Build Command:  ${BOLD}npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL${NC}"
info "  Output Dir:     dist"
info "  Git Branch:     ${BOLD}main${NC}"
echo ""
info "Environment Variables (if not already set):"
info "  CONVEX_DEPLOY_KEY                = (your prod deploy key)"
info "  VITE_CLERK_PUBLISHABLE_KEY       = pk_live_... (or pk_test_ for now)"
info "  VITE_PUBLIC_POSTHOG_KEY          = phc_..."
info "  VITE_PUBLIC_POSTHOG_HOST         = https://eu.i.posthog.com"
info "  VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN = gpnloy4tnwlnwyko"
echo ""
read -p "  Press Enter when done..."

# --------------------------------------------------
# Step 5: Create staging branch
# --------------------------------------------------
step "Step 5: Create staging branch"

if git show-ref --verify --quiet refs/heads/staging 2>/dev/null; then
  warn "Branch 'staging' already exists locally"
elif git ls-remote --heads origin staging | grep -q staging; then
  warn "Branch 'staging' already exists on remote"
  git fetch origin staging
  git checkout -b staging origin/staging
  git checkout -
else
  git checkout -b staging main
  git push -u origin staging
  git checkout -
  info "Branch 'staging' created and pushed."
fi

# --------------------------------------------------
# Step 6: Optional — custom domain
# --------------------------------------------------
step "Step 6: Custom domain (optional)"
info "In Vercel staging project → Settings → Domains:"
info "  Add: ${BOLD}staging.aitutorc.pl${NC}"
info ""
info "This requires a CNAME record in your DNS:"
info "  staging.aitutorc.pl → cname.vercel-dns.com"
echo ""

# --------------------------------------------------
# Done
# --------------------------------------------------
echo ""
echo "============================================"
echo -e "  ${GREEN}Setup complete!${NC}"
echo "============================================"
echo ""
echo "  Staging: push to 'staging' → Vercel auto-deploys"
echo "  Prod:    push to 'main'    → Vercel auto-deploys"
echo ""
echo "  Workflow:"
echo "    feature/* ──PR──→ staging ──auto──→ staging.aitutorc.pl"
echo "    staging   ──PR──→ main    ──auto──→ aitutorc.pl"
echo ""
echo "  No CI/CD config needed. Vercel handles everything."
echo ""
