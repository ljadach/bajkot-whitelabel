#!/usr/bin/env bash
# Generate Bajkoterapia illustrations using mag-visual-generate skill (Gemini).
#
# Reads prompts from scripts/illustrations/prompts.json and writes PNGs to
# public/illustrations/. The "bajkot" style (in .claude/skills/mag-visual-generate/styles/bajkot.txt)
# is applied to every prompt automatically.
#
# Usage:
#   scripts/generate-illustrations.sh                 # generate everything missing
#   scripts/generate-illustrations.sh hero step-01-temat   # specific keys
#   scripts/generate-illustrations.sh --group service      # all in service group
#   scripts/generate-illustrations.sh --group themes       # all in themes group
#   scripts/generate-illustrations.sh --force <key...>     # regenerate even if file exists
#   scripts/generate-illustrations.sh --list               # list available keys

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPTS="$ROOT/scripts/illustrations/prompts.json"
OUT_DIR="$ROOT/public/illustrations"
GENERATOR="$ROOT/.claude/skills/mag-visual-generate/scripts/generate_image.py"
STYLE="bajkot"

if [[ ! -f "$PROMPTS" ]]; then
  echo "ERROR: prompts file not found: $PROMPTS" >&2
  exit 1
fi
if [[ ! -x "$GENERATOR" ]]; then
  echo "ERROR: generator not executable: $GENERATOR" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required (brew install jq)" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

list_keys() {
  jq -r '
    (.service // {} | to_entries[] | "service\t\(.key)"),
    (.themes  // {} | to_entries[] | "themes\t\(.key)")
  ' "$PROMPTS"
}

prompt_for() {
  local key="$1"
  jq -r --arg k "$key" '
    (.service[$k] // .themes[$k] // empty)
  ' "$PROMPTS"
}

generate_one() {
  local key="$1"
  local force="$2"
  local out="$OUT_DIR/$key.png"

  if [[ -f "$out" && "$force" != "1" ]]; then
    echo "[skip] $key (already exists, use --force to regenerate)"
    return 0
  fi

  local prompt
  prompt="$(prompt_for "$key")"
  if [[ -z "$prompt" ]]; then
    echo "[err]  $key — not found in prompts.json" >&2
    return 1
  fi

  echo "[gen]  $key"
  "$GENERATOR" "$prompt" --style "$STYLE" --output "$out"
}

# --- arg parsing ---
FORCE=0
GROUP=""
KEYS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)
      list_keys
      exit 0
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --group)
      GROUP="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      KEYS+=("$1")
      shift
      ;;
  esac
done

# Resolve target keys
if [[ -n "$GROUP" ]]; then
  mapfile -t GROUP_KEYS < <(jq -r --arg g "$GROUP" '.[$g] // {} | keys[]' "$PROMPTS")
  if [[ ${#GROUP_KEYS[@]} -eq 0 ]]; then
    echo "ERROR: group '$GROUP' is empty or unknown" >&2
    exit 1
  fi
  KEYS+=("${GROUP_KEYS[@]}")
fi

if [[ ${#KEYS[@]} -eq 0 ]]; then
  mapfile -t ALL_KEYS < <(jq -r '(.service // {} | keys[]), (.themes // {} | keys[])' "$PROMPTS")
  KEYS=("${ALL_KEYS[@]}")
fi

echo "Output: $OUT_DIR"
echo "Style:  $STYLE"
echo "Keys:   ${#KEYS[@]}"
echo

failed=0
for key in "${KEYS[@]}"; do
  if ! generate_one "$key" "$FORCE"; then
    failed=$((failed + 1))
  fi
done

echo
if [[ $failed -gt 0 ]]; then
  echo "Done with $failed failure(s)." >&2
  exit 1
fi
echo "Done."
