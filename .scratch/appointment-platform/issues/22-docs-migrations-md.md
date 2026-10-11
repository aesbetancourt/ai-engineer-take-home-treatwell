# 22: `docs/migrations.md`

**What to build:** Half a page that tells how the schema changes are released.

**Blocked by:** 06 Start times in UTC; 12 Create and list staff members; 16 Delete an appointment; 17 Audit trail; 19 `canceled` fix migration

**Status:** done

- [x] It says who runs migrations, when, from which image and with what permissions
- [x] It has one line per migration on whether the previous API version still works against it, and why that matters
- [x] It states the soft-delete window during a rolling update and the two-release alternative
- [x] It says how to roll back a bad release
- [x] It says what changes on Postgres with several instances
- [ ] ~~It is half a page at most~~ (not done, see the comment)

## Comments

**From the history check (2026-10-11).** The last criterion is open again. The file has 346 words, and it renders as about two thirds of a page.

**Decision (2026-10-11).** The author keeps `docs/migrations.md` at its length of 346 words. The file is not cut.
