# 18: Migrations as a release step

**What to build:** Migrations run only when someone runs them. A start of the API never changes the schema.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `yarn db:migrate` applies pending migrations and exits
- [x] A second run of `yarn db:migrate` changes nothing
- [x] A start of the API runs no migration, in any environment
- [x] A start with `NODE_ENV=production` on an empty database creates no table and seeds no data
- [x] `yarn dev` works from a fresh clone
- [x] The script names `db:migrate`, `db:seed` and `start` are unchanged, and that order still starts a working API
- [x] The characterization suite is green
