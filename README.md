# SJBIT College Venue Booking and Management System

A web application for browsing SJBIT campus venues, checking availability, requesting bookings, and managing approvals. It includes a React frontend, an Express and MongoDB API, customer booking workflows, and role-based administration.

## Features

### Customers

- Browse active venues and view venue details.
- Check date-specific availability.
- Create an account and submit booking requests with event and organization contact details.
- Track booking status and decision history.
- Resubmit rejected requests.
- Request cancellation of an approved booking. Management reviews cancellation requests.
- View and manage in-app notifications.

### Administrators and approvers

- Review booking requests and approve or reject them.
- View an administrative availability calendar.
- Create manual reservations and block venue time.
- Manage venue details, operating hours, and time slots (ADMIN only).
- Review customer cancellation requests.
- CSE HOD approval access is restricted to the CSE Seminar Hall.

### Booking safeguards

- Availability is checked against configured venue slots, approved reservations, and active blocks.
- Approval and reservation changes use MongoDB transactions.
- Reservations include a one-hour cleanup buffer.
- Conflicting pending requests are rejected when an overlapping reservation or block is created.
- Booking and cancellation messages are queued in a MongoDB outbox. SMTP delivery is optional.

## Technology

- **Frontend:** React 19, Vite, React Router, Axios
- **Backend:** Node.js, Express 5, Mongoose
- **Database:** MongoDB
- **Authentication:** bcrypt password hashing and JWTs stored in HTTP-only cookies

## Project structure

```text
.
├── backend/
│   ├── scripts/       # Admin, venue seed, and database verification scripts
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   └── test/
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
└── IMPLEMENTATION_REPORT.md
```

## Requirements

- Node.js and npm
- A MongoDB deployment that supports transactions, such as a MongoDB replica set or Atlas cluster

Install dependencies in both application folders:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Configuration

### Backend

Copy `backend/.env.example` to `backend/.env` and fill in the required values:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=<random-secret-at-least-32-characters>
PORT=5000
FRONTEND_ORIGINS=http://localhost:5173
```

`MONGODB_URI` and a `JWT_SECRET` of at least 32 characters are required. Keep `backend/.env` private and do not commit credentials.

Optional backend settings:

| Variable | Purpose |
| --- | --- |
| `FRONTEND_ORIGINS` | Comma-separated frontend origins allowed by credentialed CORS. Use the deployed frontend origin in production. |
| `FRONTEND_ORIGIN` | Alternative single-origin CORS setting. |
| `TRUST_PROXY` | Number of trusted proxy hops. Set only when running behind a trusted reverse proxy. Defaults to `0`. |
| `MANAGEMENT_NOTIFICATION_EMAIL` | Recipient for management email notifications. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP server connection settings. |
| `SMTP_USER`, `SMTP_PASSWORD` | SMTP credentials. Keep the password in the ignored `.env` file. |
| `SMTP_FROM` | Optional sender name and address. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_ROLE`, `ADMIN_DEPARTMENT`, `ADMIN_PASSWORD` | One-time values used by the local initial administrator provisioning script. |

The backend validates required configuration at startup. In production, set `FRONTEND_ORIGINS` to valid `http(s)` origins without paths. Configure secure secrets and proxy settings for your deployment.

### Frontend

The frontend defaults to the local API at `http://localhost:5000/api`. If the API is hosted elsewhere, set `VITE_API_URL` before building or starting Vite:

```dotenv
VITE_API_URL=https://api.example.com/api
```

Vite exposes `VITE_` variables to the browser bundle. Do not put secrets in frontend environment variables.

## Run locally

Open two terminals from the project root.

**Terminal 1 — backend:**

```bash
cd backend
npm run dev
```

The API listens on port `5000` by default. Check it at [http://localhost:5000/api/health](http://localhost:5000/api/health).

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

Vite serves the app at [http://localhost:5173](http://localhost:5173).

## Initial data and administrator setup

### Seed venue records

To apply the confirmed venue names, capacities, campus location, opening hours, and hourly booking ranges to the configured database:

```bash
cd backend
npm run venues:seed
```

The command checks whether pending or approved bookings depend on schedule slots before removing those slots. Review the target `MONGODB_URI` before running it.

### Create an initial administrator or approver

Public registration creates customer accounts only. To provision an initial privileged account, set the `ADMIN_*` variables in `backend/.env`, including a unique password of at least 12 characters, then run:

```bash
cd backend
npm run admin:create
```

The script refuses to modify an existing account and does not print the password. Remove temporary credential values from the environment after provisioning. Never commit or share the password.

## API overview

All API routes are under `/api`.

| Area | Routes |
| --- | --- |
| Health | `GET /health` |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Venues | `GET /venues`, `GET /venues/:slug`, `GET /venues/:slug/availability?date=YYYY-MM-DD` |
| Customer bookings | `POST /bookings`, `GET /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel`, `POST /bookings/:id/resubmit` |
| Cancellation requests | `POST /bookings/:id/cancellation-exception`, `PATCH /bookings/:id/cancellation-exception/decision` |
| Booking decisions | `PATCH /bookings/:id/decision` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Administration | `GET /admin/bookings`, plus ADMIN routes for blocked slots, manual bookings, and venue management |

Most booking, notification, and administration routes require authentication. Role restrictions are enforced by the API as well as the frontend.

## Development checks

Run the backend unit tests:

```bash
cd backend
npm test
```

Lint and build the frontend:

```bash
cd frontend
npm run lint
npm run build
```

The frontend production output is written to `frontend/dist/`. To preview a production build locally:

```bash
cd frontend
npm run preview
```

## Database transaction checks

These scripts use temporary databases for their write scenarios and drop them afterward. Use a MongoDB account with permission to create and drop databases. Confirm the configured connection string before running them.

```bash
cd backend
npm run db:check-transactions
npm run db:check-concurrency
npm run db:check-cancellations
```

- `db:check-transactions` checks transaction capability using a read-only transaction.
- `db:check-concurrency` exercises competing booking, manual reservation, and block operations.
- `db:check-cancellations` checks cancellation transaction scenarios.

## Booking rules and project data

The configured venue schedules use Asia/Kolkata campus time. The current setup includes the Auditorium, Basketball Ground, Cricket Ground, and CSE Seminar Hall. The application enforces a two-day minimum booking notice, a four-day cancellation request cutoff, and a one-hour cleanup buffer.

Confirm venue details and institutional policies with SJBIT before production use. Capacities, opening hours, facilities, approval responsibilities, cancellation rules, and access requirements should be treated as subject to institutional confirmation.

## Security and deployment notes

- Use HTTPS in production so authentication cookies are protected.
- Keep MongoDB credentials, JWT secrets, and SMTP credentials out of source control and frontend configuration.
- Set CORS origins to the actual deployed frontend origins.
- Set `TRUST_PROXY` only to the correct trusted proxy hop count when deployed behind a proxy.
- Authentication throttling currently uses an in-memory rate limiter. Multi-instance deployments should use a shared rate-limit store.
- Review production cookie, CSRF, secret management, and deployment settings before launch.

## Further documentation

See [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) for the implementation status, verification history, and remaining release work.