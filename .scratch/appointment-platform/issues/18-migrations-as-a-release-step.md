# 18: Migrations as a release step

**What to build:** Migrations run only when someone runs them. A start of the API never changes the schema.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `yarn db:migrate` applies pending migrations and exits
- [ ] A second run of `yarn db:migrate` changes nothing
- [ ] A start of the API runs no migration, in any environment
- [ ] A start with `NODE_ENV=production` on an empty database creates no table and seeds no data
- [ ] `yarn dev` works from a fresh clone
- [ ] The script names `db:migrate`, `db:seed` and `start` are unchanged, and that order still starts a working API
- [ ] The characterization suite is green
