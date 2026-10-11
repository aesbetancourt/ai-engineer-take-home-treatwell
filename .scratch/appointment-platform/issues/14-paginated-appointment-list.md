# 14: Paginated appointment list

**What to build:** `GET /appointments` returns one page of appointments, with filters and sorting, and the appointments page shows it.

**Blocked by:** 05 Status rules; 06 Start times in UTC; 10 Appointments page fixes

**Status:** done

- [x] The response is `{ items, page, pageSize, total }`; items keep the current shape
- [x] `page` starts at 1 (default 1); `pageSize` is 1 to 100 (default 20)
- [x] `status` accepts pending, confirmed, completed or cancelled; `cancelled` matches both stored spellings
- [x] `from` and `to` are `YYYY-MM-DD`, both inclusive, as dates in Europe/Berlin
- [x] `sortBy` is startsAt (default), createdAt or price; `sortDir` is asc (default) or desc; the id breaks ties
- [x] `total` counts every match; a page past the end returns empty items
- [x] An invalid value or an unknown parameter (the old `date` included) returns 400
- [x] `from` later than `to` returns 200 with empty items
- [x] The appointments page reads the new shape and has page controls
- [x] The characterization tests this breaks change in their own commit, and `NOTES.md` says so
- [x] New tests cover each parameter, each 400 case and a legacy appointment at a Berlin date boundary

## Comments

**From ticket 05.** The filter `status=cancelled` already matches both stored spellings. `status=canceled` is still accepted and returns only the legacy appointments, shown as `cancelled`. The strict query schema in this ticket must reject it with 400.

**From ticket 10.** The list BFF handler forwards the query string to the API and does not parse it. Parse it there with the new query schema. The old `date` filter matches the stored text, so it is the UTC date for a new appointment and the venue date for a legacy one; `from` and `to` in venue time replace it.

**From the history check (2026-10-11).** `769901a` holds two fixes in one commit: the read transaction, and the id tiebreak that follows the direction. Its test is red on the parent.
