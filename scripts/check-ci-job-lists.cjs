#!/usr/bin/env node
/**
 * check-ci-job-lists — the four remaining hand-maintained package enumerations
 *
 * #862 guarded ci.yml's unit-test enumeration (scripts/check-ci-test-list.cjs)
 * and noted that FOUR more hand-written package lists were left unguarded. This
 * is that follow-up. Each list answers a different question, so each gets its
 * own predicate — but the failure shape is identical in all four: a package
 * silently drops out of (or never joins) a gate, and the gate stays green.
 *
 *   1. export-validation  the positional args of `scripts/validate-exports.mjs`
 *   2. typecheck          the `npm run typecheck --prefix …` lines in lint-typecheck
 *   3. coverage           the nightly job's packages, cross-checked with codecov.yml
 *   4. lint:domains       the nine-domain shell loop in the ROOT package.json
 *
 * Measured drift when this was written (2026-08-01), all four in one run:
 *
 *   • export-validation validated 8 of the 30 packages that qualify, and its
 *     9th arg (`aot-compiler`) is PRIVATE — validate-exports.mjs prints
 *     `[SKIP] … Private package` for it, so that arg had always been a no-op.
 *   • typecheck ran 11 of the 44 packages that declare a `typecheck` script.
 *     All 44 pass, and all 44 together take ~27s locally vs ~9s for the 11 —
 *     the gap was cost-free coverage nobody had claimed.
 *   • the coverage job uploads a `language-server` flag that codecov.yml never
 *     declares, so it gets neither `paths:` nor `carryforward: true`.
 *   • lint:domains was already correct at 9/9 — that class is pure prevention.
 *
 * Why one script and not four: the four lists are the same question asked of
 * two files, they share every parse primitive, and the pre-commit hook pays one
 * node boot instead of four. Each class is independently testable and reports
 * independently, so a failure still names exactly one list.
 *
 * `sliceJob` is imported from the sibling rather than copied. It is a parse
 * PRIMITIVE (cut one job's body out of the workflow), not a parse TARGET — the
 * decoupling the sibling's header argues for is about not letting one guard's
 * notion of "which packages count" leak into another's, which still holds here:
 * all four predicates below are derived from disk, independently.
 *
 * Zero runtime deps — node built-ins only, so it stays cheap enough for both
 * the pre-commit hook and the CI lint-typecheck step.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { sliceJob } = require('./check-ci-test-list.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const CI_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
const CODECOV_CONFIG = path.join(REPO_ROOT, 'codecov.yml');
const ROOT_PACKAGE_JSON = path.join(REPO_ROOT, 'package.json');

/**
 * Fields validate-exports.mjs actually checks. A package declaring ANY of them
 * has something the validator can find missing; a package declaring none is
 * outside its jurisdiction entirely.
 */
const ENTRY_POINT_FIELDS = ['main', 'module', 'types', 'browser', 'exports'];

/**
 * Deliberate omissions, per list. Keep these empty if you can — an entry means
 * a real package a real gate will never see. Each MUST carry a reason.
 *
 * `coverage` has no map on purpose: it is a bidirectional correspondence
 * between two files that must simply agree, and "this flag is declared but
 * never uploaded" has no benign form — codecov.yml's `carryforward: true`
 * makes it serve the last report it ever received, forever.
 */
const INTENTIONAL_OMISSIONS = {
  'export-validation': new Map([
    // e.g. ['some-package', 'ships prebuilt; dist is not produced in CI'],
  ]),
  typecheck: new Map([
    // e.g. ['some-package', 'needs a codegen step CI does not run'],
  ]),
  'lint:domains': new Map([
    // e.g. ['domain-x', 'lint suite is quarantined pending the vocab arc'],
  ]),
};

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

/** Does packages/<dir>/src contain a `lint.test.ts` anywhere? */
function hasLintSuite(dir) {
  const srcDir = path.join(PACKAGES_DIR, dir, 'src');
  const stack = [srcDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue; // no src/, or unreadable — not a lint-suite owner
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        stack.push(path.join(current, entry.name));
      } else if (entry.name === 'lint.test.ts') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Read every packages/*\/package.json into the facts the four predicates need.
 * Keyed by DIRECTORY, because every list under guard addresses packages by
 * directory (`--prefix packages/<dir>`, `packages/<dir>/coverage/lcov.info`).
 */
function loadWorkspaces() {
  const byDir = new Map();

  for (const dirent of fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const pkgPath = path.join(PACKAGES_DIR, dirent.name, 'package.json');
    let raw;
    try {
      raw = fs.readFileSync(pkgPath, 'utf8');
    } catch {
      continue; // directory without package.json (stale build leftovers) — skip
    }
    let pkg;
    try {
      pkg = JSON.parse(raw);
    } catch {
      throw new Error(`check-ci-job-lists: invalid JSON in ${pkgPath}`);
    }

    const scripts = pkg.scripts || {};
    byDir.set(dirent.name, {
      name: pkg.name || dirent.name,
      isPrivate: Boolean(pkg.private),
      hasEntryPoint: ENTRY_POINT_FIELDS.some(field => pkg[field]),
      hasTypecheck: Boolean(scripts.typecheck),
      hasTest: Boolean(scripts.test),
      hasLintSuite: dirent.name.startsWith('domain-') && hasLintSuite(dirent.name),
    });
  }

  return byDir;
}

function readCi(text) {
  if (text !== undefined) return text;
  try {
    return fs.readFileSync(CI_WORKFLOW, 'utf8');
  } catch (err) {
    throw new Error(`check-ci-job-lists: cannot read ${CI_WORKFLOW}: ${err.message}`);
  }
}

/** Require a job to exist, with a message that says what to do if it moved. */
function requireJob(text, jobName) {
  const body = sliceJob(text, jobName);
  if (body === null) {
    throw new Error(
      `check-ci-job-lists: no "${jobName}:" job found in .github/workflows/ci.yml. ` +
        `If it was renamed or removed, update scripts/check-ci-job-lists.cjs — ` +
        `otherwise this guard would silently stop checking it.`
    );
  }
  return body;
}

/**
 * Packages the `build` job builds. Not a list under guard (check-ci-build-order
 * owns its ORDER); it is the denominator for the export-validation predicate,
 * because a package CI never builds has no dist in the artifact and could only
 * ever be validated against thin air.
 */
function loadCiBuiltPackages(text) {
  const body = requireJob(readCi(text), 'build');
  const built = new Set();
  const pattern = /^[ \t]*run:[ \t]*npm run [A-Za-z0-9:_-]+ --prefix packages\/([A-Za-z0-9-]+)/gm;
  let m;
  while ((m = pattern.exec(body)) !== null) built.add(m[1]);

  if (built.size === 0) {
    throw new Error(
      `check-ci-job-lists: the "build" job has no ` +
        `\`run: npm run <script> --prefix packages/<dir>\` steps. Its step shape ` +
        `changed — update loadCiBuiltPackages() in scripts/check-ci-job-lists.cjs.`
    );
  }
  return built;
}

/**
 * Join one shell logical line, following `\` continuations.
 *
 * The export-validation arg list is 30 package names; on one physical line it
 * is unreviewable, so ci.yml wraps it. Reading only the first physical line
 * would see four packages and report the other 26 as missing.
 */
function joinContinuedLine(text) {
  let logical = '';
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/[ \t]+$/, '');
    if (trimmed.endsWith('\\')) {
      logical += `${trimmed.slice(0, -1)} `;
      continue;
    }
    logical += trimmed;
    break;
  }
  return logical;
}

/**
 * The positional args of `node scripts/validate-exports.mjs`.
 *
 * The real invocation is wrapped in an `if ! … | tee …; then` so the summary
 * parsing below it stays reachable on failure, so we cannot anchor on start of
 * line. Positional args run until the first `-`-prefixed token; everything past
 * that is flags and shell (`--strict 2>&1 | tee …; then`).
 */
function loadExportValidationArgs(text) {
  const body = requireJob(readCi(text), 'export-validation');
  const INVOCATION = 'node scripts/validate-exports.mjs';
  const idx = body.indexOf(INVOCATION);
  if (idx === -1) {
    throw new Error(
      `check-ci-job-lists: the "export-validation" job does not invoke ` +
        `\`node scripts/validate-exports.mjs\`. Either the gate was removed — in ` +
        `which case delete this check — or its shape changed; update ` +
        `loadExportValidationArgs() in scripts/check-ci-job-lists.cjs.`
    );
  }

  const args = [];
  for (const token of joinContinuedLine(body.slice(idx + INVOCATION.length))
    .trim()
    .split(/\s+/)) {
    if (token === '') continue;
    if (token.startsWith('-')) break;
    args.push(token);
  }

  if (args.length === 0) {
    throw new Error(
      `check-ci-job-lists: \`validate-exports.mjs\` is invoked with no package ` +
        `arguments. With no filter it validates EVERY package, including ones CI ` +
        `never builds, so this is almost certainly an accident. If it is not, ` +
        `delete the export-validation check from scripts/check-ci-job-lists.cjs.`
    );
  }
  return args;
}

/**
 * The `npm run typecheck --prefix packages/<dir>` lines of `lint-typecheck`.
 *
 * These live inside a `run: |` block, so they are bare commands, not `run:`
 * steps. Requiring `typecheck` to be followed by whitespace is what keeps the
 * separate `typecheck:scripts` step from being read as a 12th package.
 */
function loadTypecheckDirs(text) {
  const body = requireJob(readCi(text), 'lint-typecheck');
  const dirs = [];
  const pattern = /^[ \t]*npm run typecheck[ \t]+--prefix[ \t]+packages\/([A-Za-z0-9-]+)[ \t]*$/gm;
  let m;
  while ((m = pattern.exec(body)) !== null) dirs.push(m[1]);

  if (dirs.length === 0) {
    throw new Error(
      `check-ci-job-lists: the "lint-typecheck" job has no ` +
        `\`npm run typecheck --prefix packages/<dir>\` lines. Either typechecking ` +
        `moved (to a workspaces run, a matrix, or a script) — in which case ` +
        `update loadTypecheckDirs() in scripts/check-ci-job-lists.cjs — or CI ` +
        `stopped typechecking entirely.`
    );
  }
  return dirs;
}

/**
 * The nightly `coverage` job's two step families.
 *
 * generate: any run line naming a package AND mentioning coverage — the job
 *   uses two spellings (`npm run test:coverage --prefix x` and
 *   `npm test --prefix x -- --coverage`) and both are legitimate.
 * upload:   codecov-action `with:` blocks, paired by scanning forward from each
 *   `files: packages/<dir>/coverage/lcov.info` to its `flags:`.
 */
function loadCoverageSteps(text) {
  const body = requireJob(readCi(text), 'coverage');

  const generates = [];
  const genPattern = /^[ \t]*run:[ \t]*([^\n]*--prefix[ \t]+packages\/([A-Za-z0-9-]+)[^\n]*)$/gm;
  let m;
  while ((m = genPattern.exec(body)) !== null) {
    if (!/coverage/.test(m[1])) continue;
    generates.push({ dir: m[2], command: m[1].trim() });
  }

  const uploads = [];
  const filesPattern =
    /^[ \t]*files:[ \t]*packages\/([A-Za-z0-9-]+)\/coverage\/lcov\.info[ \t]*$/gm;
  while ((m = filesPattern.exec(body)) !== null) {
    const after = body.slice(m.index + m[0].length);
    const flagMatch = /^[ \t]*flags:[ \t]*([A-Za-z0-9_-]+)[ \t]*$/m.exec(after);
    uploads.push({ dir: m[1], flag: flagMatch ? flagMatch[1] : null });
  }

  if (generates.length === 0 || uploads.length === 0) {
    throw new Error(
      `check-ci-job-lists: the "coverage" job has ${generates.length} coverage ` +
        `run steps and ${uploads.length} Codecov upload steps; both must be ` +
        `non-empty. Its step shape changed — update loadCoverageSteps() in ` +
        `scripts/check-ci-job-lists.cjs.`
    );
  }
  return { generates, uploads };
}

/**
 * codecov.yml's declared flags, with the `paths:` each claims.
 *
 * Regex, not a YAML parser, for the same reason as the sibling guards: the
 * shape is fixed and a parser plus its dependency would outweigh the thing it
 * guards. The `flags:` block ends at the next column-0 key.
 */
function loadCodecovFlags(text) {
  if (text === undefined) {
    try {
      text = fs.readFileSync(CODECOV_CONFIG, 'utf8');
    } catch (err) {
      throw new Error(`check-ci-job-lists: cannot read ${CODECOV_CONFIG}: ${err.message}`);
    }
  }

  const start = /^flags:[ \t]*$/m.exec(text);
  if (!start) {
    throw new Error(
      `check-ci-job-lists: codecov.yml has no top-level \`flags:\` block. Every ` +
        `flag the coverage job uploads needs one (for \`paths:\` and ` +
        `\`carryforward\`); if flags were abandoned, delete the coverage check ` +
        `from scripts/check-ci-job-lists.cjs.`
    );
  }

  const rest = text.slice(start.index + start[0].length);
  const nextTop = /^[A-Za-z0-9_-]+:/m.exec(rest);
  const block = nextTop ? rest.slice(0, nextTop.index) : rest;

  const flags = new Map();
  const flagPattern = /^ {2}([A-Za-z0-9_-]+):[ \t]*$/gm;
  let m;
  while ((m = flagPattern.exec(block)) !== null) {
    const flagName = m[1];
    const after = block.slice(m.index + m[0].length);
    const end = /^ {2}[A-Za-z0-9_-]+:[ \t]*$/m.exec(after);
    const flagBody = end ? after.slice(0, end.index) : after;

    const paths = [];
    const pathPattern = /^[ \t]*-[ \t]*(\S+)[ \t]*$/gm;
    let p;
    while ((p = pathPattern.exec(flagBody)) !== null) paths.push(p[1]);

    flags.set(flagName, { paths, carryforward: /carryforward:[ \t]*true/.test(flagBody) });
  }
  return flags;
}

/** The domain suffixes of the root `lint:domains` shell loop. */
function loadLintDomains(text) {
  if (text === undefined) {
    try {
      text = fs.readFileSync(ROOT_PACKAGE_JSON, 'utf8');
    } catch (err) {
      throw new Error(`check-ci-job-lists: cannot read ${ROOT_PACKAGE_JSON}: ${err.message}`);
    }
  }

  let script;
  try {
    script = (JSON.parse(text).scripts || {})['lint:domains'];
  } catch {
    throw new Error(`check-ci-job-lists: invalid JSON in ${ROOT_PACKAGE_JSON}`);
  }
  if (!script) {
    throw new Error(
      `check-ci-job-lists: the root package.json has no "lint:domains" script. ` +
        `If it was renamed or removed, update loadLintDomains() in ` +
        `scripts/check-ci-job-lists.cjs.`
    );
  }

  const m = /for\s+pkg\s+in\s+([^;]+);/.exec(script);
  if (!m || !/packages\/domain-\$pkg/.test(script)) {
    throw new Error(
      `check-ci-job-lists: cannot parse "lint:domains" — expected a ` +
        `\`for pkg in <suffixes>; do … packages/domain-$pkg …\` loop, got:\n` +
        `    ${script}\n` +
        `  Update loadLintDomains() in scripts/check-ci-job-lists.cjs to match.`
    );
  }

  return m[1].trim().split(/\s+/).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Checks — one function per list, each returning human-readable failures
// ---------------------------------------------------------------------------

/**
 * Shared stale-exemption sweep: an omission entry that no longer describes
 * reality is worse than none, because it reads as a considered decision.
 */
function checkStaleOmissions(listName, omissions, byDir, isEnumerated, qualifies) {
  const failures = [];
  for (const [dir, reason] of omissions) {
    const pkg = byDir.get(dir);
    if (!pkg) {
      failures.push(
        `INTENTIONAL_OMISSIONS["${listName}"] lists packages/${dir} ("${reason}"), but no ` +
          `such workspace package exists. Remove the entry from ` +
          `scripts/check-ci-job-lists.cjs.`
      );
      continue;
    }
    if (isEnumerated(dir)) {
      failures.push(
        `INTENTIONAL_OMISSIONS["${listName}"] lists packages/${dir} ("${reason}"), but the ` +
          `${listName} list now includes it. Remove the entry from ` +
          `scripts/check-ci-job-lists.cjs.`
      );
      continue;
    }
    if (!qualifies(dir, pkg)) {
      failures.push(
        `INTENTIONAL_OMISSIONS["${listName}"] lists packages/${dir} ("${reason}"), but ` +
          `${pkg.name} no longer qualifies for the ${listName} list anyway, so the ` +
          `exemption is doing nothing. Remove it from scripts/check-ci-job-lists.cjs.`
      );
    }
  }
  return failures;
}

/**
 * (1) export-validation.
 *
 * Qualifies = published, declares an entry point, and is built by the `build`
 * job. All three matter: the validator refuses private packages outright, has
 * nothing to check without an entry-point field, and can only resolve paths
 * against a dist the build artifact actually carries.
 */
function checkExportValidation(byDir, builtInCi, args, omissions) {
  const failures = [];
  const qualifies = (dir, pkg) =>
    !pkg.isPrivate && pkg.hasEntryPoint && builtInCi.has(dir) && !omissions.has(dir);

  const seen = new Set();
  for (const dir of args) {
    if (seen.has(dir)) {
      failures.push(
        `export-validation passes packages/${dir} to validate-exports.mjs twice. ` +
          `Remove the duplicate argument from .github/workflows/ci.yml.`
      );
      continue;
    }
    seen.add(dir);

    const pkg = byDir.get(dir);
    if (!pkg) {
      failures.push(
        `export-validation passes "${dir}" to validate-exports.mjs, but no such ` +
          `workspace package exists. The validator filters its package list by ` +
          `name, so an unmatched argument validates NOTHING and the job still ` +
          `passes. Remove it from .github/workflows/ci.yml.`
      );
      continue;
    }
    if (pkg.isPrivate) {
      failures.push(
        `export-validation passes packages/${dir} to validate-exports.mjs, but ` +
          `${pkg.name} is private — the validator prints "[SKIP] ${dir}: Private ` +
          `package" and checks nothing, so the argument is a silent no-op. Drop ` +
          `the argument, or drop "private": true if the package is meant to ship.`
      );
      continue;
    }
    if (!pkg.hasEntryPoint) {
      failures.push(
        `export-validation passes packages/${dir} to validate-exports.mjs, but ` +
          `${pkg.name} declares none of ${ENTRY_POINT_FIELDS.join('/')}, so there is ` +
          `nothing to validate. Remove the argument from .github/workflows/ci.yml.`
      );
      continue;
    }
    if (!builtInCi.has(dir)) {
      failures.push(
        `export-validation passes packages/${dir} to validate-exports.mjs, but the ` +
          `\`build\` job never builds it, so no dist/ reaches the job's artifact and ` +
          `every declared export reads as missing. Either add a build step, or ` +
          `remove the argument from .github/workflows/ci.yml.`
      );
    }
  }

  for (const [dir, pkg] of byDir) {
    if (!qualifies(dir, pkg)) continue;
    if (seen.has(dir)) continue;
    failures.push(
      `${pkg.name} (packages/${dir}) is published, declares an entry point, and is ` +
        `built in CI, but is NOT passed to validate-exports.mjs — so it can ship ` +
        `with a dangling "exports" path and no gate will notice. Add "${dir}" to ` +
        `the argument list in the "Validate all package exports" step of ` +
        `.github/workflows/ci.yml. If skipping is deliberate, add it to ` +
        `INTENTIONAL_OMISSIONS["export-validation"] with a reason.`
    );
  }

  failures.push(
    ...checkStaleOmissions(
      'export-validation',
      omissions,
      byDir,
      dir => seen.has(dir),
      (dir, pkg) => !pkg.isPrivate && pkg.hasEntryPoint && builtInCi.has(dir)
    )
  );

  return failures;
}

/** (2) lint-typecheck. Qualifies = declares a `typecheck` script. Nothing else. */
function checkTypecheck(byDir, dirs, omissions) {
  const failures = [];
  const seen = new Set();

  for (const dir of dirs) {
    if (seen.has(dir)) {
      failures.push(
        `lint-typecheck runs \`npm run typecheck --prefix packages/${dir}\` twice. ` +
          `tsc is not free; remove the duplicate line from .github/workflows/ci.yml.`
      );
      continue;
    }
    seen.add(dir);

    const pkg = byDir.get(dir);
    if (!pkg) {
      failures.push(
        `lint-typecheck runs \`npm run typecheck --prefix packages/${dir}\`, but no ` +
          `such workspace package exists — the step dies on an ENOENT and fails ` +
          `the job. Remove the line from .github/workflows/ci.yml.`
      );
      continue;
    }
    if (!pkg.hasTypecheck) {
      failures.push(
        `lint-typecheck runs \`npm run typecheck --prefix packages/${dir}\`, but ` +
          `${pkg.name} has no "typecheck" script. Add one to ` +
          `packages/${dir}/package.json, or drop the line.`
      );
    }
  }

  for (const [dir, pkg] of byDir) {
    if (!pkg.hasTypecheck) continue;
    if (seen.has(dir)) continue;
    if (omissions.has(dir)) continue;
    failures.push(
      `${pkg.name} (packages/${dir}) has a "typecheck" script that CI never runs, ` +
        `so a type error there stays green forever. Add to the "Typecheck all ` +
        `packages" step of .github/workflows/ci.yml:\n` +
        `          npm run typecheck --prefix packages/${dir}\n` +
        `    If the package needs a codegen step first, give it a "pretypecheck" ` +
        `hook (packages/behaviors does — its src/generated/ is gitignored, so a ` +
        `clean checkout has none). If skipping is deliberate, add it to ` +
        `INTENTIONAL_OMISSIONS["typecheck"] with a reason.`
    );
  }

  failures.push(
    ...checkStaleOmissions(
      'typecheck',
      omissions,
      byDir,
      dir => seen.has(dir),
      (dir, pkg) => pkg.hasTypecheck
    )
  );

  return failures;
}

/**
 * (3) coverage ⇔ codecov.yml.
 *
 * No "every package with coverage must be here" rule: the nightly is a
 * reporting job, not a gate, and which packages it reports on is an editorial
 * choice. What is NOT editorial is that the two files agree — codecov.yml's
 * `carryforward: true` means a flag that stops being uploaded silently serves
 * its last report forever, which reads as coverage rather than absence.
 */
function checkCoverage(byDir, coverage, codecovFlags) {
  const failures = [];
  const generatedDirs = new Set(coverage.generates.map(step => step.dir));
  const uploadedDirs = new Set(coverage.uploads.map(step => step.dir));

  for (const { dir, command } of coverage.generates) {
    const pkg = byDir.get(dir);
    if (!pkg) {
      failures.push(
        `the coverage job runs \`${command}\`, but packages/${dir} does not exist. ` +
          `Remove the step from .github/workflows/ci.yml.`
      );
      continue;
    }
    if (!pkg.hasTest) {
      failures.push(
        `the coverage job generates coverage for packages/${dir}, but ${pkg.name} ` +
          `has no "test" script to generate it from.`
      );
    }
    if (!uploadedDirs.has(dir)) {
      failures.push(
        `the coverage job generates coverage for packages/${dir} but never uploads ` +
          `it — the run pays for the instrumented suite and throws the report ` +
          `away. Add a codecov-action step with ` +
          `\`files: packages/${dir}/coverage/lcov.info\`, or drop the generate step.`
      );
    }
  }

  for (const { dir, flag } of coverage.uploads) {
    if (!generatedDirs.has(dir)) {
      failures.push(
        `the coverage job uploads packages/${dir}/coverage/lcov.info but never ` +
          `generates it, so the upload sends a stale or absent report. Add a ` +
          `coverage run step for packages/${dir}, or drop the upload.`
      );
    }
    if (flag === null) {
      failures.push(
        `the coverage job uploads packages/${dir}/coverage/lcov.info with no ` +
          `\`flags:\` key, so its lines land in the unflagged default and cannot be ` +
          `attributed. Add \`flags: ${dir}\`.`
      );
      continue;
    }
    if (flag !== dir) {
      failures.push(
        `the coverage job uploads packages/${dir}/coverage/lcov.info under flag ` +
          `"${flag}". Flags are named after their package here, and codecov.yml ` +
          `maps each flag to \`packages/<flag>/src/**\` — a mismatch silently ` +
          `attributes one package's lines to another. Use \`flags: ${dir}\`.`
      );
      continue;
    }
    if (!codecovFlags.has(flag)) {
      failures.push(
        `the coverage job uploads flag "${flag}", which codecov.yml never declares ` +
          `— so it gets no \`paths:\` and no \`carryforward\`, and behaves ` +
          `differently from every declared flag. Add to codecov.yml:\n` +
          `  ${flag}:\n` +
          `    paths:\n` +
          `      - packages/${dir}/src/**\n` +
          `    carryforward: true`
      );
    }
  }

  for (const [flag, spec] of codecovFlags) {
    if (!uploadedDirs.has(flag)) {
      failures.push(
        `codecov.yml declares flag "${flag}", but the coverage job never uploads ` +
          `it. With \`carryforward: ${spec.carryforward}\` Codecov keeps serving the ` +
          `last report this flag ever received, so the number looks live while ` +
          `nothing measures it. Add the generate+upload pair to the coverage job, ` +
          `or remove the flag from codecov.yml.`
      );
      continue;
    }
    const expected = `packages/${flag}/src/**`;
    if (spec.paths.length > 0 && !spec.paths.includes(expected)) {
      failures.push(
        `codecov.yml's "${flag}" flag claims paths [${spec.paths.join(', ')}], which ` +
          `does not include ${expected} — the flag and the package it is uploaded ` +
          `from disagree about what it covers.`
      );
    }
  }

  return failures;
}

/**
 * (4) root `lint:domains`.
 *
 * Qualifies = a `packages/domain-*` package that owns a `lint.test.ts`. The
 * loop is local-only (ci.yml deliberately does not run it — the unit-test job
 * already executes each domain's lint suite as part of its vitest run), so
 * drift here costs a local convenience gate, not a CI one.
 */
function checkLintDomains(byDir, suffixes, omissions) {
  const failures = [];
  const seen = new Set();

  for (const suffix of suffixes) {
    const dir = `domain-${suffix}`;
    if (seen.has(suffix)) {
      failures.push(`the root "lint:domains" loop lists "${suffix}" twice. Remove the duplicate.`);
      continue;
    }
    seen.add(suffix);

    const pkg = byDir.get(dir);
    if (!pkg) {
      failures.push(
        `the root "lint:domains" loop lists "${suffix}", but packages/${dir} does ` +
          `not exist — the loop exits 1 on a healthy tree. Remove it from the ` +
          `"lint:domains" script in package.json.`
      );
      continue;
    }
    if (!pkg.hasLintSuite) {
      failures.push(
        `the root "lint:domains" loop lists "${suffix}", but packages/${dir} has no ` +
          `lint.test.ts under src/ — \`vitest --run lint\` matches no test file ` +
          `there. Remove it from the "lint:domains" script in package.json.`
      );
    }
  }

  for (const [dir, pkg] of byDir) {
    if (!pkg.hasLintSuite) continue;
    const suffix = dir.slice('domain-'.length);
    if (seen.has(suffix)) continue;
    if (omissions.has(dir)) continue;
    failures.push(
      `${pkg.name} (packages/${dir}) owns a lint.test.ts but is not in the root ` +
        `"lint:domains" loop, so \`npm run lint:domains\` silently skips it. Add ` +
        `"${suffix}" to the \`for pkg in …\` list in package.json. If skipping is ` +
        `deliberate, add "${dir}" to INTENTIONAL_OMISSIONS["lint:domains"] with a ` +
        `reason.`
    );
  }

  failures.push(
    ...checkStaleOmissions(
      'lint:domains',
      omissions,
      byDir,
      dir => seen.has(dir.slice('domain-'.length)),
      (dir, pkg) => pkg.hasLintSuite
    )
  );

  return failures;
}

/**
 * Run all four. Returns Map<listName, failures[]> so the reporter can group by
 * list — four independent questions should not read as one undifferentiated
 * wall of text.
 */
function check(input, omissions = INTENTIONAL_OMISSIONS) {
  const { byDir, builtInCi, exportArgs, typecheckDirs, coverage, codecovFlags, lintDomains } =
    input;

  return new Map([
    [
      'export-validation',
      checkExportValidation(
        byDir,
        builtInCi,
        exportArgs,
        omissions['export-validation'] ?? new Map()
      ),
    ],
    ['typecheck', checkTypecheck(byDir, typecheckDirs, omissions.typecheck ?? new Map())],
    ['coverage', checkCoverage(byDir, coverage, codecovFlags)],
    ['lint:domains', checkLintDomains(byDir, lintDomains, omissions['lint:domains'] ?? new Map())],
  ]);
}

function loadAll() {
  const ci = readCi();
  return {
    byDir: loadWorkspaces(),
    builtInCi: loadCiBuiltPackages(ci),
    exportArgs: loadExportValidationArgs(ci),
    typecheckDirs: loadTypecheckDirs(ci),
    coverage: loadCoverageSteps(ci),
    codecovFlags: loadCodecovFlags(),
    lintDomains: loadLintDomains(),
  };
}

function main() {
  let input;
  try {
    input = loadAll();
  } catch (err) {
    process.stderr.write(`check-ci-job-lists: FAIL\n\n  • ${err.message}\n\n`);
    process.exit(1);
  }

  const byList = check(input);
  const total = [...byList.values()].reduce((n, f) => n + f.length, 0);

  if (total === 0) {
    // Keep success output minimal so the pre-commit hook feels invisible.
    process.stdout.write(
      `check-ci-job-lists: OK (${input.exportArgs.length} export-validated, ` +
        `${input.typecheckDirs.length} typechecked, ${input.codecovFlags.size} coverage flags, ` +
        `${input.lintDomains.length} lint domains)\n`
    );
    process.exit(0);
  }

  process.stderr.write('check-ci-job-lists: FAIL\n\n');
  for (const [listName, failures] of byList) {
    if (failures.length === 0) continue;
    process.stderr.write(`── ${listName} (${failures.length}) ──\n\n`);
    for (const msg of failures) process.stderr.write(`  • ${msg}\n\n`);
  }
  process.exit(1);
}

if (require.main === module) {
  main();
}

// Export for tests.
module.exports = {
  ENTRY_POINT_FIELDS,
  INTENTIONAL_OMISSIONS,
  check,
  checkCoverage,
  checkExportValidation,
  checkLintDomains,
  checkTypecheck,
  joinContinuedLine,
  loadAll,
  loadCiBuiltPackages,
  loadCodecovFlags,
  loadCoverageSteps,
  loadExportValidationArgs,
  loadLintDomains,
  loadTypecheckDirs,
  loadWorkspaces,
};
