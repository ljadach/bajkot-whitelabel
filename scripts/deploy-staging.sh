#!/bin/bash
set -euo pipefail

# ============================================================
# Deploy to staging: Convex backend + Vercel frontend
# ============================================================
# Requires STAGING_CONVEX_DEPLOY_KEY env var.
# Get it from: https://dashboard.convex.dev → coordinated-seahorse-267 → Settings → Deploy key
#
# Usage:
#   npm run deploy:staging
#   # or directly:
#   STAGING_CONVEX_DEPLOY_KEY=prod:coordinated-seahorse-267|... bash scripts/deploy-staging.sh
# ============================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${GREEN}▸ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# Load from .env.staging if it exists (for convenience)
if [ -f .env.staging ]; then
  set -a
  source .env.staging
  set +a
fi

# --- Pre-flight checks ---

if [ -z "${STAGING_CONVEX_DEPLOY_KEY:-}" ]; then
  fail "STAGING_CONVEX_DEPLOY_KEY is not set.
  Get it from: Convex dashboard → coordinated-seahorse-267 → Settings → Deploy key
  Then: export STAGING_CONVEX_DEPLOY_KEY='prod:coordinated-seahorse-267|...'
  Or add it to .env.staging"
fi

# --- Swap .vercel/project.json to staging ---

STAGING_VERCEL_PROJECT='{"projectId":"prj_qZoGrZ4YVA4RPcFZ2mdBt53PT5n9","orgId":"team_Qdygd6yJDFdnDQ7MNbN7T8pU","projectName":"bajkot-staging"}'

if [ ! -f .vercel/project.json ]; then
  fail ".vercel/project.json not found. Run 'vercel link' first."
fi

cp .vercel/project.json .vercel/project.json.bak
trap 'mv .vercel/project.json.bak .vercel/project.json 2>/dev/null || true' EXIT
echo "$STAGING_VERCEL_PROJECT" > .vercel/project.json

# --- Step 1: Deploy Convex functions to staging ---

step "Deploying Convex functions to staging (coordinated-seahorse-267)..."
CONVEX_DEPLOY_KEY="$STAGING_CONVEX_DEPLOY_KEY" npx convex deploy

# --- Step 2: Deploy frontend to Vercel staging ---

step "Deploying frontend to Vercel staging (bajkot-staging)..."
vercel --prod --yes --scope itsgglobal

# --- Done ---

echo -e "\n${GREEN}✓ Staging deploy complete!${NC}"
echo "  Convex: coordinated-seahorse-267"
echo "  Vercel: https://staging.bajkot.pl"
