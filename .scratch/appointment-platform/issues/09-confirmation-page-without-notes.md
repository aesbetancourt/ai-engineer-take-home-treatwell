# 09: Confirmation page without notes

**What to build:** The customer-facing confirmation page gets only what a customer can see. Notes, email and phone do not reach the browser.

**Blocked by:** 03 Appointments web through the contract

**Status:** ready-for-agent

- [ ] The contract has a public appointment schema with no `notes`, no customer email and no customer phone
- [ ] A separate BFF route serves the confirmation page and parses the API response with that schema
- [ ] The response of that route contains none of the three fields
- [ ] The API response is unchanged
- [ ] `NOTES.md` states that sequential ids still let anyone read a booking
- [ ] The fix is its own `fix` commit
