# 19: `canceled` fix migration

**What to build:** A data migration changes the legacy status spelling to `cancelled`.

**Blocked by:** 18 Migrations as a release step

**Status:** done

- [x] The migration is a custom Drizzle migration in the journal, not a file written by hand outside it
- [x] It changes only rows with the status `canceled`
- [x] A second run changes nothing
- [x] Reads still normalise the spelling, because the seed inserts legacy appointments after the migrations run
- [x] No migration rewrites a legacy start time
