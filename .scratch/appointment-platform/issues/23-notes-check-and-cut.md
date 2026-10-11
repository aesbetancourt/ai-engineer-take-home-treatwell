# 23: Notes: check and cut

**What to build:** `NOTES.md` is true and fits on one page.

**Blocked by:** 22 `docs/migrations.md`

**Status:** done

- [x] Each line is checked against the commits; a line with no matching commit is corrected or removed
- [x] It answers the five questions of the brief
- [x] It names each characterization test that changed, with its commit
- [x] It lists each AI mistake found during the work and how it was caught
- [ ] ~~It is one page at most~~ (not done, see the comment)

## Comments

**From the history check (2026-10-11).** Facts that `NOTES.md` does not state yet: `yarn install --immutable` fails at `f75dd8a` and `a99548f`; one new test is red at `f75dd8a`; the `fix` commit `17aec28` has no test that fails before it; `769901a` and `ff7f535` each hold more than one fix; the web image was not built after `89ab2fd`.

**Decision (2026-10-11).** The author keeps `NOTES.md` at its full length. The cut is out of this ticket. The check of each line against the commits stays in.

**Result (2026-10-11).** Each statement of `NOTES.md` was checked against the code, the history or a new run. The author commits `NOTES.md` after ticket 24.

- New runs: `yarn verify`; the differential of the refactor (`4a4f10d` against `94a22e4`, 151 requests, plus two appointments with a missing row); live requests against the API at HEAD and at the initial commit; the sweep of the start time conversion (1,186,704 local times, no difference); the two-replica tests with no transaction and with a deferred one (three runs each); the tests at each test-only commit; a build and a run of both images.
- Corrected: the reminder window, the list of direct tests, the `SIGTERM` line, the migration tests, the image build, the special hour in March, the public fields, the web fixes with no test, the count of requests, the row of the missing customer or treatment.
- Added: the error bodies that changed in the refactor, the commit of each characterization change, the section "What is wrong in the commit history", the 10 ESLint warnings, ten more AI mistakes, the SQL injection in the go-live list, the logger that is off.
- A fact check by a second agent found 12 items. Eleven were wording, in the notes and in ADR 0002 (`21ec1a5`). One was a defect: the seed did not clear the staff table (`6bf7206`, with a test that fails before it).

