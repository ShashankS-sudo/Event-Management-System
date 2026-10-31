# SJBIT College Venue Booking and Management System

React/Vite frontend and Express/MongoDB backend for browsing campus venues, checking availability, submitting bookings, and administering approval workflows.

## Run locally

1. Create `backend/.env` with `MONGODB_URI`, a strong `JWT_SECRET`, and `FRONTEND_ORIGINS` (defaults to `http://localhost:5173`). Do not commit this file. For a deployed frontend, set this to its origin; multiple origins can be comma-separated.
2. Start the API from `backend/` with `npm run dev` (port 5000 by default).
3. Start the frontend from `frontend/` with `npm run dev` (Vite uses port 5173). Set `VITE_API_URL` at build time if the API is not at `http://localhost:5000/api`.

Public registration creates customer accounts only. The first ADMIN account must be provisioned by a trusted operator from the backend directory. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a password of at least 12 characters in the local process environment, then run `npm run admin:create`. The script refuses to modify an existing account and never prints the password. Clear the temporary environment values after provisioning. Do not add credentials to source control or shell scripts.

## Verification

- Backend: `cd backend` then `npm test`.
- Frontend: `cd frontend` then `npm run lint` and `npm run build`.

See [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) for current scope, verification results, and remaining release work. Venue facts and institutional policy details must be confirmed with SJBIT before production use.
