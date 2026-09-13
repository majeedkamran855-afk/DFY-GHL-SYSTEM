# WholesaleOS

A standalone, property-first CRM for US real estate wholesaling companies.

## Phase 1 foundation

The `codex/secure-phase-1` branch implements the first usable vertical slice:

- company registration and user login
- random, hashed, database-backed sessions in HttpOnly cookies
- server-enforced organization isolation
- property and seller/contact creation
- acquisition deal creation and stage-history auditing
- MAO calculation with unit tests
- a responsive browser UI without unsafe HTML interpolation

The architecture and workflow reference material remains under `docs/` and `src/workflow/`.
Workflow activities are still design-stage stubs and are not part of the running server.

## Local setup

1. Copy `.env.example` to `.env` and provide a fresh PostgreSQL connection.
2. Run `npm install`.
3. Run `npm run prisma:generate`.
4. Run `npm run db:migrate`.
5. Run `npm test`.
6. Run `npm start`, then open `http://localhost:3000`.

Passwords must be at least 12 characters. Production cookies are marked `Secure` when
`NODE_ENV=production`.

## Security notice

The original repository committed an `.env` file and exposed an API key in browser code.
This branch removes those files and replaces API-key access with authenticated sessions, but
removal from the current tree does not erase Git history or revoke credentials.

Before using this application:

- rotate the exposed database credentials and API key
- purge the historical `.env` blob from Git history
- configure secret scanning and branch protection
- use a dedicated, least-privilege production database account

## Current boundary

This is a secure foundation, not a production-complete CRM. Next work should add request-schema
validation, CSRF protection, pagination, role authorization, password reset/email verification,
rate limiting, structured logs, integration tests, CI, and production deployment configuration.
