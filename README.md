# SJBIT College Venue Booking and Management System

React/Vite frontend and Express/MongoDB backend for browsing campus venues, checking availability, submitting bookings, and administering approval workflows.

## Run locally

1. Copy `backend/.env.example` to `backend/.env`, then set `MONGODB_URI`, a `JWT_SECRET` of at least 32 characters, and `FRONTEND_ORIGINS`. Do not commit `.env`. For a deployed frontend, set its origin; multiple origins can be comma-separated. Set `TRUST_PROXY` to the exact proxy hop count only when deployed behind a trusted reverse proxy.
2. Start the API from `backend/` with `npm run dev` (port 5000 by default).
3. Start the frontend from `frontend/` with `npm run dev` (Vite uses port 5173). Set `VITE_API_URL` at build time if the API is not at `http://localhost:5000/api`.

Public registration creates customer accounts only. The named demo approver can be provisioned as Principal with `ADMIN_NAME=Shashank S`, `ADMIN_EMAIL=1jb24cs172gdg@gmail.com`, `ADMIN_ROLE=PRINCIPAL`, and `ADMIN_DEPARTMENT=CSE`. Set a unique `ADMIN_PASSWORD` of at least 12 characters in the local environment, then run `npm run admin:create` from `backend/`. The script refuses to modify an existing account and never prints the password. Clear temporary credential values after provisioning. Do not add credentials to source control or chat.

The four confirmed venue records can be updated with `npm run venues:seed` from `backend/`. It applies the confirmed names, capacities, SJBIT Campus location, empty additional-facilities lists, daily opening hours, and continuous hourly booking ranges. It refuses to replace a schedule if pending or approved bookings would reference removed slots.

Booking and cancellation emails are written to the MongoDB outbox as part of the booking transaction and sent when SMTP is configured. Set `MANAGEMENT_NOTIFICATION_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and optionally `SMTP_FROM` in the ignored `backend/.env`. The default recipient is the management inbox supplied for the project. For Gmail, use an app password stored only in `.env`; never commit it.

## Verification

- Backend: `cd backend` then `npm test`.
- Atlas transaction capability (read-only): `cd backend` then `npm run db:check-transactions`. This check reads one active venue inside a transaction and does not modify records.
- Concurrent booking writes: `cd backend` then `npm run db:check-concurrency`. It creates a uniquely named temporary database on the configured cluster, races approval against another approval, a manual reservation, and an administrative block, then drops that database afterward. Use a database credential permitted to create/drop databases.
- Cancellation transactions: `cd backend` then `npm run db:check-cancellations`. It uses and drops a separate temporary database to verify manager-reviewed cancellation, reservation release after approval, and concurrent request/decision handling.
- Frontend: `cd frontend` then `npm run lint` and `npm run build`.

See [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) for current scope, verification results, and remaining release work. Venue facts and institutional policy details must be confirmed with SJBIT before production use.
