# 12: Create and list staff members

**What to build:** A staff member can be created and listed, from the database to the page. The module has the same shape as the appointments module.

**Blocked by:** 02 Appointments API as a layered module; 03 Appointments web through the contract

**Status:** ready-for-agent

- [ ] A generated migration creates the staff table: id, name, email, active (default true), createdAt; with a unique index on the lower-case email
- [ ] `POST /staff` with name and email returns 201 and `{ id, name, email, active, createdAt }`, with `createdAt` in ISO 8601
- [ ] `GET /staff` returns an array ordered by name
- [ ] The email is stored and returned as sent, trimmed
- [ ] A second staff member whose email differs only in letter case returns 409
- [ ] A blank name or a malformed email returns 400
- [ ] The repository maps the unique-constraint error of that index to the conflict error
- [ ] The module has routes, a service, a repository and a mapper, and its schemas are in the contract
- [ ] BFF routes, a list page, a create form and a navigation link exist
- [ ] Tests cover each status code above through HTTP
