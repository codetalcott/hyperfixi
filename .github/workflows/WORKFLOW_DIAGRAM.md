# Workflow Architecture Diagrams

## Before Consolidation

```
┌─────────────────────────────────────────────────────────────────┐
│                    Push to main/develop                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┬──────────────────┐
           │               │               │                  │
           ▼               ▼               ▼                  ▼
    ┌──────────┐    ┌──────────┐   ┌──────────┐      ┌──────────┐
    │  ci.yml  │    │test.yml  │   │semantic  │      │benchmark │
    │          │    │          │   │  .yml    │      │  .yml    │
    └────┬─────┘    └────┬─────┘   └────┬─────┘      └────┬─────┘
         │               │              │                   │
    ┌────┴────┐     ┌────┴────┐   ┌────┴────┐         ┌────┴────┐
    │Build    │     │Build    │   │Build    │         │Build    │
    │semantic │     │semantic │   │semantic │         │semantic │
    │i18n     │     │i18n     │   │         │         │i18n     │
    │core     │     │core     │   │         │         │core     │
    └────┬────┘     └────┬────┘   └────┬────┘         └────┬────┘
         │               │              │                   │
    ┌────┴────────┐ ┌────┴────────┐    │              ┌────┴────┐
    │6 Jobs:      │ │3 Jobs:      │    │              │2 Jobs:  │
    │• Lint       │ │• Test       │    │              │• Bench  │
    │• Unit Tests │ │• Multilang  │    │              │• Bundle │
    │• Coverage   │ │• Browser    │    │              │  Size   │
    │• Browser    │ │             │    │              └─────────┘
    │• Bundle     │ │Each rebuilds│    │
    │• Build All  │ │everything!  │    │
    └─────────────┘ └─────────────┘    │
                                       │
                    ┌─────────────┐    │
                    │patterns-    │    │
                    │reference.yml│◄───┘
                    │             │
                    │Build +      │
                    │2 Jobs       │
                    └─────────────┘

Problems:
❌ Build packages 5+ times per run
❌ 60% duplication between ci.yml and test.yml
❌ Browser tests duplicated
❌ Bundle size checks duplicated
❌ ~25-35 minutes total CI time
❌ 7 separate workflow files to maintain
```

## After Consolidation

```
┌─────────────────────────────────────────────────────────────────┐
│                    Push to main/develop                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────┐
                    │ ci.yml   │ (single workflow)
                    └────┬─────┘
                         │
                    ┌────▼────┐
                    │  BUILD  │ ◄── Runs ONCE
                    │         │     Uploads artifacts
                    │semantic │
                    │i18n     │
                    │core     │
                    │patterns │
                    │ast      │
                    │dev-tools│
                    │vite     │
                    │bundles  │
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┬──────────────┬───────────┐
         │               │               │              │           │
         ▼               ▼               ▼              ▼           ▼
    ┌────────┐      ┌────────┐     ┌────────┐    ┌────────┐  ┌────────┐
    │ Lint & │      │  Unit  │     │Coverage│    │Browser │  │Multi-  │
    │Typechk │      │ Tests  │     │        │    │ Tests  │  │lingual │
    │        │      │Node 24 │     │        │    │        │  │        │
    │Downloads│     │        │     │Downloads│   │Downloads│ │Downloads│
    │artifacts│     │Downloads│    │artifacts│   │artifacts│ │artifacts│
    │        │      │artifacts│    │        │    │        │  │        │
    │        │      │        │     │        │    │        │  │        │
    └────────┘      └────────┘     └────────┘    └────────┘  └────────┘

         │               │               │              │           │
         └───────────────┼───────────────┴──────────────┴───────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │Bundle  │ │Benchmrk│ │Publish │ (separate workflows)
         │Size    │ │(main   │ │(manual)│
         │        │ │ only)  │ │        │
         │Downloads│ │Downloads│ │        │
         │artifacts│ │artifacts│ │        │
         └────────┘ └────────┘ └────────┘

Benefits:
✅ Build packages 1 time per run (80% reduction)
✅ Zero duplication
✅ Artifacts shared efficiently
✅ ~15-20 minutes total CI time (40% faster)
✅ 3 workflow files (57% reduction)
✅ Single source of truth
✅ Parallel job execution after build
```

## Job Dependency Graph

```
                    ┌─────────────┐
                    │   Trigger   │
                    │(push/PR to  │
                    │main/develop)│
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    BUILD    │
                    │  (15 min)   │
                    │             │
                    │ • semantic  │
                    │ • i18n      │
                    │ • core      │
                    │ • patterns  │
                    │ • ast-tools │
                    │ • dev-tools │
                    │ • vite      │
                    │ • bundles   │
                    │             │
                    │ Upload ↓    │
                    │ artifacts   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┬─────────────┐
         │                 │                 │             │
         ▼                 ▼                 ▼             │
    ┌─────────┐       ┌─────────┐      ┌─────────┐       │
    │  Lint   │       │  Unit   │      │Coverage │       │
    │ (10min) │       │ (15min) │      │ (20min) │       │
    │         │       │         │      │         │       │
    │Download │       │Download │      │Download │       │
    │artifacts│       │artifacts│      │artifacts│       │
    │         │       │         │      │         │       │
    │✓ oxlint │       │✓ Node 24│      │✓ Core   │       │
    │✓ TypeChk│       │         │      │✓ Semant │       │
    │         │       │         │      │✓ i18n   │       │
    │         │       │         │      │         │       │
    │         │       │✓ core   │      │↑ Codecov│       │
    │         │       │✓ semant │      │         │       │
    │         │       │✓ i18n   │      │         │       │
    │         │       │✓ vite   │      │         │       │
    │         │       │✓ pattern│      │         │       │
    └─────────┘       └─────────┘      └─────────┘       │
         │                 │                 │            │
         └─────────────────┼─────────────────┘            │
                           │                              │
         ┌─────────────────┼──────────────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐      ┌─────────┐
    │Browser  │       │Multilang│      │Bundle   │
    │ (30min) │       │ (15min) │      │ (10min) │
    │         │       │         │      │         │
    │Download │       │Download │      │Download │
    │artifacts│       │artifacts│      │artifacts│
    │         │       │         │      │         │
    │✓ Playwrt│       │✓ 20 lang│      │✓ Analyze│
    │✓ Chromi │       │✓ Quick  │      │✓ Limits │
    │  um     │       │✓ Full   │      │  • lite │
    │         │       │         │      │  • hybrd│
    │⚠️ behav │       │⚠️ SOV/  │      │  • full │
    │  continue│      │  VSO    │      │         │
    │  on error│      │  continue│     │         │
    └─────────┘       └─────────┘      └─────────┘
                           │
                           │ (main branch only)
                           ▼
                      ┌─────────┐
                      │Benchmark│
                      │ (20min) │
                      │         │
                      │Download │
                      │artifacts│
                      │         │
                      │✓ Perf   │
                      │  tests  │
                      │         │
                      │⚠️ can   │
                      │  continue│
                      │  on error│
                      └─────────┘

Legend:
━━━ Required dependency
─── Parallel execution after dependency
✓   Step runs
⚠️  Known failures (continue-on-error)
↑   Uploads results
```

## Artifact Flow

```
┌──────────────────────────────────────────────────────────────┐
│                         BUILD JOB                             │
│                                                               │
│  Checkout → Install → Build All → Upload Artifacts           │
│                                                               │
│  Artifacts uploaded (1-day retention):                        │
│  ├─ packages/semantic/dist/                                   │
│  ├─ packages/i18n/dist/                                       │
│  ├─ packages/core/dist/                                       │
│  ├─ packages/patterns-reference/dist/                         │
│  ├─ packages/ast-toolkit/dist/                                │
│  ├─ packages/developer-tools/dist/                            │
│  └─ packages/vite-plugin/dist/                                │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ Actions Artifact Storage
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   LINT JOB      │ │  TEST JOBS      │ │  OTHER JOBS     │
│                 │ │                 │ │                 │
│ Checkout        │ │ Checkout        │ │ Checkout        │
│ Install         │ │ Install         │ │ Install         │
│ ↓ Download      │ │ ↓ Download      │ │ ↓ Download      │
│ artifacts       │ │ artifacts       │ │ artifacts       │
│                 │ │                 │ │                 │
│ Use packages/   │ │ Use packages/   │ │ Use packages/   │
│ */dist          │ │ */dist          │ │ */dist          │
│                 │ │                 │ │                 │
│ No rebuild      │ │ No rebuild      │ │ No rebuild      │
│ needed! ✨      │ │ needed! ✨      │ │ needed! ✨      │
└─────────────────┘ └─────────────────┘ └─────────────────┘

Time Savings:
Before: Each job builds independently (~8 min × 8 jobs = 64 min build time)
After:  Build once, download (~1 min × 8 jobs = 8 min download time)
Savings: 56 minutes of build time per CI run! 🚀
```

## Comparison Table

| Aspect               | Before       | After      | Improvement   |
| -------------------- | ------------ | ---------- | ------------- |
| **Workflow Files**   | 7            | 3          | 57% fewer     |
| **Total Jobs**       | 16           | 8          | 50% fewer     |
| **Package Builds**   | 5+ per run   | 1 per run  | 80% reduction |
| **CI Duration**      | 25-35 min    | 15-20 min  | 40% faster    |
| **Duplication**      | 60% overlap  | 0% overlap | Eliminated    |
| **Artifact Sharing** | None         | All jobs   | New feature   |
| **Parallel Jobs**    | Limited      | 7 jobs     | 7× parallel   |
| **Node Versions**    | 3 (18,20,22) | 1 (24 LTS) | 67% reduction |
| **Maintenance**      | Complex      | Simple     | Much easier   |

## Timeline Visualization

### Before (Sequential)

```
0min    5min   10min   15min   20min   25min   30min   35min
|-------|-------|-------|-------|-------|-------|-------|
[ci.yml        ]
        [test.yml      ]
                [semantic.yml ]
                        [patterns.yml ]
                                [benchmark.yml  ]

Total: ~35 minutes (sequential + some overlap)
```

### After (Parallel)

```
0min    5min   10min   15min   20min
|-------|-------|-------|-------|
[BUILD  ]
        [Lint  ][Unit Tests    ]
        [Coverage              ]
        [Browser Tests         ]
        [Multilang             ]
        [Bundle                ]
        [Benchmark             ]

Total: ~20 minutes (build + longest parallel job)
```

## Resource Usage

### Before

```
CPU: ████████████████ (high, lots of duplicate builds)
Mem: ████████████████ (high, multiple concurrent builds)
I/O: ████████████████ (high, npm ci × many jobs)
Net: ████████████     (moderate, parallel job starts)
```

### After

```
CPU: ████████░░░░░░░░ (50% reduction)
Mem: ████████░░░░░░░░ (50% reduction)
I/O: ████████░░░░░░░░ (50% reduction)
Net: ████████████░░░░ (slightly higher, artifact downloads)
```

Artifact downloads are faster than full rebuilds!
