# 07: No double-booking across replicas

**What to build:** Two API processes that share one database cannot both accept the same booking for one customer.

**Blocked by:** 02 Appointments API as a layered module

**Status:** done

- [x] The overlap check and the insert run in one synchronous immediate transaction
- [x] The price is inserted with the appointment in one statement
- [x] No in-memory lock remains
- [x] The database connection sets a busy timeout and WAL mode
- [x] A test helper starts several API processes on one database (a new helper outside the characterization folder)
- [x] A test starts two API processes on one database and sends the same booking to both at the same time: one 201, one 409, no 500
- [x] The fix is its own `fix` commit; the test fails before it

## Comments

**From the history check (2026-10-11).** A clone ran the tests of each `fix` commit at the commit and on its parent. `c138385` is green at the commit and red on the parent. The pragmas are in the `chore` commit `b1662b7`.
