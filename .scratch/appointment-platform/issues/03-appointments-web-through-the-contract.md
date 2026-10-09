# 03: Appointments web through the contract

**What to build:** The appointment pages and their BFF handlers use the shared contract. One server-only API client calls the API. The Overview page gets the summary through a BFF route. What the user sees does not change.

**Blocked by:** 01 Contract package and typed errors

**Status:** ready-for-agent

- [ ] Only the server-only API client calls the API; no page calls it directly
- [ ] The API URL and the API key come from server-only environment variables; no `NEXT_PUBLIC` key remains
- [ ] The appointment pages and the Overview take their types from the contract; no `any` remains in them
- [ ] The BFF still returns 200 for each API response (ticket 10 changes this)
- [ ] The customers and treatments pages are unchanged
- [ ] `yarn dev` works and the four pages load
