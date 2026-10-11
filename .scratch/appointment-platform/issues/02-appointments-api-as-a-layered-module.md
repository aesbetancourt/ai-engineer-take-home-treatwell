# 02: Appointments API as a layered module

**What to build:** The appointment endpoints run through routes, a service, a repository and a mapper. Only the repository uses Drizzle. Each endpoint returns the same status code and body as before for valid input.

**Blocked by:** 01 Contract package and typed errors

**Status:** done

- [x] Routes parse input with the contract schemas and map output
- [x] The service holds the overlap check, the price copy and the status check, and throws typed errors
- [x] The list uses one joined query, not one query per appointment
- [x] Query conditions use bound parameters; no `sql.raw` on user input remains
- [x] An unknown `status` value still returns 200 with an empty list
- [x] The response mapping exists in one place
- [x] Customers and treatments are unchanged
- [x] Each commit is a `refactor` commit and the characterization suite is green after each one
- [x] `NOTES.md` states the one changed response: injection input returned 500 and now returns 200 with an empty list

## Comments

**From the review of ticket 01.** The input schemas in the contract are stricter than the current code. When the routes parse with them, these inputs change status. Keep the current status where the list says so, and record each remaining difference in `NOTES.md`.

- `PATCH` of an unknown id with an invalid body returns 404 today. Look up the appointment before the body parse to keep the 404.
- `GET /appointments?status=` (empty string) means "no filter" today. Keep that.
- `POST` with `customerId: -1` or `1.5` returns 404 today, and 400 with the schema.
- `POST` with `customerId: "1"` (a numeric string) is accepted today, and returns 400 with the schema.
- `POST` or `PATCH` with `notes: 5` is accepted today, and returns 400 with the schema.
- `GET /appointments?status=a&status=b` returns 200 with an empty list today, and 400 with the schema.

**From the history check (2026-10-11).** `c055f28`, `be30460` and `94a22e4` are `refactor` commits. `4a4f10d` is a `test` commit: it only adds tests that record the current behaviour. `yarn test` is green in a clone at each of the four commits.
