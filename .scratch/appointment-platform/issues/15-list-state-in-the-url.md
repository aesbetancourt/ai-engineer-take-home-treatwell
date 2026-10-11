# 15: List state in the URL

**What to build:** The page, the filters and the sorting of the appointment list are in the URL, so the page can be reloaded and shared.

**Blocked by:** 14 Paginated appointment list

**Status:** done

- [x] The page reads page, pageSize, status, from, to, sortBy and sortDir from the URL
- [x] Each change of a control updates the URL
- [x] A reload shows the same list
- [x] A change of a filter goes back to page 1

## Comments

**From the history check (2026-10-11).** `ff7f535` holds several small fixes in one commit, and no automated test covers the page.
