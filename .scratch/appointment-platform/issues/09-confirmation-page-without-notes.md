# 09: Confirmation page without notes

**What to build:** The customer-facing confirmation page gets only what a customer can see. Notes, email and phone do not reach the browser.

**Blocked by:** 03 Appointments web through the contract

**Status:** done

- [x] The contract has a public appointment schema with no `notes`, no customer email and no customer phone
- [x] A separate BFF route serves the confirmation page and parses the API response with that schema
- [x] The response of that route contains none of the three fields
- [x] The API response is unchanged
- [x] `NOTES.md` states that sequential ids still let anyone read a booking
- [x] The fix is its own `fix` commit

## Comments

**From the history check (2026-10-11).** A clone ran the tests of each `fix` commit at the commit and on its parent. `3db5d44` is green at the commit and red on the parent. The test covers the contract schema; no automated test covers the BFF route.
