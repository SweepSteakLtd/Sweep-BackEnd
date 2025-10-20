Sweepsteak BackEnd
===================

This repository contains the backend for the Sweepsteak project — an Express + TypeScript API using Drizzle ORM and Supabase for persistence. The codebase includes handlers grouped by domain (games, users, transactions, etc.), OpenAPI-like `apiDescription` annotations, and a set of unit tests using Jest.

Quick start
-----------

Prerequisites

- Node.js (18+ recommended)
- Yarn or npm

1) Install dependencies

```bash
yarn install
# or
# npm install
```

2) Configure environment

Create a `.env` (or export variables) with at least the following values used by the services:

- `BE_DATABASE_PASSWORD` - database password

For local development you can set `APPLIED_ENV=local` and run the local scripts in `package.json`.

Build & run
-----------

```bash
# Build TypeScript
yarn tsc

# Run the compiled build
node build/index.js
```

Or use the provided dev scripts:

```bash
yarn dev
# or with no auth (for local testing)
yarn dev:noauth
```

Project structure (high level)
------------------------------

- `src/handlers/` - Request handlers grouped by domain (games, user, bets, etc.)
- `src/routes/` - Route wiring and apiDescription usage
- `src/services/` - External services (Supabase/Drizzle database, Firebase, etc.)
- `src/models/` - Database models (Drizzle schema)
- `src/services/__mocks__/` - Jest manual mocks used by unit tests

Testing
-------

Tests are written with Jest and TypeScript. There is no `test` script in `package.json` by default; run tests with:

```bash
yarn jest
# or using npx
# npx jest
```

Manual service mock

- A manual Jest mock lives at `src/services/__mocks__/index.ts`. Tests import `database` from `../../services` and the manual mock is used when tests call `jest.mock('../../services')`.
- The mock exports a `database` object with chainable methods (`select`, `insert`, `update`, `delete`). Default mock implementations throw helpful errors so each test must explicitly `spyOn` and mock behaviour for the DB calls it relies on.

Running a single test file
-------------------------

```bash
yarn jest src/handlers/games/createGame.test.ts -i --runInBand
```

Common issues
-------------

- If tests complain about unmocked database calls, ensure the test file contains `jest.mock('../../services');` and that it `spyOn`s the `database` method used (for example `jest.spyOn(database, 'select').mockImplementation(...)`).

Contributing notes
------------------

- Keep handler functions small and testable. Each handler should have unit tests covering happy-path, validation errors, and DB failures.
- When adding handlers that use the `database` service, add explicit `jest.spyOn(database, '<method>')` in tests. The manual mock helps ensure no accidental live DB calls happen during tests.

TODO
----

- Add a `test` script in `package.json` for convenience.
- Extract test utilities (mockResponse, mockNext, db mock helpers) to `tests/utils.ts` to reduce duplication across test files.

---

If you'd like I can:

- run the test suite and report failures
- add the convenience `test` script to `package.json`
- extract shared test helpers into a utility file
