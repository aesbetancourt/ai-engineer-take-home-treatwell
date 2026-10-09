# 04: Overlap rules

**What to build:** The overlap check follows the business rules: back-to-back is allowed, cancelled appointments do not count, and a moved appointment gets the check too.

**Blocked by:** 02 Appointments API as a layered module

**Status:** ready-for-agent

- [ ] A booking that starts at the instant another appointment of the same customer ends returns 201
- [ ] The characterization test that records the back-to-back bug changes in its own commit, and `NOTES.md` says so
- [ ] A booking that overlaps only a cancelled appointment returns 201, for both status spellings
- [ ] A `PATCH` of `startsAt` that causes an overlap returns 409; the appointment does not overlap itself
- [ ] Each of the three fixes is its own `fix` commit with a test that fails before the fix
