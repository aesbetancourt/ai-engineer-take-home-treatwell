# 05: Status rules

**What to build:** Cancelling is final, and a legacy appointment shows the status `cancelled`.

**Blocked by:** 02 Appointments API as a layered module

**Status:** ready-for-agent

- [ ] A `PATCH` that changes the status of a cancelled appointment returns 409
- [ ] A `PATCH` that sets `cancelled` on a cancelled appointment returns 200 and changes nothing
- [ ] Notes stay editable on a cancelled appointment
- [ ] All other status changes stay allowed
- [ ] Each read returns `cancelled` for a stored `canceled`
- [ ] The summary counts both spellings under `cancelled`
- [ ] Each fix is its own `fix` commit with a test that fails before the fix
