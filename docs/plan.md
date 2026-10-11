# Plan: Treatwell — appointment booking platform

## Context

The brief asks for four phases: a rules file, a refactor of the appointments module, three features, and safe schema shipping. Reviewers read `NOTES.md` first, then commits, then code. They weigh protected behaviour, features that match the refactor, small diffs, tests that catch regressions, and honest notes.

The codebase findings are in `docs/assessment.md`. This plan turns them into an ordered work list.

## Order

| # | Step | Result |
|---|---|---|
| 0 | `CLAUDE.md` | Done by the author, outside the tickets |
| 1 | Refactor appointments | Layered module, shared contract, same behaviour |
| 1b | Fixes | One commit per fix, each with a test: business rules, web, hardening |
| 2.1 | Staff | New module in the Step 1 shape |
| 2.2 | Pagination, filter, sort | New `GET /appointments` contract |
| 2.3 | Soft delete + audit | `DELETE` and audit endpoints |
| 3 | Ship safely | Migrations as a release step, `db:check`, Dockerfiles, `docs/migrations.md` |
| 4 | `NOTES.md` + final `yarn verify` | Submission ready |

## Commit rules (from the brief)

- Small commits. No squash, no history rewrite.
- A refactor commit must not change what endpoints return.
- A bug fix is its own commit, with a test that fails before the fix.
- A characterization test that encodes a bug changes in its own commit, and `NOTES.md` says so.
- Keep the script names `db:migrate`, `db:seed`, `start`.

## Step 0 — rules file

The author writes and commits `CLAUDE.md` separately, before the first code commit. This step has no ticket.

## Step 1 — refactor the appointments module (behaviour stays the same)

### Target layout

```
packages/contract/src/        appointments.ts, errors.ts, index.ts   (zod, new workspace package)
apps/api/src/
  shared/errors.ts            AppError, NotFoundError, ValidationError, ConflictError
  shared/error-handler.ts     the one Fastify error handler
  modules/appointments/
    appointments.routes.ts    HTTP only
    appointments.service.ts   rules: overlap, price copy, status
    appointments.repository.ts  the only Drizzle user; joins customer + treatment
    appointments.mapper.ts    row → response (endsAt computed here)
  routes.ts                   customers + treatments stay here, untouched
apps/web/
  lib/api.ts                  server-only API client: base URL from env, forwards status codes
  app/api/appointments/**     BFF handlers that use lib/api.ts and the contract
  app/appointments/**         pages typed from the contract
```

The root `package.json` already declares the `packages/*` workspace, so the shared contract goes there. Next needs `transpilePackages` for it. The API runs with `tsx`, so no build step is needed.

### Commits, in order

1. Add `packages/contract` with zod schemas for the current appointment shapes and the error body.
2. Add typed errors and the error handler. Wire them in `apps/api/src/app.ts`.
3. Extract the repository. Replace `sql.raw` filters with parameterised conditions. Replace N+1 with one join.
4. Extract the service and the mapper. Remove the four copies of the serializer.
5. Move the routes to `appointments.routes.ts`. Parse input with the contract schemas.
6. Web: add `lib/api.ts`, refactor the appointments BFF handlers, forward upstream status codes.
7. Web: type the appointments pages and the Overview summary from the contract. Route the Overview through the BFF. Remove `NEXT_PUBLIC_API_KEY` use from these paths.

### Behaviour that must not change in Step 1

Status codes pinned by `apps/api/test/characterization/appointments.test.ts`: 404 for unknown customer or treatment on POST, 409 for overlap (including back-to-back, for now), 400 for the invalid bodies, the client `price` is ignored. Run `yarn test` after each commit.

Known exception to flag in `NOTES.md`: the parameterised filter removes the SQL injection. Valid inputs return the same results. An unknown `status` value still returns 200 with an empty list in Step 1. The 400 arrives with Step 2.2.

## Step 1b — fixes, one commit each, each with a test

Business rules:

1. **Back-to-back is allowed.** Change `<=`/`>=` to `<`/`>`. This changes the characterization test at `appointments.test.ts:142` in its own commit.
2. **Cancelled appointments do not count** in the overlap check (both spellings).
3. **Cancelling is final.** `PATCH` rejects a change away from `cancelled` with 409. All other transitions stay allowed. Notes stay editable. `cancelled` → `cancelled` returns 200 and changes nothing.
4. **Notes do not reach the customer.** A new BFF route for the confirmation page parses the API response with a public schema: no `notes`, email or phone. The API stays unchanged.
5. **`PATCH startsAt` runs the overlap check**, without the appointment itself.
6. **Legacy start times are venue time.** Add the virtual generated column `starts_at_utc` and its index (generated migration; see `docs/adr/0002-generated-column-for-start-time.md`). Use it for `endsAt`, the overlap check, the reminder and the sort. Responses return `startsAt` as UTC ISO for legacy appointments. Test both clock changes directly against a temporary database.
7. **Legacy status spelling.** Responses and the summary return `cancelled` for `canceled`. `createdAt` stays epoch milliseconds.
8. **A new `startsAt` must be ISO 8601 with `Z` or an offset.** Store it as UTC ISO. A date-only input returns 400.
9. **Booking race.** Replace the in-memory `bookingInProgress` set with one synchronous immediate transaction around the check and the insert. Insert the real price in one statement. Set `busy_timeout` and `journal_mode=WAL`. Test with two API processes on one database: one 201, one 409. The test helper needs an option to start a second server on an existing database.
10. **Exactly one reminder.** In `apps/api/src/jobs/reminders.ts`, claim the row first with `UPDATE ... WHERE reminder_sent_at IS NULL`. Send only when the claim changed one row (see `docs/adr/0001-reminder-claim-before-send.md`). Test directly: two runs at the same time, a fake mailer, one email.

Web:

11. **The BFF forwards the status code of the API.**
12. **The create form shows the error and stays open** when the API rejects the booking.
13. **The status filter sends `cancelled`.**
14. **Times display in venue time** (Europe/Berlin), not browser time.

Hardening:

15. **Remove the `console.log` of the appointment request body.**
16. **Close the server on `SIGTERM`.**
17. **Add `GET /health`.**

## Step 2.1 — staff

Same shape as the appointments module: contract → repository → service → routes → BFF → pages.

- Schema: `staff` table in `apps/api/src/db/schema.ts`. Unique index `staff_email_lower_unique` on `lower(email)`. `active` defaults to true. `createdAt` as ISO text.
- Migration: `yarn db:generate`. Read the generated SQL. Confirmed: drizzle-kit 0.31.11 emits the expression index correctly.
- Service: trim the name and the email. Store the email as sent, not in lower case. Empty PATCH is 400. A PATCH with only unknown fields counts as empty.
- Repository: map `SqliteError` with code `SQLITE_CONSTRAINT_UNIQUE` and the index name to `ConflictError` (409). The error message names the index, not the column.
- `GET /staff/abc` returns 404, as `GET /appointments/abc` does.
- Tests: new `apps/api/test/staff.test.ts` with the existing `startServer` helper. Cover each status code in the brief.
- Web: BFF routes, a list page, a create form, a nav link in `apps/web/app/layout.tsx`. No edit form.

## Step 2.2 — pagination, filtering, sorting on `GET /appointments`

- Contract: query schema with `page`, `pageSize`, `status`, `from`, `to`, `sortBy`, `sortDir`. Strict parsing, so an unknown parameter (the old `date` included) returns 400. Response schema `{ items, page, pageSize, total }`.
- Repository: one count query and one page query with the same `where`. Add `id` as the sort tiebreak.
- Date filter: compute the UTC instants of venue midnight for `from` and for the day after `to` in TypeScript. Compare them with `starts_at_utc`.
- `from` later than `to` returns 200 with empty items.
- Sort by `startsAt` uses `starts_at_utc`.
- Status filter: `cancelled` matches both spellings, because the seed inserts legacy appointments after the migration runs.
- Update the six `GET /appointments` characterization tests in their own commit. Say so in `NOTES.md`.
- Web: the appointments page reads filters from `useSearchParams` and writes them with `router.replace`.

## Step 2.3 — soft delete with audit trail

- Schema: `appointments.deleted_at` (nullable) and an `appointment_audit` table. One generated migration.
- Repository: every read, list, summary and overlap query filters `deleted_at IS NULL`. The reminder job does too.
- Service: create, update and delete write the audit entry in the same synchronous `better-sqlite3` transaction. The callback must not be `async`.
- Audit entry: `changes` maps each field to `{ from, to }` for all three actions. Create has `from: null`. Delete has `to: null`. The fields are `customerId`, `treatmentId`, `startsAt`, `status`, `price` and `notes`.
- A `PATCH` that changes no value returns 200 and writes no audit entry. The reminder mark writes no audit entry.
- `GET /appointments/:id/audit`: 200 for a deleted appointment, 404 for an id that never existed. A seeded appointment returns 200 with `[]`.
- Test helper: add `delete` to `apps/api/test/characterization/helpers/server.ts`.
- Web: delete button with a confirmation step on each row of the appointment list. The confirmation is page state, not `window.confirm`.
- Rolling update: the previous version does not filter `deleted_at`. Accept this window and state it in `docs/migrations.md`, with the two-release alternative.

## Step 3 — ship safely

1. **Migrations as a release step.**
   - Remove `migrate()` from `apps/api/src/db/index.ts`. The API never runs migrations on start, in any environment.
   - `apps/api/src/db/migrate-cli.ts` calls `migrate()` and exits.
   - `dev` script runs `db:migrate` first, so a fresh clone works.
   - Seed on boot never runs when `NODE_ENV=production`.
2. **`canceled` fix migration.** `UPDATE appointments SET status = 'cancelled' WHERE status = 'canceled'`. It is safe to run twice. Create it with `drizzle-kit generate --custom` so the journal stays consistent. The seed still inserts legacy appointments after migrate, so reads keep the normalisation. No migration rewrites legacy start times.
3. **`yarn db:check`.** Copy `apps/api/drizzle` to a temporary directory with a relative path. Run `drizzle-kit generate --dialect sqlite --schema ./src/db/schema.ts --out <copy>`. Fail when a new file appears. Pass only when the output says nothing to migrate. Remove the copy in `finally`. Do not use `drizzle-kit check` (it never reads `schema.ts`) or the exit code of `generate` (always 0). Add the check to `scripts/verify.mjs`.
4. **Dockerfiles.** `apps/api/Dockerfile` and `apps/web/Dockerfile`: multi-stage, `node:22-slim`, non-root user, production dependencies only. Both images copy `packages/contract`. Web uses Next `output: 'standalone'`. API keeps `start` as is, so `tsx` moves to `dependencies`. The health check calls `GET /health`.
5. **`docs/migrations.md`**, half a page:
   - Who runs migrations: a release job from the API image, with DDL rights. The API role has DML only.
   - Old-version compatibility for each migration (`starts_at_utc`, staff, `deleted_at`, audit, `canceled` fix), with the expand/contract reasoning.
   - Rollback: roll the image back. Migrations are additive and forward-only.
   - Postgres differences: advisory lock around migrate, `CREATE INDEX CONCURRENTLY`, lock timeouts, batched data fixes, exclusion constraint for overlaps, `AT TIME ZONE` in place of the hand-written daylight-saving rule.

## Step 4 — notes and submission

`NOTES.md`, one page, answers the five questions in the brief. Fill it from real events during the work: decisions, skipped items, AI mistakes and how they were caught, next steps, pre-launch needs. The draft already holds the decisions from the grilling session. Check each line against the commits, and cut it to one page.

## Verification

- `yarn test` after each commit in Steps 1 and 1b.
- `yarn verify` at the end of each step. List what still fails and why.
- Fresh-clone check: delete `apps/api/data`, run `yarn dev`, open the four pages plus staff.
- Production check: `NODE_ENV=production yarn workspace @venue/api start` against an empty database must not create tables.
- Run `yarn db:migrate` twice. The second run must change nothing.
- Change `schema.ts` without a migration. `yarn db:check` must fail. Revert.
- `docker build` both images. Run the API image with `db:migrate` then `start`.
- Manual `curl` for each new status code in the brief (staff 400/404/409, list 400, delete 204/404, audit 404).
