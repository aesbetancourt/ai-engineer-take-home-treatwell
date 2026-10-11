# 06: Start times in UTC

**What to build:** Each appointment has one UTC start time, whatever its stored format. A legacy appointment returns `startsAt` as UTC ISO, and its `endsAt` is correct. A new `startsAt` must name its zone. See ADR 0002.

**Blocked by:** 02 Appointments API as a layered module

**Status:** done

- [x] A virtual generated column holds the UTC start time, added by a generated migration that adds a column and an index and rebuilds no table
- [x] The generated SQL is read before the commit
- [x] The conversion uses the EU daylight-saving rule for venue time (Europe/Berlin)
- [x] A direct test against a temporary database covers a winter time, a summer time and both clock-change days
- [x] `endsAt`, the overlap check and the list order use the UTC start time (the reminder window moved to ticket 08)
- [x] A legacy appointment returns `startsAt` as UTC ISO; `createdAt` stays epoch milliseconds
- [x] A new `startsAt` with `Z` or an offset is stored as UTC ISO; one with an offset returns the same instant in UTC
- [x] A `startsAt` with no zone, date-only input included, returns 400
- [x] The legacy conversion and the strict input are separate `fix` commits, each with a test that fails before the fix

## Comments

**From the history check (2026-10-11).** A clone ran the tests of each `fix` commit at the commit and on its parent. `764fc15` and `12290e2` are green at the commit and red on the parent. The column is in the `chore` commit `940b441`.
