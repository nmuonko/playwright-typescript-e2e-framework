#!/usr/bin/env bash
# Downloads the most recent published report section ("smoke" or "regression") built from main,
# so the Pages site keeps both suites and Allure keeps its history between runs.
#   scripts/ci/fetch-report-section.sh <suite> <destination-dir>
set -euo pipefail
suite="$1"
dest="$2"
id=$(gh api "repos/${GITHUB_REPOSITORY}/actions/artifacts?name=report-section-${suite}&per_page=30" \
  --jq '[.artifacts[] | select(.expired | not) | select(.workflow_run.head_branch == "main")][0].id // empty')
if [[ -z "$id" ]]; then
  echo "No previous ${suite} report section on main; continuing without it."
  exit 0
fi
tmp=$(mktemp)
gh api "repos/${GITHUB_REPOSITORY}/actions/artifacts/${id}/zip" > "$tmp"
mkdir -p "$dest"
unzip -q -o "$tmp" -d "$dest"
rm -f "$tmp"
echo "Restored ${suite} report section (artifact ${id}) into ${dest}."
