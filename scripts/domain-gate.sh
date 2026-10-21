#!/usr/bin/env bash
#
# Runs lokascript-domains' round-trip gate against THIS tree's intent, framework
# and semantic, packed from their dist/.
#
# The seven domain DSLs read on framework's matcher skeleton and take their
# grammar from framework's language modules (learn writes its commanding sentence
# with semantic), and no other gate here parses one:
# parse parity and the multilingual ratchets cover hyperscript only. So a matcher
# or profile change made for hyperscript could regress a domain with every gate
# here green. This runs the domains' own gate (their scripts/gate-upstream.sh) on
# this tree's packages and fails on a case worse than the domains' committed
# baseline. Moved parses and better cases are reported, never failed.
#
# That pass renders each command and reads it back with the same packages, so
# it is blind to a change both sides share: a Japanese marker swapped in
# semantic's profile (を → お) moved nothing in it (measured 2026-10-20), while
# an identifier read differently moved 1,127 parses and made 1,144 cases worse.
# A user's input is fixed text. So a second pass (domain-gate-read-back.mjs)
# renders every command with the domains' LOCKED packages and reads those
# sentences back with this tree's, and fails on one that reads differently.
# A deliberate change to what old input means is listed, with a reason, in
# domain-gate-accepted.json; the list only shrinks.
#
# Usage:
#   bash scripts/domain-gate.sh                    # clones lokascript-domains at DOMAINS_REF
#   DOMAINS_DIR=<checkout> bash scripts/domain-gate.sh   # an installed checkout instead
#
# DOMAINS_REF is pinned so a push to lokascript-domains cannot turn this repo's
# CI red: bump it when the domains regenerate their baseline (after a relock).
# A relock also moves the second pass's sentences to the new release, so it
# clears the accepted entries that release made.

set -euo pipefail

DOMAINS_REF="${DOMAINS_REF:-aadc4ee8a2603d5000671c715e942ba13e590d88}"
DOMAINS_REPO="${DOMAINS_REPO:-https://github.com/codetalcott/lokascript-domains.git}"

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Locally, rebuild a stale dist first. CI's dists come from the build job, and
# this job installs nothing to rebuild them with.
if [ -z "${CI:-}" ]; then
  "$root/scripts/ensure-fresh.sh" "$root/packages/intent" "$root/packages/framework" "$root/packages/semantic"
fi

pkgs=(intent framework semantic)
tarballs=()
for pkg in "${pkgs[@]}"; do
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

status=0
UPSTREAM_TARBALLS="${tarballs[*]}" bash "$domains/scripts/gate-upstream.sh" || status=$?

# Old input still reads. Both passes run in the domains' package (its tsx, its
# resolve hook, and the dist gate-upstream.sh just built). The read-back's
# packages go where gate-upstream.sh unpacks its own (removed on its exit):
# inside the package, so semantic's dependencies (nearley) resolve to the
# domains' node_modules, and in a path the domains ignore.
echo
echo "Old input: rendered on the domains' lockfile, read back on this tree"
domains_pkg="$domains/packages/domains"
read_back="$root/scripts/domain-gate-read-back.mjs"
(cd "$domains_pkg" && node --import tsx --import ./gate/upstream.mjs "$read_back" dump "$work/sentences.json")
upstream="$domains_pkg/.gate-upstream"
rm -rf "$upstream"
trap 'rm -rf "$work" "$upstream"' EXIT
for i in "${!pkgs[@]}"; do
  mkdir -p "$upstream/node_modules/@lokascript/${pkgs[$i]}"
  tar -xzf "${tarballs[$i]}" -C "$upstream/node_modules/@lokascript/${pkgs[$i]}" --strip-components=1
done
(cd "$domains_pkg" && GATE_UPSTREAM_ROOT="$upstream" node --import tsx --import ./gate/upstream.mjs \
  "$read_back" read "$work/sentences.json" "$root/scripts/domain-gate-accepted.json") || status=1

exit "$status"
