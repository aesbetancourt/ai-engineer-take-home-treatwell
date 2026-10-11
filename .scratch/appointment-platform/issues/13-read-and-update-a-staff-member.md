# 13: Read and update a staff member

**What to build:** One staff member can be read and changed.

**Blocked by:** 12 Create and list staff members

**Status:** done

- [x] `GET /staff/:id` returns the staff member, or 404 for an unknown id (a non-numeric id included)
- [x] `PATCH /staff/:id` with any of name, email, active returns 200 and the staff member
- [x] `PATCH` returns 404 for an unknown id and 409 for a duplicate email
- [x] `PATCH` returns 400 for a blank name, a malformed email, a non-boolean active, an empty body, and a body with only unknown fields
- [x] BFF routes exist for both endpoints
- [x] Tests cover each status code above through HTTP
