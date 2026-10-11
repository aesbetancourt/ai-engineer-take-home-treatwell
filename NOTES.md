# NOTES

## What did you decide, and why?

- **Unknown query parameters return 400 on `GET /appointments`**, the old `date` included. The brief says the new parameters replace the date filter and that any other value returns 400.
- **Legacy appointments are normalised in responses.** `startsAt` is UTC ISO and the status is `cancelled`. The README says the API uses ISO 8601 in UTC, and the legacy format is a storage detail. `createdAt` stays an epoch number, because a type change is a shape change.
- **Only a change away from `cancelled` is blocked (409).** The README says an appointment "normally" goes pending → confirmed → completed, which is not a rule.
- **The reminder job claims before it sends.** See `docs/adr/0001-reminder-claim-before-send.md`. The claim also requires the status `confirmed`, so an appointment cancelled a moment before gets no reminder. Two more fixes came with the first test of the job. It read a legacy start time as server time, so on a server that runs in UTC the 24 hour window was off by the venue offset. The email also stated the start time in server time.
- **The confirmation page gets its own BFF route with a public schema.** The API keeps `notes` for staff. The BFF is the boundary to the customer.
- **The delete button is on the appointment list.** No appointment detail page exists.
- **A new `startsAt` must be ISO 8601 with `Z` or an offset, and is stored as UTC.** A string without a zone has no defined instant.
- **Staff email is stored as sent, with a unique index on `lower(email)`.** The response then equals the input, and `Anna@x.com` still conflicts with `anna@x.com`. The index rejects the duplicate, so two replicas cannot both insert it. `GET /staff` uses the plain order of the database, so `Zoe` comes before `anna`; the brief says only "ordered by name". The test of the order uses three names that sort the same in both orders, so no test fixes this choice. The name and the email lose the spaces around them before validation.
- **Create and delete audit entries use the update shape**, with `from: null` on create and `to: null` on delete. A `PATCH` that changes no value writes no entry. The values are the ones that the API shows, so a legacy appointment has a UTC start time and the status `cancelled` in its trail. A seeded appointment has no create entry: its trail is empty until the first change. The seed clears the audit table, because it gives the appointments their ids again.
- **One direct test proves the shared transaction.** It removes the audit table from a temporary database and calls the service: the create, the update and the delete each fail and leave no change. No endpoint can make the audit write fail.
- **The API never runs migrations on start.** The `dev` script runs `db:migrate` first. Seed-on-boot is off when `NODE_ENV=production`. Tests start the real processes and read the database file: `db:migrate` creates the tables and changes nothing in a second run, a start creates no table, and a production start seeds no data. In production the API also does not stop when the schema is behind: it starts and answers 500 on a route that needs a missing table. I saw this in a run of the image by hand, and no test covers it. Two effects: a migration that is generated while `yarn dev` runs needs a `yarn db:migrate` by hand, and a production start on a missing database still makes an empty file, with no table.
- **The API image runs `tsx`**, the same path the tests use. A compile step is the next move before real production. I built both images at the last code commit (`6bf7206`) and ran them together: `db:migrate` two times, `db:seed`, the API with a key, and the web image against it. Both containers report healthy, and the API container stops with exit code 0. The first web build failed, because the image did not hold `tsconfig.base.json`; the build found it. The web install was killed for lack of memory in a Docker VM with 2 GiB, and it passes with 4 GiB.
- **A generated column, `starts_at_utc`, holds the UTC start time.** One SQL expression serves the sort, the date filter, the overlap check and the response. See `docs/adr/0002-generated-column-for-start-time.md`. A sweep of 1.2 million local times from 2020 to 2040 against the time zone database found no difference. The hour that does not exist in March and the hour that occurs twice in October are read as summer time.
- **`from` later than `to` returns 200 with empty items.** Each value is valid, and the brief states no rule for the pair.
- **The list query is strict.** `page=1e1`, `page=1.5`, an empty value, a parameter given twice, `status=canceled` and the old `date` return 400. Each sort has the id as the last key, in the same direction, so two pages never show the same appointment and `desc` is the exact reverse of `asc`. The page and the total come from one read transaction. An unknown parameter returns 400 too; the brief says "any other value", and I read it to include a parameter name.
- **A legacy appointment at a day boundary has a direct test.** The API cannot create a legacy appointment, and the seed has none near midnight. The test writes them to a temporary database and calls the service.
- **`db:check` runs `drizzle-kit generate` on a temporary copy of the migrations folder** and fails when a new file appears. `drizzle-kit check` does not read `schema.ts`, and `generate` always exits with 0. The check uses the same command as `db:generate`, so the two cannot disagree. A renamed column or table fails the check too: drizzle-kit asks a question about a rename, and the check gives it no terminal, so it reports no clear result.
- **Two tests start two API processes on one database.** One sends the same appointment to both, the other moves two appointments to the same time. Without the immediate transaction both tests fail in each run, with two accepted appointments. With a deferred transaction they fail with 500. One process cannot show this race.
- **Tests call the code directly where no endpoint can reach the case**: the reminder job, the two time conversions, the `canceled` migration, the audit write that fails, and a legacy appointment at a day boundary. One more direct test is older than the routes it serves: the error handler, on a test app with routes that throw. The other tests use HTTP, or they start real processes: `db:migrate`, `db:seed`, `db:check`, the entry file of the API, and a `SIGTERM`.
- **Four small hardening changes**: no appointment request body in the logs (the refactor removed it), `busy_timeout` and WAL, a clean stop on `SIGTERM`, and `GET /health`. On `SIGTERM` the API closes the server and exits with code 0; a test checks the exit code and the closed port. Fastify lets an open request finish first, and no test covers that part. `GET /health` needs no API key and does not read the database.

## What I found in the appointments web pages

| Finding | Action |
|---|---|
| The BFF always returns 200, so a 409 looks like success | The BFF forwards the status code of the API (`fix`) |
| `NEXT_PUBLIC_API_KEY` ships the API key to the browser | The API URL and the key come from server-only environment variables |
| The Overview page calls the API directly | The Overview page calls a new BFF summary route |
| The create form closes whatever the result | The form shows the error and stays open (`fix`) |
| The status filter sends `canceled`, so it shows only legacy appointments | The filter sends `cancelled` (`fix`) |
| Times display in browser time, and the form reads the start time as browser time | Times display in venue time (Europe/Berlin), and the form reads the start time as venue time (`fix`) |
| The BFF sends any body and any id to the API, so `..%2Fcustomers` as an id reaches another API route | The appointment BFF handlers parse the body with the contract and accept digits only as an id |

## What did you skip, and why?

- **The BFF handlers of customers and treatments.** They still answer 200 for each API status. The brief limits the refactor to appointments.
- **The same rule for a special hour in the form and in legacy data.** In the hour that occurs twice in October, the form reads winter time and a legacy appointment reads summer time. In the hour that does not exist in March, the form moves the time one hour forward and a legacy appointment moves it one hour back. I assume that the venue is closed at 02:30.
- **The log of the customer request body.** `POST /customers` still prints the name, the email and the phone. The brief limits the work to appointments.
- **An edit form for a staff member.** The API and the BFF can change one, and the page only lists and creates. The brief asks for a list page and a create form.
- **A rollout plan for the new list contract.** `GET /appointments` changes its response shape and drops `date` in one release. During a rolling update, a web replica of the previous version gets a shape it cannot read. A versioned route, or a web release that reads both shapes first, closes this window.
- **Error bodies of customers and treatments.** They keep their four shapes. The brief limits the refactor to appointments.
- **Signed links for the confirmation page.** Appointment ids are sequential, so anyone can read a booking by its id. The page now gets only the id, the customer name, the treatment name and duration, the start and end time, the price and the status.
- **A browser check of the list controls.** The URL state has no automated test. I checked the production build, the page with a full query string, and the BFF answers. I did not click the controls in a browser.
- **A test runner for the web app.** No automated test calls a BFF route or a page. The confirmation fix has a test for the public schema, and the venue time fix has a test for the conversion. Five other web fixes have no test that fails before them: `2f3f152`, `bca1a4f`, `8c14178`, `ff7f535` and `3ebe0be`. I checked the first one by hand with requests that the API rejects. The other four change the page, which only a browser can show.
- **The same error order in the BFF and the API.** For an unknown id with an invalid body, `PATCH` answers 400 in the BFF and 404 in the API, because the BFF parses the body first.
- **Authentication in the web app.** The staff BFF route `/api/appointments/:id` still returns `notes` to anyone who has the URL. The confirmation page no longer calls it.
- **An outbox for reminders.** A crash between the claim and the send loses one reminder. So does a send that the email provider rejects, because the job does not retry.
- **A two-release rollout for soft delete.** During a rolling update, the previous version still shows a deleted appointment and still counts it in the overlap check. See `docs/migrations.md`.
- **A data migration for legacy start times.** The stored values stay as they are. The brief asks for the status fix only. The seed inserts legacy appointments after the migrations run, so each read needs the conversion in any case. A wrong rewrite of a start time also loses the value that the venue entered.
- **The SQL injection in `GET /customers?search=`.** The route still builds its SQL from the `search` value with `sql.raw`. The brief limits the work to appointments. This is the first fix before the API goes live.
- **The error body of the API key check.** A request with no key or a wrong key gets 401 with `{ error: 'Unauthorized' }`. The check came with the repo and answers in a hook, so the error handler does not make this body. The contract has no code for it. My plan did not cover it.
- **A new reminder for a moved appointment.** A change of the start time keeps the reminder mark. An appointment that moves after its reminder gets no reminder for the new time. No test covers this. A fix clears the mark when the start time changes.
- **`yarn dev` on a machine with two CPU cores.** The root `dev` script came with the repo. `yarn workspaces foreach --parallel` runs about half as many jobs as the machine has cores, so with two cores only the API starts. With four cores both apps start. The fix is `--jobs unlimited` in that script.
- **The customer cache of the appointments page.** The module-level `customerCache` came with the repo and nothing clears it. A customer that is created after the first load is absent from the create form until a reload. A status change that the API rejects also shows no message; the list only loads again.

## Behaviour that changed outside a `fix` commit

The appointments refactor keeps the status code and the body for each valid input. A differential run sent the same 151 requests to the code before the refactor (`4a4f10d`) and after it (`94a22e4`) to check this. I ran it again at the end, with the same result. These responses to invalid input changed:

| Input | Before | After the refactor |
|---|---|---|
| SQL in the `status` or `date` filter | 200 with all appointments, or 500 | 200 with an empty list |
| A filter sent twice (`?status=a&status=b`) | 200 with an empty list | 400 |
| `customerId` or `treatmentId` that is not a positive integer (`-1`, `1.5`, `"1"`, `[1]`, `true`) | 201, 404 or 500 | 400 |
| `notes` that is not a string or `null` | accepted, or 500 | 400 |
| An appointment whose customer or treatment row is missing (the seed has none; I wrote two to the database by hand) | 200 with a partial item, or 500 | absent from the list, 404 on read and update; the summary still counts it |
| The reminder job meets an appointment whose customer row is missing | The job throws, and sends no later reminder in that run | The job skips that appointment |

The list feature changed the first row again: the query is strict now, so that input returns 400 today.

**Error bodies changed too**, in the `refactor` commits `a99548f` and `94a22e4`. The README says that an error body is not part of the contract. Each appointment error now has the body `{ error: { code, message, details? } }`. The same handler changes the body of each error that Fastify makes itself, on all routes, customers and treatments included, and keeps the status code. Examples are a malformed JSON body (400), an unknown route (404) and an unexpected error (500). The 500 body no longer shows the text of the SQL error.

Three more changes have no effect on a response:

- **The in-memory booking lock is gone.** The service is now synchronous, so one process cannot interleave two bookings. The rule across replicas is a separate fix.
- **A booking is one insert with the real price.** Before, it was an insert with price 0 and then an update.
- **No log line prints an appointment request body.** The refactor commit `94a22e4` removed it.

## Characterization tests that changed

Each change is its own commit. Three commits touch the folder `apps/api/test/characterization`.

| Test | Before | After | Reason | Commit |
|---|---|---|---|---|
| `POST /appointments` "an appointment that starts as another one ends" | 409 | 201 | The README says back-to-back is fine. The test recorded a bug. | `c7c9db5`; the fix is `b59a55a` |
| The six `GET /appointments` tests ("returns every appointment with its customer and treatment", "orders ISO-timestamped appointments by start time", "computes endsAt from the treatment duration", "filters by status", "filters by date", "combines the status and date filters") | They read an array, and three use `?date=` | They read `items`, and the three use `?from=&to=`; two also check `total` | The brief replaces the list contract. The expected appointments are the same. | `7ea5fdc`; the feature is `a07f3a1` |
| The helper `helpers/server.ts` | No `delete` method | A `delete` method | The tests of `DELETE /appointments/:id` need it. No test in the folder changed. | `174428b` |

The test changes first, so the suite is red at `c7c9db5` (one test) and at `7ea5fdc` (six tests). The next commit makes it green.

`apps/api/test/appointments-edges.test.ts` is my own file, and it also records behaviour that the refactor had to keep. One of its tests recorded two bugs and changed in the same way, in two commits: `76c175c` (the legacy status) and `7b13069` (the legacy start time). My other tests that read the list changed inside the feature commit `a07f3a1`.

## What is wrong in the commit history

The brief forbids a rewrite of the history, so these stay. A script checked out each `refactor` and `fix` commit in a clone, and ran the tests at the commit and on its parent. `yarn test` is green at 9 of the 10 `refactor` commits. Of the 27 `fix` commits, 20 have an API test, and 19 of those tests fail on the parent.

| Commit | What is wrong |
|---|---|
| `f75dd8a`, `a99548f` | `yarn install --immutable` fails. `yarn.lock` already lists the contract package for the web app, and `apps/web/package.json` gets it only in `211698d`. A normal install works. |
| `f75dd8a` | One new test in `contract.test.ts` is red, because it expects the error body that the next commit adds. The characterization suite is green. |
| `17aec28` | A `fix` commit whose test also passes on the parent. It removes the staff order without regard to letter case. |
| `2f3f152`, `769901a`, `ff7f535` | Each holds more than one fix. |
| `2f3f152`, `bca1a4f`, `8c14178`, `ff7f535`, `3ebe0be`, `5f2cd7c`, `89ab2fd` | `fix` commits with no test: five change the web app, one changes a message of `db:check`, and one changes the web Dockerfile. I checked the last one with a build and a run of both images. |

## What `yarn verify` still reports

Five of seven checks pass: both typechecks, jscpd, `db:check` and the tests. Two fail, and each finding is in code that came with the repo. I left that code as it is, because the brief limits the work to appointments.

| Check | Finding | Where |
|---|---|---|
| ESLint | 18 errors: `any`, and two unused `reply` parameters | `apps/api/src/routes.ts`, the customers and treatments routes |
| ESLint | 1 error: `any` | `apps/web/app/treatments/page.tsx` |
| knip | The unused file `apps/api/src/utils/legacy.ts` | Its own comment says that nothing imports it |
| knip | The unused packages `lodash`, `@types/lodash` and `dayjs` | The two `package.json` files |

ESLint also prints 10 warnings: nine `console` statements and one hook dependency in the customers page. One of the nine is mine, the log of a failed shutdown in `apps/api/src/index.ts`. The others came with the repo. `apps/api/src/db/check-cli.ts` is also mine: it is a command line tool that prints its result, so it turns the rule off for that file.

The appointments module, the staff module, the contract package and the tests have no ESLint error and no warning. The mapper has its own `toStatus` and does not use `legacyStatus` from the unused file, because that one returns a plain `string` and not the status type of the contract.

## Where did the AI get something wrong, and how did you catch it?

- **Legacy `startsAt` in responses.** The AI first advised to return it as stored, to keep "today's shape". A second read of the README rule and of the ordering test, which skips legacy rows, showed that normalisation is correct.

- **Staff order without regard to letter case.** The AI ordered `GET /staff` with `COLLATE NOCASE`. The brief says "ordered by name", and its tests run against that contract. A review flagged the addition, and the plain order replaced it.

- **Loose ids in the routes.** The AI read each path id with `Number`, as the original code did. A review probed `DELETE /appointments/1e0`, and it deleted appointment 1. The routes now read the id with the id schema of the contract, and tests cover `1e0`, `0x1` and `1.0`.

- **Staff email in lower case.** The AI-written plan stored the email in lower case. A response would then differ from the input. The index on `lower(email)` gives the same uniqueness and keeps the value.

Each ticket ended with a review by a second agent that had not seen the work, and with real requests to the running API. These came out of that:

| Mistake of the AI | How it was caught | Result |
|---|---|---|
| After the overlap fix, a `PATCH` could set a cancelled appointment back to `confirmed` on top of a later booking, with no overlap check. | The review of the overlap fix | "Cancelling is final" (`50eb8c1`) closes it, with a test |
| `PATCH {"status":"cancelled"}` on a legacy appointment rewrote the stored `canceled`, although the response showed no change. | The review of the status fix | The service writes only a value that differs from the one the API shows |
| The list read the page and the total in two reads, so a write of another replica could make them disagree. Equal values kept ascending ids in a `desc` sort. | The review of the list | `769901a` |
| A `DELETE` with a JSON content type and no body returned 400. | The review of the delete feature sent the request | `18a3980` |
| An injection test passed on the old code too. The first test of the `canceled` migration ran the fix on an empty table. | The question "does it fail without the change?" in two reviews | The first changed before its commit; the second is `79acf95` |
| The API client of the web app was server-only in name. Nothing stopped an import from a browser component. | The review of the web refactor | The `server-only` package, before the commit |
| The decision record of the reminder said that a reminder is lost "only on a crash". A rejected send loses it too. The first `docs/migrations.md` said that each migration only adds. | A check of each sentence against the code | `5a12024` and `492dbb7` |
| A reviewer agent said that the previous API version gets `SQLITE_BUSY` at once during a booking. | The driver code: `better-sqlite3` waits 5 seconds by default | The claim did not go into the documents |
| The seed did not clear the staff table, so `db:seed` did not replace all data. | A fact check of these notes by a second agent | `6bf7206`, with a test |
| The AI rewrote the error classes as functions after a remark of mine, and it put a new test file in the characterization folder. | I saw both before the commit | Both reverted. A remark is not an instruction, and new tests go outside that folder |

## What would you do next with another day?

- **i18n.** The pages and the error messages hold English text in the code.
- **Import aliases.** The web handlers use paths such as `../../../../../lib/api`. An alias such as `@/lib/api` removes them.
- **oxlint and oxfmt in place of ESLint.** They run faster, so each check in the edit loop costs less. The repo has no formatter today.
- **Husky with pre-commit hooks.** Lint, typecheck and `db:check` run before each commit, not only in `yarn verify`.
- **CASL, if the app gets roles.** Today each caller with the API key can do all actions. With roles, one set of ability rules serves the API and the pages.
- **`@fastify/error` in place of the custom error classes.** It gives each error a code and a status in the way Fastify expects.
- **A debounce on the search.** The customers page sends a request for each key that the user presses in the search field. A debounce sends one request when the user stops. That page also has no guard against an older answer that arrives after a newer one; the appointments page has that guard.

## What would you want in place before this goes live?

- The fix for the SQL injection in `GET /customers?search=`.
- A database that is not one SQLite file. The booking transaction takes the write lock of the whole database, a replica that waits for it blocks its event loop for up to 5 seconds and then returns 500, and WAL mode needs all replicas on one host.

- Foreign keys, indexes and constraints on the three original tables.
- Mandatory authentication, and a CORS setting that is not `*`.
- Money as integer cents, not `REAL`.
- A readiness check that fails when the schema is behind the code, so the platform sends no request to that replica.
- A guard on `db:seed`. The script is in the production image, and it replaces all data. It has no guard, because the tests of the brief run it and I do not know their `NODE_ENV`.
- A pinned base image (a digest in place of `node:22-slim`), and a volume that Kubernetes mounts with the right owner.
- A clean stop for the web image. The Next server exits on `SIGTERM` with code 143 and does not wait for an open request.
- A structured logger. The Fastify logger is off, so an unexpected 500 leaves no log line today.
- An outbox with retry for reminders.
- Signed links for the customer confirmation page.
- A compile step for the API image.
