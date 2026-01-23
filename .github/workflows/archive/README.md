# Archived Workflows

These workflows were consolidated into the main `ci.yml` workflow on 2026-01-23 to:

- Reduce duplication (workflows shared ~60% of steps)
- Improve build efficiency (build once, share artifacts)
- Simplify maintenance (single source of truth)
- Reduce total CI time by ~40%

## Archived Files

### test.yml

**Reason**: Merged into `ci.yml`
**What it did**:

- Unit tests with coverage
- Multilingual validation tests
- Browser tests (Playwright)

**Where it went**: All functionality moved to `ci.yml` jobs:

- `unit-tests` job (Node 18, 20, 22 matrix)
- `coverage` job
- `multilingual-validation` job
- `browser-tests` job

### semantic.yml

**Reason**: Merged into `ci.yml`
**What it did**:

- Package-specific CI for semantic package
- Benchmarks on main branch

**Where it went**:

- Tests now run in main `unit-tests` job (always, not path-conditional)
- Benchmarks moved to `benchmarks` job in `ci.yml`

### patterns-reference.yml

**Reason**: Merged into `ci.yml`
**What it did**:

- Package-specific CI for patterns-reference
- Validation tests

**Where it went**:

- Tests now run in main `unit-tests` job
- Validation runs in `multilingual-validation` job

### benchmark.yml

**Reason**: Merged into `ci.yml`
**What it did**:

- Performance benchmarks
- Bundle size analysis

**Where it went**:

- Bundle size analysis: `bundle-size` job in `ci.yml`
- Performance benchmarks: `benchmarks` job in `ci.yml` (main branch only)

## Migration Benefits

**Before consolidation:**

- 7 separate workflow files
- 16 total jobs across all workflows
- Each job rebuilt packages independently
- ~25-35 minutes total CI time
- 60% duplication between ci.yml and test.yml

**After consolidation:**

- 3 workflow files (ci.yml, publish.yml, pre-publish-check.yml)
- 8 jobs in main CI workflow
- Single build job, artifacts shared across all jobs
- ~15-20 minutes total CI time (40% reduction)
- Zero duplication

## Restoring Old Workflows

If you need to restore these workflows, they're available in git history or can be reactivated by:

1. Moving file back: `mv .github/workflows/archive/test.yml .github/workflows/`
2. Renaming to avoid conflicts with consolidated ci.yml
3. Removing the jobs that are now in ci.yml to avoid duplication

## See Also

- [WORKFLOW_ANALYSIS.md](../../../WORKFLOW_ANALYSIS.md) - Full analysis and rationale
- [.github/workflows/ci.yml](../ci.yml) - Consolidated workflow
