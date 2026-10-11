# Migrations

**Who, when, where.** A release job runs `yarn db:migrate` one time for each release, before the first pod of the new version starts, from the API image of that version. The job has a database role that can change the schema. The API pods have a role that can only read and write rows, and a start of the API never runs a migration. SQLite has no roles, so here only the code keeps this rule.

**The previous version must work on the new schema**, because a rolling update runs both versions together after the migration. So each migration only adds.

| Migration | Previous API version | Why |
|---|---|---|
| `0002` column `starts_at_utc` | Works | Generated column. An old insert does not name it. |
| `0003` table `staff`, `0005` table `appointment_audit` | Works | New tables. A change through an old pod writes no audit entry. |
| `0004` column `deleted_at` | Works, with a gap | An old pod still shows a deleted appointment, counts it as an overlap and sends its reminder. |
| `0006` status `canceled` | Works | The previous version reads both spellings. A second run changes no row. |

The gaps last as long as the rollout. Two releases close them: the first adds the column and reads it, the second starts to write it. One break is not in the schema: `GET /appointments` has a new response shape, so the old web version cannot read the list during the rollout.

**Rollback.** Roll back the image, not the schema. The old version ignores the new columns and tables. After a rollback, a deleted appointment is visible again. Take a backup before the release job, for a data migration that is wrong.

**On Postgres with several instances.** Take an advisory lock, so only one job migrates. Set `lock_timeout`, and use `CREATE INDEX CONCURRENTLY`. Run a data fix such as `0006` in batches. Replace the write lock on the whole database with an exclusion constraint on customer and time range. Replace the hand-written daylight-saving rule with `AT TIME ZONE 'Europe/Berlin'`.
