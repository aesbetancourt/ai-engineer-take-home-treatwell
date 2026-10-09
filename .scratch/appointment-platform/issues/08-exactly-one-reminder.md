# 08: Exactly one reminder

**What to build:** A customer gets one reminder for a confirmed appointment, with three replicas running the job. See ADR 0001.

**Blocked by:** 02 Appointments API as a layered module

**Status:** ready-for-agent

- [ ] The job claims the appointment with one atomic update, and sends the email only when the claim changed one row
- [ ] The job uses the appointments repository; it does not import Drizzle
- [ ] A direct test runs the job twice at the same time with a fake mailer and expects one email
- [ ] The fix is its own `fix` commit; the test fails before it
