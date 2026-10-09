# 07: No double-booking across replicas

**What to build:** Two API processes that share one database cannot both accept the same booking for one customer.

**Blocked by:** 02 Appointments API as a layered module

**Status:** ready-for-agent

- [ ] The overlap check and the insert run in one synchronous immediate transaction
- [ ] The price is inserted with the appointment in one statement
- [ ] No in-memory lock remains
- [ ] The database connection sets a busy timeout and WAL mode
- [ ] The test helper can start a second server on an existing database
- [ ] A test starts two API processes on one database and sends the same booking to both at the same time: one 201, one 409, no 500
- [ ] The fix is its own `fix` commit; the test fails before it
