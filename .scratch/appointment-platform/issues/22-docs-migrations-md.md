# 22: `docs/migrations.md`

**What to build:** Half a page that tells how the schema changes are released.

**Blocked by:** 06 Start times in UTC; 12 Create and list staff members; 16 Delete an appointment; 17 Audit trail; 19 `canceled` fix migration

**Status:** ready-for-agent

- [ ] It says who runs migrations, when, from which image and with what permissions
- [ ] It has one line per migration on whether the previous API version still works against it, and why that matters
- [ ] It states the soft-delete window during a rolling update and the two-release alternative
- [ ] It says how to roll back a bad release
- [ ] It says what changes on Postgres with several instances
- [ ] It is half a page at most
