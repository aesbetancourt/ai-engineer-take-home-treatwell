# 12: Create and list staff members

**What to build:** A staff member can be created and listed, from the database to the page. The module has the same shape as the appointments module.

**Blocked by:** 02 Appointments API as a layered module; 03 Appointments web through the contract

**Status:** done

- [x] A generated migration creates the staff table: id, name, email, active (default true), createdAt; with a unique index on the lower-case email
- [x] `POST /staff` with name and email returns 201 and `{ id, name, email, active, createdAt }`, with `createdAt` in ISO 8601
- [x] `GET /staff` returns an array ordered by name
- [x] The email is stored and returned as sent, trimmed
- [x] A second staff member whose email differs only in letter case returns 409
- [x] A blank name or a malformed email returns 400
- [x] The repository maps the unique-constraint error of that index to the conflict error
- [x] The module has routes, a service, a repository and a mapper, and its schemas are in the contract
- [x] BFF routes, a list page, a create form and a navigation link exist
- [x] Tests cover each status code above through HTTP

## Comments

**From the history check (2026-10-11).** `17aec28` is a `fix` commit whose test is green on the parent too. It removes `COLLATE NOCASE` from the staff order, and the seeded names sort the same in both orders. So this one `fix` commit has no test that fails before it.

**From ticket 23 (2026-10-11).** The seed did not clear the staff table, so a second `db:seed` kept each staff member. `6bf7206` clears it, with a test in `migrations.test.ts` that fails before the fix.
