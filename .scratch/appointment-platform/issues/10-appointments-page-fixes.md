# 10: Appointments page fixes

**What to build:** The appointments page tells the truth: a rejected booking shows as rejected, the cancelled filter works, and times are in venue time.

**Blocked by:** 03 Appointments web through the contract

**Status:** done, not committed

- [x] Each appointment BFF handler forwards the status code of the API
- [x] The BFF returns the error body shape of the contract when the API fails
- [x] The create form shows the error and stays open when the API rejects the booking
- [x] The status filter sends `cancelled`
- [x] Times are entered and shown in venue time (Europe/Berlin), not browser time
- [ ] Each of the four fixes is its own `fix` commit

## Comments

**From ticket 03.** The BFF handlers do not parse input with the contract schemas yet. A BFF that rejects a body must return 400, and ticket 03 had to keep the BFF at "always 200". Add the input parse here, together with the status forwarding: parse the body of `POST` and `PATCH` with the contract schema, and return 400 with the contract error body when it fails.

