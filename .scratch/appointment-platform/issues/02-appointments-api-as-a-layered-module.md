# 02: Appointments API as a layered module

**What to build:** The appointment endpoints run through routes, a service, a repository and a mapper. Only the repository uses Drizzle. Each endpoint returns the same status code and body as before for valid input.

**Blocked by:** 01 Contract package and typed errors

**Status:** ready-for-agent

- [ ] Routes parse input with the contract schemas and map output
- [ ] The service holds the overlap check, the price copy and the status check, and throws typed errors
- [ ] The list uses one joined query, not one query per appointment
- [ ] Query conditions use bound parameters; no `sql.raw` on user input remains
- [ ] An unknown `status` value still returns 200 with an empty list
- [ ] The response mapping exists in one place
- [ ] Customers and treatments are unchanged
- [ ] Each commit is a `refactor` commit and the characterization suite is green after each one
- [ ] `NOTES.md` states the one changed response: injection input returned 500 and now returns 200 with an empty list
