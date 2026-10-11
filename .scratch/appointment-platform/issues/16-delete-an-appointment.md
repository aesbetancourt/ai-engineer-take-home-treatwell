# 16: Delete an appointment

**What to build:** A staff member can delete an appointment. A deleted appointment is absent from all reads and rules.

**Blocked by:** 14 Paginated appointment list

**Status:** done

- [x] A generated migration adds a nullable deletion time to appointments; it adds one column
- [x] `DELETE /appointments/:id` returns 204
- [x] It returns 404 for an unknown id and for a deleted appointment
- [x] A deleted appointment is absent from the read by id, the list, `total`, the summary and the overlap check
- [x] A `PATCH` of a deleted appointment returns 404
- [x] The reminder job skips a deleted appointment
- [x] The test helper has a `delete` method
- [x] Each row of the appointment list has a delete button with a confirmation step held in page state
- [x] Tests cover each point above through HTTP
