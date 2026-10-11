# 04: Overlap rules

**What to build:** The overlap check follows the business rules: back-to-back is allowed, cancelled appointments do not count, and a moved appointment gets the check too.

**Blocked by:** 02 Appointments API as a layered module

**Status:** done

- [x] A booking that starts at the instant another appointment of the same customer ends returns 201
- [x] The characterization test that records the back-to-back bug changes in its own commit, and `NOTES.md` says so
- [x] A booking that overlaps only a cancelled appointment returns 201, for both status spellings
- [x] A `PATCH` of `startsAt` that causes an overlap returns 409; the appointment does not overlap itself
- [x] Each of the three fixes is its own `fix` commit with a test that fails before the fix

## Comments

**From the history check (2026-10-11).** A clone ran the tests of each `fix` commit at the commit and on its parent. `b59a55a`, `9789048` and `51ff104` are green at the commit and red on the parent.
