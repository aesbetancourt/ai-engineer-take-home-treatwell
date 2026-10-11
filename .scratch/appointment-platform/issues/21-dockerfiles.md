# 21: Dockerfiles

**What to build:** One small production image for each app.

**Blocked by:** 01 Contract package and typed errors; 03 Appointments web through the contract; 11 Hardening; 18 Migrations as a release step

**Status:** done

- [x] Each app has a multi-stage Dockerfile with a non-root user and production dependencies only
- [x] Both images include the contract package
- [x] The API image runs the `start` script; it can also run `db:migrate` as a separate command
- [x] The API image has a health check on `GET /health`
- [x] The web image uses the standalone output of Next
- [x] Both images build, and the API image starts after `db:migrate`
- [x] No CI, Kubernetes or cloud file is added

## Comments

**From the history check (2026-10-11).** The web image was built before `89ab2fd`. That commit adds the `HEALTHCHECK` and changes `.dockerignore`, and no build ran after it.

**From ticket 23 (2026-10-11).** Both images were built again at `492dbb7`, whose code is the code of `89ab2fd`, in a Docker VM with 4 GiB. `db:migrate` ran two times, then `db:seed`. The API ran with a key and the web image ran against it: the pages and the BFF answer 200, both containers report `healthy`, the API stops with exit code 0 and the web server with 143.

**From ticket 24 (2026-10-11).** Both images were built and run again at `21ec1a5`, after the seed fix `6bf7206`, with the same result.
