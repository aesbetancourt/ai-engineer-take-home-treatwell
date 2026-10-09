# 20: `yarn db:check`

**What to build:** A check fails when the schema has a change that no migration covers.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `yarn db:check` exists in the API package and at the root
- [ ] It passes on a schema that the migrations cover
- [ ] It fails with a non-zero exit code when the schema has an uncovered change
- [ ] It fails when drizzle-kit gives no clear result; it does not trust the exit code of `generate`
- [ ] It leaves no file behind in either case
- [ ] `yarn verify` runs it
