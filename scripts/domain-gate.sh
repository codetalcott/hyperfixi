#!/usr/bin/env bash
#
# Runs lokascript-domains' round-trip gate against THIS tree's intent, framework
# and semantic, packed from their dist/.
#
# The seven domain DSLs read on framework's matcher skeleton and take their
# grammar from semantic's language profiles, and no other gate here parses one:
# parse parity and the multilingual ratchets cover hyperscript only. So a matcher
# or profile change made for hyperscript could regress a domain with every gate
# here green. This runs the domains' own gate (their scripts/gate-upstream.sh) on
# this tree's packages and fails on a case worse than the domains' committed
# baseline. Moved parses and better cases are reported, never failed.
#
# Usage:
#   bash scripts/domain-gate.sh                    # clones lokascript-domains at DOMAINS_REF
#   DOMAINS_DIR=<checkout> bash scripts/domain-gate.sh   # an installed checkout instead
#
# DOMAINS_REF is pinned so a push to lokascript-domains cannot turn this repo's
# CI red: bump it when the domains regenerate their baseline (after a relock).
#
# The gate is blind to a change that rendering and reading share: it renders
# each command and reads it back, and never reads fixed text. A Japanese marker
# swapped in semantic's profile (を → お) moves nothing here (measured
# 2026-10-20); an identifier read differently moved 1,127 parses and made 1,144
# cases worse.

set -euo pipefail

DOMAINS_REF="${DOMAINS_REF:-eb926d1f38224304a4404fe8dd26e726b5444c46}"
DOMAINS_REPO="${DOMAINS_REPO:-https://github.com/codetalcott/lokascript-domains.git}"

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Locally, rebuild a stale dist first. CI's dists come from the build job, and
# this job installs nothing to rebuild them with.
if [ -z "${CI:-}" ]; then
  "$root/scripts/ensure-fresh.sh" "$root/packages/intent" "$root/packages/framework" "$root/packages/semantic"
fi

tarballs=()
for pkg in intent framework semantic; do
  [ -f "$root/packages/$pkg/dist/index.js" ] || {
    echo "packages/$pkg/dist is missing: build it first" >&2
    exit 2
  }
  file="$(cd "$root/packages/$pkg" && npm pack --silent --pack-destination "$work" | tail -1)"
  tarballs+=("$work/$file")
done

if [ -n "${DOMAINS_DIR:-}" ]; then
  domains="$(cd "$DOMAINS_DIR" && pwd)"
else
  domains="$work/lokascript-domains"
  git init -q "$domains"
  git -C "$domains" fetch -q --depth 1 "$DOMAINS_REPO" "$DOMAINS_REF"
  git -C "$domains" checkout -q FETCH_HEAD
  (cd "$domains" && npm ci --no-audit --no-fund --silent)
fi
echo "lokascript-domains: $(git -C "$domains" rev-parse --short HEAD)"

UPSTREAM_TARBALLS="${tarballs[*]}" bash "$domains/scripts/gate-upstream.sh"
