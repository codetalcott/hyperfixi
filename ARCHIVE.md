# Archive

Retired code is tagged, then deleted. Each row names the annotated tag that
preserves the last tree containing it — `git checkout <tag> -- <path>` (or
`git show <tag>:<path>`) recovers anything below without bisecting history.

Pattern:

```bash
git tag -a archived/<slug> -m "<what it was, why, date>" HEAD
git rm -r <paths>
# then append a row here
```

| What                                                    | Tag                                    | Why                                                                                                              | Date       |
| ------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| `packages/patterns-reference` embeddings spike          | `parked/patterns-reference-embeddings` | Parked, not retired — semantic-search experiment awaiting a consumer                                             | 2026-05    |
| `packages/lokascript-python` + `clients/python-client`  | `archived/python-surfaces`             | Python port + protocol client; not workspace members, built/tested by nothing, cold since 2026-02                | 2026-08-07 |
| 8 superseded `docs-internal/` docs + root `PROGRESS.md` | `archived/docs-2026h1`                 | Stale plans/status docs with no forward value (list in tag message); live docs moved to `docs-internal/archive/` | 2026-08-07 |
