# 01: Contract package and typed errors

**What to build:** One shared contract package holds the zod schemas for the current appointment responses, the appointment inputs and the error body. The API has typed errors and one error handler that makes one error body. No endpoint response changes.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The contract package is a workspace package that the API and the web app can import as TypeScript source, with no build step
- [x] Each type comes from a schema with `z.infer`
- [x] The schemas describe what the API returns today, legacy values included
- [x] A thrown typed error becomes `{ error: { code, message, details? } }` with status 400, 404 or 409
- [x] Customers and treatments keep their current error bodies
- [x] The characterization suite is green after each commit

## Comments

**From the history check (2026-10-11).** The characterization suite is green at `f75dd8a` and `a99548f`. Two defects stay in the history. At both commits `yarn.lock` already lists `@venue/contract` for the web app, and `apps/web/package.json` gets it only in `211698d`, so `yarn install --immutable` fails there. At `f75dd8a` one new test in `contract.test.ts` is red: it expects the error body that `a99548f` adds.
