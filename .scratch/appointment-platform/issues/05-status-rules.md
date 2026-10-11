# 05: Status rules

**What to build:** Cancelling is final, and a legacy appointment shows the status `cancelled`.

**Blocked by:** 02 Appointments API as a layered module

**Status:** done

- [x] A `PATCH` that changes the status of a cancelled appointment returns 409
- [x] A `PATCH` that sets `cancelled` on a cancelled appointment returns 200 and changes nothing
- [x] Notes stay editable on a cancelled appointment
- [x] All other status changes stay allowed
- [x] Each read returns `cancelled` for a stored `canceled`
- [x] The summary counts both spellings under `cancelled`
- [x] Each fix is its own `fix` commit with a test that fails before the fix

## Comments

**From the review of ticket 04.** A status-only `PATCH` from `cancelled` to `confirmed` gets no overlap check. After ticket 04, a booking can sit on the time of a cancelled appointment, so that `PATCH` double-books the customer. This ticket closes the hole, because a cancelled appointment cannot get another status. Add a test for exactly this case: book over a cancelled appointment, then try to confirm the cancelled one, and expect 409.

**From the history check (2026-10-11).** A clone ran the tests of each `fix` commit at the commit and on its parent. `50eb8c1` and `cb8665c` are green at the commit and red on the parent.
