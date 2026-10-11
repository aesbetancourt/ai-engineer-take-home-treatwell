# 24: Final verify

**What to build:** The submission is checked as a whole.

**Blocked by:** All tickets 01 to 23

**Status:** done

- [x] `yarn verify` is run, and `NOTES.md` gives the reason for each check that stays red
- [x] A fresh clone starts with `yarn dev`, and each page loads
- [x] `db:migrate`, `db:seed`, `start` in that order give a working API
- [x] The commit history is small commits with no squash and no rewrite

## Comments

**From the history check (2026-10-11).** Done ahead of this ticket, in a clone: `yarn test` is green at each `refactor` commit except `f75dd8a` (see ticket 01), and the test of each `fix` commit with an API test is red on the parent, except `17aec28` (see ticket 12). The four criteria stay open until the last commit exists.

**From ticket 23 (2026-10-11).** `yarn verify` ran after the last code commit (`6bf7206`): 5 of 7 checks pass, 270 tests pass, and `NOTES.md` gives the reason for the two red checks. Both images were built and run at `492dbb7`. Still open here: the fresh clone with `yarn dev` and each page, and the last look at the history after the final commits.

**Result (2026-10-11), at `21ec1a5`.**

- **`yarn verify`** in a fresh clone: 5 of 7 checks pass, as in the working repo. ESLint has 19 errors and 10 warnings, and knip has 4 findings, all named in `NOTES.md`.
- **The three scripts** in a fresh clone, on an empty database: `db:migrate`, `db:seed`, `start`. The API answers: 14 appointments, 8 customers, 8 treatments, no staff member. A staff member and an appointment can be created, the audit trail is there, and a delete returns 204.
- **`yarn dev`** from the committed files (`git archive HEAD`) in a clean Node 22 container, with the README steps `corepack enable`, `yarn install`, `yarn dev`. Ports 3000 and 4000 of the host were in use by the dev server of the author. Each page answers 200: Overview, Appointments (also with a full query string), Customers, Treatments, Staff and the confirmation page. Each BFF route returns data, and a create, a conflict (409) and a delete work through the BFF. The check is by HTTP: it does not run the page code of the browser.
- **A finding:** with two CPU cores, `yarn dev` starts only the API. `yarn workspaces foreach --parallel` runs about half as many jobs as the machine has cores. The script came with the repo. `NOTES.md` states it.
- **The history:** 76 commits, 75 by the author, no merge commit. The author date equals the committer date in each commit, the dates are in order, and the reflog holds one clone and 75 commits, with no amend, rebase or reset. Without the lockfile and the generated snapshots, a commit changes 43 lines in the median, 163 at the 90th percentile and 551 at most (the first docs commit). The two largest code commits are the audit trail (441 lines) and the list (438 lines), each with its tests.
- **Both images** build at this commit and report `healthy` when they run together.
- **Not pushed:** `origin/main` is the initial commit, and the 75 commits and the three tags are local.

