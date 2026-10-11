# 11: Hardening

**What to build:** Three small changes that the production model needs.

**Blocked by:** 02 Appointments API as a layered module

**Status:** done

- [x] No log line prints an appointment request body
- [x] The API closes the server and exits when it gets `SIGTERM`
- [x] `GET /health` returns 200 without the API key
- [ ] Each change is its own commit

## Comments

**From the history check (2026-10-11).** The last criterion stays open, because it is not true. `GET /health` is `600396b` and the `SIGTERM` stop is `72f0820` (its test is red on the parent). The log line that printed the request body left with the refactor commit `94a22e4`, not in a commit of its own. `NOTES.md` says so.
