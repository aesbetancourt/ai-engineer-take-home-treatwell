# 03: Appointments web through the contract

**What to build:** The appointment pages and their BFF handlers use the shared contract. One server-only API client calls the API. The Overview page gets the summary through a BFF route. What the user sees does not change.

**Blocked by:** 01 Contract package and typed errors

**Status:** done

- [x] Only the server-only API client calls the API; no page calls it directly
- [x] The API URL and the API key come from server-only environment variables; no `NEXT_PUBLIC` key remains
- [x] The appointment pages and the Overview take their types from the contract; no `any` remains in them
- [x] The BFF still returns 200 for each API response (ticket 10 changes this)
- [x] The customers and treatments pages are unchanged
- [x] `yarn dev` works and the four pages load

## Comments

**From the history check (2026-10-11).** `yarn test` is green in a clone at `211698d`, `10b25d9`, `7e7e048` and `1444bb1`. No automated test covers the pages.
