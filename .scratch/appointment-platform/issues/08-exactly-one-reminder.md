# 08: Exactly one reminder

**What to build:** A customer gets one reminder for a confirmed appointment, with three replicas running the job. See ADR 0001.

**Blocked by:** 02 Appointments API as a layered module

**Status:** done, not committed

- [x] The job claims the appointment with one atomic update, and sends the email only when the claim changed one row
- [x] The job uses the appointments repository; it does not import Drizzle
- [x] A direct test runs the job twice at the same time with a fake mailer and expects one email
- [ ] The fix is its own `fix` commit; the test fails before it

## Comments

**From ticket 06.** The reminder job still reads the stored `startsAt` with `new Date`, so the 24 hour window of a legacy appointment is off by the venue offset. Ticket 06 left the job alone, because the job has no test yet. In this ticket, read the UTC start time (`toUtcStart` in the appointments mapper, through the repository), and add a direct test with a legacy appointment at the edge of the window.

