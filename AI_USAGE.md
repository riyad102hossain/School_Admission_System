# AI Usage

## Tool

- **Claude Code** (model: Claude Opus 5.5), running as the VS Code extension.

## How I used it

| Area | What the AI did | What I did |
|---|---|---|
| Planning | Split the assignment into phases (setup → backend → tests → Docker → frontend → docs) with a time estimate for each. | Chose the order and the deadline-based schedule. |
| Backend code | Wrote the EF Core models, migration, endpoints, validation, error handling and the background expiry service. | Gave the requirements phase by phase, reviewed the changes, and decided the open questions listed in `ASSUMPTIONS.md`. |
| Verification | Ran the API against a real PostgreSQL container and tested it with `curl`, including concurrent load tests. | Checked the results and ran and pushed every commit myself. |
| Docs | Drafted `ASSUMPTIONS.md` and this file while the code was being written. | Reviewed and edited them. |

All code was run against a real database before it was committed. I didn't accept anything that hadn't been tested.

## Where the AI's first approach was wrong or had to change

1. **Seat locking strategy.** The plan used a conditional `UPDATE ... WHERE held + confirmed < total` for holds. When confirm, cancel and expiry were added, a single rule was simpler and easier to reason about. Every seat change now locks the class row (`SELECT ... FOR UPDATE`) inside a transaction, always class first, then holds, so there are no deadlocks.
2. **Migration not applied.** The first run created only the migrations history table. The API had been started with `--no-build` from a binary built before the migration was added. Rebuilding fixed it.
3. **Port clash.** PostgreSQL on host port 5432 clashed with another database on my machine. The host port is now configurable and defaults to 5433.
4. **Load test script bug.** In one concurrency test every request returned `400`. The script used `seq`, which printed the 17-digit student IDs as `1e+16`. This was a bug in the test script, not the API. The API correctly rejected the invalid IDs.
5. **Timestamp precision.** `expiresAt` from `POST /classes/{id}/holds` had 7 decimal places, but later reads returned 6 (PostgreSQL stores microseconds). Timestamps are now trimmed to microseconds, so the values always match.
6. **500 errors under load with two API processes.** This was the most important finding. We ran two API processes on one database and sent 200 concurrent requests. There was no overbooking, but 35 requests failed with `500`. The cause was PostgreSQL's "too many clients" error: each process could open up to 100 connections, and the database allows 100 in total. Fixes:
   - The pool is capped at 20 connections per process.
   - A database overload now returns `503 SERVICE_BUSY` instead of `500`.
   - After the fix, three repeated runs gave exactly 10 × `201` and 190 × `409`, with no errors.

## Things I checked by hand

- **Overbooking:**
  - 200 concurrent hold requests on a 10-seat class, split across two API processes, gave exactly 10 successes.
  - The database check constraint rejects overbooking even when it is attempted with direct SQL.
- **Idempotent confirm:** 50 concurrent confirms of the same hold gave `confirmedSeats = 1`.
- **Expiry without API calls:** after waiting past `expiresAt` with no requests, every hold was `EXPIRED` and its seats were released, each exactly once, even with two sweepers running.
- **Bad input never returns 500:** invalid JSON, wrong types, a missing body, a bad `X-Student-Id`, malformed IDs, an unknown route and a wrong HTTP method all return `4xx` with a readable message.

## Automated tests

- **The AI wrote 38 backend tests** (xUnit, `WebApplicationFactory`). They run against a real PostgreSQL started by Testcontainers. Time is controlled with `FakeTimeProvider`, so expiry tests don't have to wait.
- **The tests cover:**
  - 200 concurrent holds on 10 seats, with one API instance and with two;
  - concurrent duplicate holds and concurrent confirms;
  - expiry, both on access and by the background job;
  - cancel and re-apply;
  - ownership checks;
  - `/me/holds`;
  - timestamps in the contract's `...Z` format;
  - invalid input.
- **Checking that the tests can actually fail.** All the tests passed on the first run. A first-run pass can mean a test checks nothing, so I removed the `FOR UPDATE` row lock and ran the concurrency tests again. Both overbooking tests failed, with more than 10 students getting a seat. I then restored the lock.
- **Package version conflict.** The test project failed to build. The API compiled against EF Core 10.0.14 (pulled in by the design-time package), but the Npgsql provider brought in 10.0.4. The fix was an explicit reference to EF Core 10.0.14 in the API project.

## Docker

- **The AI wrote the backend Dockerfile and the `api` service in `docker-compose.yml`.** The Dockerfile has two stages: build with the SDK image, run as non-root on the ASP.NET runtime image.
- **Checked by hand:**
  - data survives `docker compose down` / `up`;
  - `HOLD_DURATION_SECONDS` set in the environment reaches the container.
- **A misleading log error.** The first container run logged `libgssapi_krb5.so.2: cannot open shared object file`. Npgsql probes for Kerberos encryption by default, and the runtime image doesn't include that library. Password login was unaffected. Setting `Gss Encryption Mode=Disable` in the connection string removed the error.

## Frontend

- **The AI wrote the React app** (Vite + TypeScript, React Router):
  - pages: class list, create class, application screen with countdown, my applications;
  - the student ID box;
  - polling, Bengali error messages;
  - the nginx-based Dockerfile with runtime `API_URL` configuration.
- **The AI caught and fixed these issues before they shipped:**
  - **Polling without an ID.** With no student ID entered, the pages would have polled `/me/holds` every few seconds and received `400`. Polling now waits until an ID is set.
  - **Old data after changing the ID.** The previous student's applications could flash on screen until the new list arrived. Polled data is now cleared when its source changes.
  - **Linter warning.** The linter flagged a file that exported both a component and helpers, which breaks hot reload during development. The file was split in two.
- **End-to-end check in a real browser.** A headless Chrome script (Puppeteer, not part of the repo) ran against the full `docker compose` stack, with a 12-second hold duration. It checked:
  - the student ID validation;
  - creating a class from the UI;
  - applying;
  - the countdown, and that `EXPIRED` appears without a reload and the pay button becomes disabled;
  - applying again and paying;
  - that applications are still listed after a reload;
  - the "class full" state and another student's hold;
  - that seat counts change on screen when a hold is made from outside;
  - an unknown hold ID;
  - no horizontal scrolling at phone width;
  - no console errors.

  I reviewed the screenshots of each step.

## Bonus work

- **Frontend tests.** The AI wrote 19 Vitest and Testing Library tests, including two that check an unexpected UI error shows a message instead of a blank page. To check they can fail, it made the application screen show the server's status instead of the locally computed one. The "`EXPIRED` without a reload" test failed as expected; the change was then reverted.
- **Two API processes.** The AI added an optional `api-2` service (`--profile two-apis`). Two checks were run:
  - **Concurrent holds:** 200 holds split across both processes gave exactly 10 × `201` and 190 × `409`.
  - **First start on an empty database:** both processes started at once in a separate Compose project with a fresh volume. The migration ran exactly once and neither container restarted. The restart count was checked on purpose, because `restart: unless-stopped` could otherwise hide a crash.

## Documentation

- The AI drafted `README.md` (quick start, configuration, API summary, design notes, how to run the tests), as well as this file and `ASSUMPTIONS.md`. I reviewed and edited them.
