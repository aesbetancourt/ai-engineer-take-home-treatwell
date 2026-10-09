# A generated column holds the UTC start time of each appointment

Legacy appointments store `starts_at` as `YYYY-MM-DD HH:mm` in venue time, and new appointments store UTC ISO 8601. Sorting, the date filter, the overlap check, the reminder and `endsAt` all need one comparable instant. We added a virtual generated column, `starts_at_utc`, whose SQL expression converts the legacy format with the EU daylight-saving rule. Each read that needs the instant uses it, so the conversion exists in one place and SQL and TypeScript cannot disagree. The response, `endsAt`, the overlap check and the list order use it now. The date filter and the reminder follow in their own changes.

## Considered options

- **Convert in TypeScript on read, and a separate SQL sort key.** Two implementations of one rule, which can drift apart.
- **A data migration that rewrites legacy values.** It changes customer data and a rollback cannot undo it. The seed also inserts legacy rows after the migrations run, so reads would still need the conversion.
- **A stored column that the application writes.** The previous API version does not write it during a rolling update, so rows would have no value.

## Consequences

- A change to the expression needs a hand-edited migration. drizzle-kit drops the column while its index still exists, and SQLite rejects that.
- The daylight-saving rule is fixed in SQL. A change to EU clock rules needs a new migration.
- The column is null for a stored value that SQLite cannot read as a time. An old version of the API accepted any string that JavaScript can parse, so such values can exist. The mapper then converts the stored value in TypeScript, and such an appointment sorts first in the list.
- On Postgres, the same column is `starts_at AT TIME ZONE 'Europe/Berlin'`, with no hand-written rule.
