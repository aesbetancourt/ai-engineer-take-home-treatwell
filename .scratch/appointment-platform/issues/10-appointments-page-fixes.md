# 10: Appointments page fixes

**What to build:** The appointments page tells the truth: a rejected booking shows as rejected, the cancelled filter works, and times are in venue time.

**Blocked by:** 03 Appointments web through the contract

**Status:** ready-for-agent

- [ ] Each appointment BFF handler forwards the status code of the API
- [ ] The BFF returns the error body shape of the contract when the API fails
- [ ] The create form shows the error and stays open when the API rejects the booking
- [ ] The status filter sends `cancelled`
- [ ] Times are entered and shown in venue time (Europe/Berlin), not browser time
- [ ] Each of the four fixes is its own `fix` commit
