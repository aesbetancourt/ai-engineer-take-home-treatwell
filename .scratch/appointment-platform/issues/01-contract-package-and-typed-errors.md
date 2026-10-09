# 01: Contract package and typed errors

**What to build:** One shared contract package holds the zod schemas for the current appointment responses, the appointment inputs and the error body. The API has typed errors and one error handler that makes one error body. No endpoint response changes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The contract package is a workspace package that the API and the web app can import as TypeScript source, with no build step
- [ ] Each type comes from a schema with `z.infer`
- [ ] The schemas describe what the API returns today, legacy values included
- [ ] A thrown typed error becomes `{ error: { code, message, details? } }` with status 400, 404 or 409
- [ ] Customers and treatments keep their current error bodies
- [ ] The characterization suite is green after each commit
