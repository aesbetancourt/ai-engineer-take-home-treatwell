# CLAUDE.md

Instructions for AI coding agents that work in this repository.

## Repository overview

The backoffice of a beauty venue. It manages appointments, customers and treatments.

- `README.md` holds the business rules. If the code and a business rule disagree, the rule is correct.
- `docs/assessment.md` lists the known defects.
- `docs/plan.md` holds the ordered work plan.

### Workspace layout

```
apps/
  api/                 # Fastify 5, Drizzle ORM, better-sqlite3, ESM, run with tsx (no build step)
  web/                 # Next.js 16 App Router, React 19; route handlers are the BFF
packages/
  contract/            # Shared zod schemas (@venue/contract)
scripts/verify.mjs     # Runs all quality checks
```

```
browser ──> Next BFF route handlers (apps/web/app/api/*) ──> Fastify API ──> Drizzle ──> SQLite
```

### Production model

Treat this as the deployment target, although local development uses one SQLite file.

- The API and the web app each run as three replicas. A pod can stop at any time.
- A merge to `main` is a rolling update, so the old and the new version run together.
- All API replicas share one database.

## Commands

Yarn 4 workspaces, Node 22. Run commands from the repo root.

| Command | Use |
|---|---|
| `yarn dev` | Start the API (port 4000) and the web app (port 3000) |
| `yarn test` | Run the API test suite (Vitest) |
| `yarn verify` | Run `tsc`, ESLint, knip, jscpd and the tests. Add `--verbose` for full output. |
| `yarn db:generate` | Generate a Drizzle migration from `apps/api/src/db/schema.ts` |
| `yarn db:migrate` / `yarn db:seed` | Apply migrations / replace all data with the sample data |

```bash
yarn workspace @venue/api vitest run test/characterization/appointments.test.ts -t "<test name>"
```

`yarn verify` reports all results. Report each check that stays red, with the reason.

API environment variables: `PORT` (default 4000), `DB_PATH` (default `./data/backoffice.db`), `SEED_ON_BOOT` (set `false` to keep data across restarts), `API_KEY` (when set, the API requires the `x-api-key` header).

## Coding conventions

These rules apply to new and refactored code. Customers and treatments stay in `apps/api/src/routes.ts` and do not follow them yet.

### Layering

Each API module lives in `apps/api/src/modules/<name>/`:

| File | Responsibility |
|---|---|
| `<name>.routes.ts` | Parse input with the contract schemas. Call the service. Map the output. |
| `<name>.service.ts` | Hold the business rules. Throw typed errors. |
| `<name>.repository.ts` | Hold all Drizzle queries. Only this file imports Drizzle. |
| `<name>.mapper.ts` | Convert a database row to the response shape. |

The appointments module is the template. Each new module must have the same files and the same shape.

### Contract

- Put all zod schemas in `packages/contract/src/<name>.ts`.
- The API routes, the BFF handlers and the web pages import the same schemas.
- Get each type from `z.infer`.
- Follow the specified response shapes exactly. External test suites run against them.

### Errors

- Throw a subclass of `AppError` from `apps/api/src/shared/errors.ts`.
- One Fastify error handler makes each error body: `{ error: { code, message, details? } }`.

| Error class | Status |
|---|---|
| `ValidationError` | 400 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |

### Validation

- Parse each input at the boundary: the API route and the BFF handler.
- Use Drizzle operators for each query condition. They bind user input as parameters.

### Time

- Store and return UTC ISO 8601. Appointment `createdAt` is the exception: it stays epoch milliseconds, to keep the response shape.
- Convert legacy start times in one place: the generated column `starts_at_utc`. Each read path uses it.
- A new `startsAt` must be ISO 8601 with `Z` or an offset.
- The venue time zone is Europe/Berlin. Keep it in one constant.

### Database and migrations

- Change `schema.ts`, then run `yarn db:generate`. Read the generated SQL before you commit it.
- Each migration must work with the previous API version, because of the rolling update.
- Use a database transaction or a constraint to enforce a business rule across replicas.
- `better-sqlite3` transactions are synchronous. Give `db.transaction` a synchronous callback.

### TypeScript

- Give each value a type. ESLint rejects `any`.
- Use `import type` for type-only imports.
- Define each domain string once in the contract as a `z.enum` or an `as const` object. This includes status values, error codes and audit actions. Import it at the call site.
- Use `if`/`else` or an early return for a condition that has more than two results.
- Use one typed options object when a function needs more than three parameters.
- Give each exported service function a one-line JSDoc that names the business rule it enforces.

### Naming

| Item | Convention | Example |
|---|---|---|
| Files and folders | kebab-case, with the layer as a suffix | `appointments.service.ts` |
| Functions and variables | camelCase | `findOverlapping` |
| Types and React components | PascalCase | `Appointment`, `StaffForm` |
| Zod schemas | camelCase with the suffix `Schema` | `createStaffBodySchema` |
| Inferred types | The schema name without `Schema`, in PascalCase | `CreateStaffBody` |
| Route registration | `register<Name>Routes` | `registerStaffRoutes` |
| Boolean variables | A verb prefix: `is`, `has`, `can` | `isDeleted`, `hasOverlap` |
| Database columns | snake_case | `deleted_at` |

Contract fields and database columns use the names in the API specification (for example `active`), not the boolean prefix.

### Web

- Each page calls a BFF handler. Only `apps/web/lib/api.ts` calls the API.
- `lib/api.ts` reads the API URL and the API key from server-only environment variables.
- A BFF handler forwards the status code of the API.
- Keep list filters, sorting and pagination in the URL.
- Use a native `<button>` for each click action.
- Keep a confirmation step as page state, not `window.confirm`.
- Use a stable id as the React list key.

### Testing

- Test through HTTP when an endpoint exists. Use `startServer` from `apps/api/test/characterization/helpers/server.ts`. It starts the real API with `db:migrate`, `db:seed` and `start`, on a temporary database with `TZ=UTC`.
- Call a function directly only when no endpoint exists (the reminder job, the start time conversion). Use a temporary database.
- `apps/api/test/characterization` records current behaviour. Put the tests for a new module in `apps/api/test/<name>.test.ts`.
- Import `describe`, `expect` and `it` from `vitest`.
- For a successful response, assert the status code and the body. For an error, assert the status code only.
- Each test file shares one seeded database, and tests in a file depend on order. Add new tests at the end of a file.
- Cover each status code that the API specification names.

### Commits

- Make small commits. Keep the history as it is: no squash and no rewrite.
- Start each message with a Conventional Commits type: `refactor`, `fix`, `feat`, `test`, `docs` or `chore`.
- A `refactor` commit keeps each endpoint response the same. Run `yarn test` after each one.
- A `fix` commit holds one bug fix and a test that fails before the fix.
- When a characterization test records a bug, change that test in its own commit. Record it in `NOTES.md`.

## Data quirks

- New appointments store `startsAt` as UTC ISO 8601. Legacy rows from the seed store `YYYY-MM-DD HH:mm` in Europe/Berlin time, and some use the status `canceled`.
- `db:seed` runs after `db:migrate`, so a data-fix migration does not remove legacy rows. Reads must normalise them.
- Appointment `createdAt` is epoch milliseconds. Customer `createdAt` is ISO text.

## Important constraints

1. **Keep the script names `db:migrate`, `db:seed` and `start`** in `apps/api/package.json`. External test suites call them.
2. **Do not change customers or treatments** more than the appointments work needs.
3. **Do not keep a business rule in process memory.** Three replicas share one database.
4. **Do not use `sql.raw` or string concatenation** on user input.
5. **Do not use `drizzle-kit push`.** Each schema change needs a generated migration.
6. **Do not write a DTO type by hand.** Get it from the contract.
7. **Do not send `notes` to a customer-facing page.** They are for staff only.
8. **Do not change a characterization test in a `refactor` commit.**

## Agent skills

### Issue tracker

Issues are local markdown files in `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels apply. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
