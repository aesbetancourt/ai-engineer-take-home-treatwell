# Migrations

**Who, when, where.** A release job runs `yarn db:migrate` one time for each release, from the API image of the new version, before the first pod of that version starts. `yarn start` never runs a migration. In production the job has a role that can change the schema, and the pods have a role that can only read and write rows. This repo cannot show that: SQLite has file access only. `yarn db:check` fails a build whose schema has no migration.

**The previous version must work on the new schema**, because a rolling update runs both versions together after the migration. `0000` and `0001` came with the starting code.

| Migration | Previous API version | Why |
|---|---|---|
| `0002` column `starts_at_utc` | Works | Generated column. An old insert does not name it. |
| `0003` `staff`, `0005` `appointment_audit` | Works | New tables. An old pod writes no audit entry. |
| `0004` column `deleted_at` | Works, with a gap | An old pod still shows a deleted appointment, changes it, counts it as an overlap and sends its reminder. |
| `0006` status `canceled` | Works | It rewrites data, not the schema. The previous version reads both spellings. |

The gaps last as long as the rollout. Two releases close them: the first adds the column and reads it, the second writes it. `GET /appointments` also has a new response shape, which the old web version cannot read.

**Rollback.** Roll back the image, not the schema. The old version ignores the new columns and tables, and it reads the rows that `0006` changed. A deleted appointment is visible again. Take a backup before the job: no migration has a reverse.

**On Postgres with several instances.** Take an advisory lock, so only one job migrates. Set `lock_timeout`. Create an index with `CONCURRENTLY`, outside the migration transaction. Run a data fix in batches. Store the end time, and replace the whole-database write lock with an exclusion constraint on customer and time range. Replace the hand-written daylight-saving rule with `AT TIME ZONE`.
