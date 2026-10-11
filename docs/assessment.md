# Codebase assessment

State of the repo at commit `5ffee74` (initial commit), before any change.

## Scope and method

- All tracked files were read (about 2,300 lines).
- The findings come from reading the code.
- `yarn verify --verbose` was run once on the untouched code (Node 22.23.3, Yarn 4.18.1). The output is in [`yarn verify` baseline](#yarn-verify-baseline).

## What is here

A Yarn 4 monorepo with two apps and no shared code. The root `package.json` declares a `packages/*` workspace, but the directory does not exist.

```
browser ──> Next BFF route handlers (apps/web/app/api/*) ──> Fastify API ──> Drizzle ──> SQLite
   └──────── Overview page calls http://localhost:4000 directly ────────┘
```

| Area | State |
|---|---|
| `apps/api/src/routes.ts` | 335 lines hold all endpoints for customers, treatments and appointments. Everything is typed `any`. Validation, SQL and response shaping are inline. |
| `apps/api/src/app.ts` | Builds Fastify with CORS `*` and an optional `x-api-key` check. |
| `apps/api/src/db/index.ts` | Opens SQLite and runs `migrate()` as an import side effect. |
| `apps/api/src/index.ts` | Seeds on every boot unless `SEED_ON_BOOT=false`, then starts the reminder `setInterval`. |
| `apps/api/src/jobs/reminders.ts` | Polls every minute for confirmed appointments without `reminderSentAt`. |
| `apps/web/app` | Four client pages that use `useEffect` + `fetch`. Four BFF proxy files with a hardcoded API URL. |
| `apps/api/test/characterization` | Three files that spawn the real server over HTTP. Each file gets one seeded database. Tests in a file depend on order. |
| `apps/api/drizzle` | Two migrations: `0000_baseline` and `0001_reminders` (adds `reminder_sent_at`). |

## Business-rule violations

The README says the business rules win when the code disagrees.

| Rule | What the code does | Covered by tests? |
|---|---|---|
| Back-to-back is fine | `start <= ee && end >= es` rejects it (`routes.ts:248`). | **The test encodes the bug** (`appointments.test.ts:142`). |
| Cancelled appointments do not count | The overlap check counts every status (`routes.ts:232-251`). | No |
| No double-booking | `PATCH startsAt` has no overlap check (`routes.ts:307-312`). | No |
| No double-booking | The in-memory `bookingInProgress` lock fails across three replicas (`routes.ts:9`). The check and the insert are not in one transaction. | No |
| Cancelling is final | `PATCH` allows any status transition (`routes.ts:298-303`). | No |
| Notes are staff-only | The customer-facing confirmation page fetches the full appointment. The payload includes notes, email and phone. Ids are sequential, so any booking can be read. | No |
| Exactly one reminder | The job runs in every replica. Send-then-mark is not atomic (`reminders.ts:22-28`). Slow runs can overlap. | No |
| Legacy times are Europe/Berlin | `new Date('2026-10-06 15:00')` parses in server time. Under `TZ=UTC`, `endsAt` and the overlap check are off by two hours. | Sidestepped. The ordering test filters to ISO rows only. |
| Price is copied at booking | It is, but as an insert with `price: 0` followed by an update, with no transaction (`routes.ts:253-268`). | Yes, the result only |

## Other findings

### Security

- **SQL injection.** `GET /appointments` builds SQL from `status` and `date` with `sql.raw` (`routes.ts:137-148`). `GET /customers?search=` does the same (`routes.ts:31-39`).
- **Auth.** `API_KEY` is optional. When it is not set, the API has no authentication.
- **Key exposure.** `NEXT_PUBLIC_API_KEY` ships the key to the browser. The Overview page calls the API directly and bypasses the BFF.
- **PII in logs.** `console.log` prints request bodies for customer and appointment creation.

### Operations

- **Data loss in production.** Seed-on-boot is the default. It deletes all three tables.
- **Migrations on start.** Each replica runs `migrate()` on import. `db:migrate` works only through that side effect.
- **No graceful shutdown, health endpoint or structured logger.**
- **No SQLite pragmas.** `foreign_keys`, `journal_mode` and `busy_timeout` are not set.

### API

- **Error bodies are inconsistent.** The shapes are `{ error }`, `{ message }`, `{ errors: [] }` and plain strings.
- **Mixed formats.** `startsAt` is stored verbatim in any parseable format. Appointment `createdAt` is epoch milliseconds. Customers use ISO text.
- **Status spelling.** The summary reports `cancelled` and `canceled` as separate keys.
- **Validation.** `validateAppointmentInput` returns `true` when the input is invalid, which contradicts its comment. Field types are not checked. `PATCH notes` accepts any type.
- **Performance.** The list endpoint runs N+1 queries. The summary loads every row.
- **Schema.** There are no foreign keys, indexes or constraints. Money is `REAL`.
- **Missing rows crash.** A missing treatment makes the list return 500 (`routes.ts:155`).

### Web

- **BFF errors.** The BFF always returns 200, so a 409 looks like success in the UI. It throws on the plain-text error bodies of the API.
- **Hardcoded URL.** `http://localhost:4000` appears in four BFF files and in the Overview page.
- **Status filter.** The UI sends `canceled`, so it shows only the legacy rows (`appointments/page.tsx:99`).
- **Stale cache.** The module-level `customerCache` is never invalidated (`appointments/page.tsx:17`).
- **No error handling.** `create()` closes the form whatever the result. An empty `startsAt` throws a `RangeError`.
- **Time zones.** Input and display use the browser time zone, not the venue time zone.
- **State.** Filters are not in the URL.

### Dead weight

- `lodash` and `@types/lodash` (API) and `dayjs` (web) are not imported.
- Nothing imports `apps/api/src/utils/legacy.ts`.

## `yarn verify` baseline

Three of six checks fail on the starting code. The README says this is expected.

| Check | Result | Cause |
|---|---|---|
| tsc (api) | pass | |
| tsc (web) | pass | |
| eslint | **FAIL** | 44 errors, 11 warnings. 39 errors are in `apps/api/src/routes.ts`: `any` and unused parameters. The other 5 are `any` in the web pages. |
| knip | **FAIL** | Unused file `utils/legacy.ts`. Unused `lodash`, `@types/lodash` and `dayjs`. |
| jscpd | **FAIL** | 2.13% duplication, threshold 2%. Two clones: the appointment serializer in `routes.ts`, and the appointments and customers BFF handlers. |
| tests | pass | All characterization tests pass. |

Full output of `yarn verify --verbose`. Absolute paths are shortened to repo-relative paths. Colour codes and the jscpd stack trace are removed.

```text
> tsc (api) ... ok (1.6s)
> tsc (web) ... ok (1.1s)
> eslint ... FAILED (0.8s)
> knip ... FAILED (1.0s)
> jscpd ... FAILED (0.4s)
> tests ... ok (7.4s)

Summary
  pass  tsc (api)
  pass  tsc (web)
  FAIL  eslint
  FAIL  knip
  FAIL  jscpd
  pass  tests

--- eslint
apps/api/src/app.ts
  10:5  warning  Unexpected console statement  no-console

apps/api/src/db/migrate-cli.ts
  4:1  warning  Unexpected console statement  no-console

apps/api/src/db/seed-cli.ts
  4:1  warning  Unexpected console statement  no-console

apps/api/src/index.ts
  12:3  warning  Unexpected console statement  no-console

apps/api/src/jobs/reminders.ts
  33:37  warning  Unexpected console statement  no-console

apps/api/src/mailer.ts
  4:3  warning  Unexpected console statement  no-console

apps/api/src/routes.ts
   12:38  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   12:50  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   24:37  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   27:37  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   27:42  error    'reply' is defined but never used         @typescript-eslint/no-unused-vars
   27:49  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   29:15  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   46:41  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   46:53  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   54:7   warning  Unexpected console statement              no-console
   59:38  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   59:50  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   60:30  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   61:5   warning  Unexpected console statement              no-console
   85:32  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   85:37  error    'reply' is defined but never used         @typescript-eslint/no-unused-vars
   85:44  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  100:46  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  100:56  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  108:39  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  108:51  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  109:30  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  136:40  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  136:45  error    'reply' is defined but never used         @typescript-eslint/no-unused-vars
  136:52  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  151:19  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  171:43  error    'req' is defined but never used           @typescript-eslint/no-unused-vars
  171:48  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  171:53  error    'reply' is defined but never used         @typescript-eslint/no-unused-vars
  171:60  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  173:21  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  184:44  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  184:56  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  209:41  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  209:53  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  210:27  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  211:5   warning  Unexpected console statement              no-console
  245:18  error    'err' is defined but never used           @typescript-eslint/no-unused-vars
  286:46  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  286:58  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  287:27  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  297:20  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

apps/web/app/appointments/page.tsx
  17:20  error    Unexpected any. Specify a different type                                                                 @typescript-eslint/no-explicit-any
  21:46  error    Unexpected any. Specify a different type                                                                 @typescript-eslint/no-explicit-any
  22:48  error    Unexpected any. Specify a different type                                                                 @typescript-eslint/no-explicit-any
  42:6   warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

apps/web/app/customers/page.tsx
  27:6  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

apps/web/app/page.tsx
  6:42  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

apps/web/app/treatments/page.tsx
  6:48  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 55 problems (44 errors, 11 warnings)

--- knip
Unused files (1)
apps/api/src/utils/legacy.ts
Unused dependencies (2)
lodash  apps/api/package.json:19:6
dayjs   apps/web/package.json:11:6
Unused devDependencies (1)
@types/lodash  apps/api/package.json:23:6

--- jscpd
Clone found (typescript):
 - apps/web/app/api/appointments/route.ts [7:49 - 16:48] (9 lines, 114 tokens)
   apps/web/app/api/customers/route.ts [7:46 - 16:45]

Clone found (typescript):
 - apps/api/src/routes.ts [319:84 - 335:2] (16 lines, 215 tokens)
   apps/api/src/routes.ts [192:19 - 209:6]

┌────────────┬────────────────┬─────────────┬──────────────┬──────────────┬──────────────────┬───────────────────┐
│ Format     │ Files analyzed │ Total lines │ Total tokens │ Clones found │ Duplicated lines │ Duplicated tokens │
├────────────┼────────────────┼─────────────┼──────────────┼──────────────┼──────────────────┼───────────────────┤
│ javascript │ 5              │ 140         │ 1461         │ 0            │ 0 (0%)           │ 0 (0%)            │
├────────────┼────────────────┼─────────────┼──────────────┼──────────────┼──────────────────┼───────────────────┤
│ tsx        │ 6              │ 442         │ 4223         │ 0            │ 0 (0%)           │ 0 (0%)            │
├────────────┼────────────────┼─────────────┼──────────────┼──────────────┼──────────────────┼───────────────────┤
│ typescript │ 12             │ 594         │ 8254         │ 2            │ 25 (4.21%)       │ 329 (3.99%)       │
├────────────┼────────────────┼─────────────┼──────────────┼──────────────┼──────────────────┼───────────────────┤
│ Total:     │ 23             │ 1176        │ 13938        │ 2            │ 25 (2.13%)       │ 329 (2.36%)       │
└────────────┴────────────────┴─────────────┴──────────────┴──────────────┴──────────────────┴───────────────────┘
Found 2 clones.
Error: ERROR: jscpd found too many duplicates (2.13%) over threshold (2%)
ERROR: jscpd found too many duplicates (2.13%) over threshold (2%)

3 of 6 checks failed. Treat this as a signal: tell us about anything you leave failing.
```

## Traps for later phases

1. **Seed runs after migrate.** The reviewers run `db:migrate`, `db:seed`, `start`. The seed puts `canceled` and legacy dates back after the fix migration. Reads must still normalise them, or the seed must change.
2. **Synchronous transactions.** `better-sqlite3` transactions cannot take an async callback. Audit "in the same transaction" must use synchronous Drizzle calls. AI tools often get this wrong.
3. **Sorting and Berlin date filters.** Mixed `startsAt` formats sort wrongly as text. The API has no time zone library. Pagination needs an `id` tiebreak to be stable.
4. **Test helper.** `helpers/server.ts` has no `delete` method. The new list shape breaks all six `GET /appointments` tests.
5. **Rolling update.** The old API version ignores a new `deletedAt` column, so it shows deleted rows during rollout. This belongs in `docs/migrations.md`.
6. **Production start.** `start` uses `tsx`, which is a devDependency. This matters for the Dockerfile because the script name must stay.
7. **Staff email.** Case-insensitive uniqueness needs an expression index on `lower(email)`. It is not confirmed that `drizzle-kit generate` emits it correctly.
8. **Reminder job.** It must skip soft-deleted appointments.

## Open questions for the reviewers

- There is no appointment detail page, only the list and the confirmation page. Where does the delete button go?
- Does an unknown query parameter, such as the old `date`, return 400, or is it ignored?
- "Items keep today's shape" conflicts with "the API uses ISO 8601" for the epoch `createdAt` and the legacy `startsAt` strings. Which one wins?
