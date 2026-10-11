# 20: `yarn db:check`

**What to build:** A check fails when the schema has a change that no migration covers.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `yarn db:check` exists in the API package and at the root
- [x] It passes on a schema that the migrations cover
- [x] It fails with a non-zero exit code when the schema has an uncovered change
- [x] It fails when drizzle-kit gives no clear result; it does not trust the exit code of `generate`
- [x] It leaves no file behind in either case
- [x] `yarn verify` runs it
