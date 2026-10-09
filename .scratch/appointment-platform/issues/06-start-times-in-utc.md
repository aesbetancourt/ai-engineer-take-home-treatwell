# 06: Start times in UTC

**What to build:** Each appointment has one UTC start time, whatever its stored format. A legacy appointment returns `startsAt` as UTC ISO, and its `endsAt` is correct. A new `startsAt` must name its zone. See ADR 0002.

**Blocked by:** 02 Appointments API as a layered module

**Status:** ready-for-agent

- [ ] A virtual generated column holds the UTC start time, added by a generated migration that adds a column and an index and rebuilds no table
- [ ] The generated SQL is read before the commit
- [ ] The conversion uses the EU daylight-saving rule for venue time (Europe/Berlin)
- [ ] A direct test against a temporary database covers a winter time, a summer time and both clock-change days
- [ ] `endsAt`, the overlap check, the reminder window and the list order use the UTC start time
- [ ] A legacy appointment returns `startsAt` as UTC ISO; `createdAt` stays epoch milliseconds
- [ ] A new `startsAt` with `Z` or an offset is stored as UTC ISO; one with an offset returns the same instant in UTC
- [ ] A `startsAt` with no zone, date-only input included, returns 400
- [ ] The legacy conversion and the strict input are separate `fix` commits, each with a test that fails before the fix
