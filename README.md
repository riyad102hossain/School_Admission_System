# School Admission System

An online admission system for a school where seats are given on a first-come, first-served basis.

- Each class or shift has a fixed number of seats.
- When a student applies, a seat is **held** for a limited time.
- The admission is **confirmed** once the fee is paid before the hold expires.
- An unpaid hold **expires** on its own and the seat becomes free again.

The seat limit holds under any amount of concurrent traffic, including several API processes sharing one database.

## Quick start

You need **Docker** with Docker Compose. Nothing else.

```bash
docker compose up
```

The first start builds the images, which takes a few minutes. Then open:

| What | URL |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:8080 |
| API docs (Swagger UI) | http://localhost:8080/swagger |
| PostgreSQL | `localhost:5433` (user, password and database: `admission`) |

Data is kept in the `pgdata` Docker volume, so it survives `docker compose down` / `up`. To start again from an empty database, run `docker compose down -v`.

### Trying it out

1. Enter a 17-digit student ID (birth registration number) in the box at the top, e.g. `20151234567890123`.
2. **নতুন ক্লাস**: create a class, e.g. "Class 6 - Morning" with 2 seats.
3. **ক্লাস তালিকা**: press **আবেদন করুন**. A seat is held and the application screen opens with a countdown.
4. Press **ভর্তি ফি দিন** to confirm, or **বাতিল** to cancel. If you wait until the countdown ends, the application turns `EXPIRED` and payment is disabled. No reload is needed.
5. **আমার আবেদন** lists all applications for the current student ID. It still works after a refresh or a browser restart.

To watch expiry without waiting 10 minutes, use a shorter hold:

```bash
HOLD_DURATION_SECONDS=30 docker compose up
```

## Configuration

All settings are environment variables with working defaults. To change them, copy `.env.example` to `.env`, or set them in the shell.

| Variable | Default | Used by | Meaning |
|---|---|---|---|
| `HOLD_DURATION_SECONDS` | `600` | api | How long a seat stays held before it expires |
| `EXPIRY_SWEEP_INTERVAL_SECONDS` | `2` | api | How often the background job releases expired seats |
| `API_URL` | `http://localhost:${API_PORT}` | frontend | API address **as seen from the browser**. Read when the container starts, so no rebuild is needed. |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `admission` | db, api | Database name and credentials (local defaults only) |
| `API_PORT` | `8080` | api | Host port of the API |
| `FRONTEND_PORT` | `3000` | frontend | Host port of the web app |
| `DB_PORT` | `5433` | db | Host port of PostgreSQL. Not 5432, to avoid clashing with a local PostgreSQL. |
| `API_2_PORT` | `8081` | api-2 | Host port of the optional second API process (see below) |

Inside Compose, the API gets its connection string from `ConnectionStrings__Default`, which is built from the database variables above.

## API

The full contract, with request and response examples, is on the Swagger page. Student-specific endpoints identify the student with the `X-Student-Id` header (exactly 17 digits).

| Method | Path | Header | Success | Errors |
|---|---|---|---|---|
| `POST` | `/classes` | | `201` class | `400` |
| `GET` | `/classes` | | `200` list with `heldSeats`, `confirmedSeats`, `availableSeats` | |
| `GET` | `/classes/{classId}` | | `200` class | `404` |
| `POST` | `/classes/{classId}/holds` | ✓ | `201` hold (`HELD`, `expiresAt`) | `400`, `404`, `409` full or already applied |
| `GET` | `/holds/{holdId}` | | `200` hold | `404` |
| `POST` | `/holds/{holdId}/confirm` | ✓ | `200` `CONFIRMED` (idempotent) | `400`, `403`, `404`, `409` expired or cancelled |
| `DELETE` | `/holds/{holdId}` | ✓ | `204` | `400`, `403`, `404`, `409` already confirmed |
| `GET` | `/me/holds` | ✓ | `200` the student's applications with `className` | `400` |

Every error has the same body, `{ "error": "NO_SEATS_AVAILABLE", "message": "..." }`. Bad input always returns `4xx`, never `500`.

## How it works

**No overbooking.** Every seat change (hold, confirm, cancel, expire) runs in a transaction that first locks the class row with `SELECT ... FOR UPDATE`. PostgreSQL then handles requests for the same class one at a time, whichever API process they come from. Requests for different classes still run in parallel. The database has two safety nets on top of that:

- a check constraint `held_seats + confirmed_seats <= total_seats`;
- a partial unique index that allows only one active (`HELD` or `CONFIRMED`) hold per student per class.

**Expiry.** A background service releases overdue holds every 2 seconds, without any request needed. Every read or write of a hold also checks expiry first, so an expired hold is never treated as `HELD`. On the screen, the countdown switches to `EXPIRED` the moment it reaches zero.

**Idempotent confirm.** Confirming an already confirmed hold returns `200` again and changes nothing, so `confirmedSeats` grows only once.

The reasoning behind these and other decisions is in [ASSUMPTIONS.md](ASSUMPTIONS.md).

## Running two API processes (bonus)

```bash
docker compose --profile two-apis up
```

This starts a second API (`api-2`) on port 8081, on the same database. Both apply the seat rules safely because the locking happens in PostgreSQL. Database migrations are also locked, so only one process applies them. You can check this by sending concurrent holds to both ports. For example, with the ID of a 10-seat class:

```bash
seq 100 299 | awk '{print (NR%2 ? 8080 : 8081) " 20150000000000" $1}' \
  | xargs -P 200 -n 2 sh -c 'curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:$0/classes/<classId>/holds -H "X-Student-Id: $1"' \
  | sort | uniq -c
#  10 201
# 190 409
```

The automated test `Two_api_instances_sharing_the_database_never_overbook_the_class` checks the same thing.

## Tests

**Backend** (37 tests: xUnit, `WebApplicationFactory`, real PostgreSQL via Testcontainers). Docker must be running; the tests start and remove their own database container.

```bash
cd backend
dotnet test
```

The tests include:

- **concurrency:** 200 simultaneous holds on 10 seats, with one and with two API instances; duplicate holds; concurrent confirms;
- **expiry:** on access and from the background job, using a controllable clock;
- **hold rules:** cancel and re-apply, ownership (`403`), `/me/holds`;
- **validation:** invalid input of many kinds.

**Frontend** (17 tests: Vitest and Testing Library)

```bash
cd frontend
npm ci
npm test
```

The tests include:

- the countdown switching to `EXPIRED` without a reload, which disables payment;
- paying;
- friendly error messages;
- student ID validation and remembering it across reloads;
- class list states.

## Local development without Docker

Requirements: .NET 10 SDK and Node.js 20.19 or newer.

```bash
docker compose up -d db                       # just the database, on port 5433

cd backend/src/SchoolAdmission.Api
dotnet run                                    # API on http://localhost:8080

cd frontend
npm ci
npm run dev                                   # web app on http://localhost:5173
```

The development connection string is in `appsettings.Development.json`. To point the dev frontend at another API, set `VITE_API_URL`.

## Project structure

```
backend/
  src/SchoolAdmission.Api/
    Domain/        SchoolClass, Hold, HoldStatus
    Data/          EF Core DbContext and migrations
    Services/      HoldService (seat rules), HoldExpiryService (background job)
    Endpoints/     minimal API routes
    Contracts/     request and response shapes
    Errors/        error codes and the exception-to-response handler
  tests/SchoolAdmission.Api.Tests/
  Dockerfile
frontend/
  src/
    api/           API client, types, Bengali error messages
    pages/         class list, create class, application, my applications
    components/    student ID box, status badge, seat bar, alerts
    hooks/         polling and countdown clock
  Dockerfile, nginx.conf, docker/ (writes config.js from API_URL at start-up)
docker-compose.yml
```

## Notes

- On the very first start with an empty database, the API log shows one `fail: ... SELECT ... FROM "__EFMigrationsHistory"` entry. This is EF Core checking for a migrations table that doesn't exist yet. It is harmless; the migration is applied straight after.
- [ASSUMPTIONS.md](ASSUMPTIONS.md) lists the decisions taken where the brief left things open.
- [AI_USAGE.md](AI_USAGE.md) describes how AI tools were used and how their output was checked.
