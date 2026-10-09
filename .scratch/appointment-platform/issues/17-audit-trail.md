# 17: Audit trail

**What to build:** Each create, update and delete of an appointment writes an audit entry, and the audit trail of an appointment can be read.

**Blocked by:** 07 No double-booking across replicas; 16 Delete an appointment

**Status:** ready-for-agent

- [ ] A generated migration creates the audit table
- [ ] The audit entry is written in the same synchronous transaction as the change
- [ ] `GET /appointments/:id/audit` returns `{ action, appointmentId, at, changes }` entries, oldest first
- [ ] `action` is create, update or delete; `at` is ISO 8601
- [ ] `changes` maps each field to `{ from, to }`; create has `from: null`, delete has `to: null`
- [ ] An update entry holds only the fields that changed
- [ ] A `PATCH` that changes no value returns 200 and writes no entry; the reminder mark writes no entry
- [ ] A deleted appointment keeps its audit trail (200); an id that never existed returns 404
- [ ] A seeded appointment with no changes returns 200 with an empty array
- [ ] Tests cover each point above through HTTP
