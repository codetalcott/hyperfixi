# Client SDKs (Internal)

Reference client implementations for the LokaScript compilation service API.
These are **not published packages** — they exist to validate API compatibility
across Go, JavaScript, and Python backends during development.

| Client           | Framework integrations | Status         |
| ---------------- | ---------------------- | -------------- |
| `go-client/`     | Gin                    | Reference impl |
| `js-client/`     | Express, Elysia        | Reference impl |
| `python-client/` | Django, FastAPI, Flask | Reference impl |

## Known limitations

- Python client uses Pydantic v1 API despite requiring v2
- Python `*_sync` methods use `asyncio.run()` (incompatible with async contexts)
- No Python tests
- Express middleware `res.send` override is async-unsafe

These will be addressed if/when the clients are promoted to published packages.
