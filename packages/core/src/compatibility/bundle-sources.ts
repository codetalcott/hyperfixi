/**
 * Which source file backs each `metadata.ts` bundle entry, and how that file
 * declares its command set.
 *
 * ## Why this exists
 *
 * `metadata.ts` advertises a `commandCount` per bundle. Until Arc A step 4.4
 * only two of those numbers were checked against anything, and all three of the
 * unchecked-and-checkable ones were wrong: `minimal` said 30 against an array of
 * 10, `standard` said 35 against 25, and `multilingual` said 59 — the
 * full-registry number — while registering 52.
 *
 * The count and the file that determines it were declared in different places,
 * so nothing could compare them. This module is the one place the pairing
 * lives; `scripts/verify-reference-data.ts` and
 * `runtime/__tests__/command-manifest-audit.test.ts` both read it, so the gate
 * and the audit cannot disagree about which file backs which bundle.
 *
 * Data only — no imports, so it costs nothing to reach from anywhere.
 */

/**
 * Bundles that hand-pick commands through `createTreeShakeableRuntime([...])`
 * without publishing an array. The factory calls are the fact.
 *
 * Note `minimal` REGISTERS one more name than it advertises — its
 * `createSendCommand` also registers the consolidation alias `trigger`. The
 * metadata count mirrors the advertised array, so the two stay comparable;
 * whether the array should also list `trigger` is a behavior question left to
 * its own PR.
 */
export const BUNDLES_WITH_FACTORY_LISTS: Readonly<Record<string, string>> = {
  multilingual: 'browser-bundle-multilingual.ts',
};

// Two more pairings lived here until Phase C3 retired the bundles they
// described: `BUNDLES_WITH_COMMAND_LISTS` (hybrid-complete published its own
// `commands: [...]` array, which the metadata count mirrored) and
// `BUNDLES_INHERITING` (hybrid-hx re-exported hybrid-complete, so its count
// had to equal that bundle's). No shipped bundle is either today.
