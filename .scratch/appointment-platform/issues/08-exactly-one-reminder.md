# 08: Exactly one reminder

**What to build:** A customer gets one reminder for a confirmed appointment, with three replicas running the job. See ADR 0001.

**Blocked by:** 02 Appointments API as a layered module

**Status:** done

- [x] The job claims the appointment with one atomic update, and sends the email only when the claim changed one row
- [x] The job uses the appointments repository; it does not import Drizzle
- [x] A direct test runs the job twice at the same time with a fake mailer and expects one email
- [x] The fix is its own `fix` commit; the test fails before it

## Comments

**From ticket 06.** The reminder job still reads the stored `startsAt` with `new Date`, so the 24 hour window of a legacy appointment is off by the venue offset. Ticket 06 left the job alone, because the job has no test yet. In this ticket, read the UTC start time (`toUtcStart` in the appointments mapper, through the repository), and add a direct test with a legacy appointment at the edge of the window.

**From the history check (2026-10-11).** A clone ran the tests of each `fix` commit at the commit and on its parent. `5a12024`, `1dd3531` and `4bad9b8` are green at the commit and red on the parent. `yarn test` is green at the `refactor` commit `dabfb22`.
