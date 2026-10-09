# 11: Hardening

**What to build:** Three small changes that the production model needs.

**Blocked by:** 02 Appointments API as a layered module

**Status:** ready-for-agent

- [ ] No log line prints an appointment request body
- [ ] The API closes the server and exits when it gets `SIGTERM`
- [ ] `GET /health` returns 200 without the API key
- [ ] Each change is its own commit
