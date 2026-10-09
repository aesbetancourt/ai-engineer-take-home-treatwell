# 09: Confirmation page without notes

**What to build:** The customer-facing confirmation page gets only what a customer can see. Notes, email and phone do not reach the browser.

**Blocked by:** 03 Appointments web through the contract

**Status:** done, not committed

- [x] The contract has a public appointment schema with no `notes`, no customer email and no customer phone
- [x] A separate BFF route serves the confirmation page and parses the API response with that schema
- [x] The response of that route contains none of the three fields
- [x] The API response is unchanged
- [x] `NOTES.md` states that sequential ids still let anyone read a booking
- [ ] The fix is its own `fix` commit
