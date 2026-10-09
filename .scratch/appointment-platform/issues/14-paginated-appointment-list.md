# 14: Paginated appointment list

**What to build:** `GET /appointments` returns one page of appointments, with filters and sorting, and the appointments page shows it.

**Blocked by:** 05 Status rules; 06 Start times in UTC; 10 Appointments page fixes

**Status:** ready-for-agent

- [ ] The response is `{ items, page, pageSize, total }`; items keep the current shape
- [ ] `page` starts at 1 (default 1); `pageSize` is 1 to 100 (default 20)
- [ ] `status` accepts pending, confirmed, completed or cancelled; `cancelled` matches both stored spellings
- [ ] `from` and `to` are `YYYY-MM-DD`, both inclusive, as dates in Europe/Berlin
- [ ] `sortBy` is startsAt (default), createdAt or price; `sortDir` is asc (default) or desc; the id breaks ties
- [ ] `total` counts every match; a page past the end returns empty items
- [ ] An invalid value or an unknown parameter (the old `date` included) returns 400
- [ ] `from` later than `to` returns 200 with empty items
- [ ] The appointments page reads the new shape and has page controls
- [ ] The characterization tests this breaks change in their own commit, and `NOTES.md` says so
- [ ] New tests cover each parameter, each 400 case and a legacy appointment at a Berlin date boundary
