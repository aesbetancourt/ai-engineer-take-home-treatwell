# 21: Dockerfiles

**What to build:** One small production image for each app.

**Blocked by:** 01 Contract package and typed errors; 03 Appointments web through the contract; 11 Hardening; 18 Migrations as a release step

**Status:** ready-for-agent

- [ ] Each app has a multi-stage Dockerfile with a non-root user and production dependencies only
- [ ] Both images include the contract package
- [ ] The API image runs the `start` script; it can also run `db:migrate` as a separate command
- [ ] The API image has a health check on `GET /health`
- [ ] The web image uses the standalone output of Next
- [ ] Both images build, and the API image starts after `db:migrate`
- [ ] No CI, Kubernetes or cloud file is added
