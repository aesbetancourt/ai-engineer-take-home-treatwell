# 19: `canceled` fix migration

**What to build:** A data migration changes the legacy status spelling to `cancelled`.

**Blocked by:** 18 Migrations as a release step

**Status:** ready-for-agent

- [ ] The migration is a custom Drizzle migration in the journal, not a file written by hand outside it
- [ ] It changes only rows with the status `canceled`
- [ ] A second run changes nothing
- [ ] Reads still normalise the spelling, because the seed inserts legacy appointments after the migrations run
- [ ] No migration rewrites a legacy start time
