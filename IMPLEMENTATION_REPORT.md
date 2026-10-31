# SJBIT College Venue Booking and Management System
## Implementation Status Report

**Assessment date:** 1 November 2026
**Scope:** Initial repository review, followed by incremental implementation of venue, booking, availability, customer request/history, approval, notification, and initial user booking screens. Administrative and remaining user workflows are in progress.

## 1. Executive summary

The repository contains an initial React/Vite frontend, an Express/Mongoose backend, and an authentication implementation. Backend data models now cover venues, booking requests, approved reservations, blocked periods, and in-app notifications. Public venue/availability reads, authenticated customer request/history APIs, transactional approval, and notification read APIs are implemented. The frontend now has live availability, a request/review/confirmation screen, and customer booking list/detail pages. Cancellation/resubmission, email delivery, and most administrative interfaces remain unimplemented.

The supplied screenshots are visual/workflow references. Their labels and example capacities, dates, and booking statuses are not verified project data and should not be treated as official SJBIT policy.

## 2. Actual project structure and stack

- Root contains a small `package.json`, README, and installed root dependencies.
- `frontend/` contains React 19, Vite, React Router, Axios, page components, and CSS.
- `backend/src/` contains the Express app/server, MongoDB connection, User/Venue/Booking/Reservation/BlockedSlot models, auth and venue controllers/routes, services, and authentication/role middleware.
- The backend package includes Express, Mongoose, bcrypt, JWT, Helmet, CORS, cookie-parser, express-validator, and express-rate-limit. The latter two are not currently wired into the API.
- A backend `.env` file exists. Its contents were not displayed or included in this report.
- Backend tests use Node's built-in test runner and do not require a live database for the covered model/service/controller behavior.

## 3. Implemented functionality

### Backend

- Connects to MongoDB through Mongoose and starts an Express server.
- Configures JSON parsing, cookies, Helmet, credentialed CORS for the local Vite origin, a health endpoint, and a JSON 404 response.
- Registration validates basic name/email/password inputs, normalizes email, hashes passwords with bcrypt, handles duplicate email, and always creates a `CUSTOMER` account.
- Login checks credentials and active status, signs a one-day JWT, and stores it in an HTTP-only cookie.
- `protect` verifies the cookie token and reloads the active user from MongoDB.
- `authorizeRoles` provides a basic allowed-role middleware.
- `/api/auth/me` returns the authenticated user's public profile; `/api/auth/logout` clears the cookie.
- `/api/auth/admin-test` is a temporary HOD/Principal authorization test route.
- Venue catalog supports public `GET /api/venues` and `GET /api/venues/:slug`; only active venues are returned.
- Availability supports `GET /api/venues/:slug/availability?date=YYYY-MM-DD`, based on configured slots, operating hours, approved reservation intervals, and active blocks. Pending requests are not treated as reservations.
- Booking, Reservation, and BlockedSlot schemas are defined, including audit-history fields, manual-vs-customer source, references, and query indexes. Approval and block-management endpoints are not yet implemented.
- Authenticated customers can submit requests through `POST /api/bookings`; the service validates inputs, venue capacity/facilities and configured slot, then rechecks availability before creating a pending booking.
- Authenticated customers can list their bookings through `GET /api/bookings` and read an owned booking through `GET /api/bookings/:id`. The owner is part of the database query.
- Authorized administrators, principals, and CSE HODs can decide requests through `PATCH /api/bookings/:id/decision`. Approval and rejection run in MongoDB transactions; approved reservations include a one-hour cleaning buffer and conflicting pending requests are rejected with history entries.
- In-app notifications are created in the same transaction as request submission and decisions. Authenticated users can list their own notifications, see unread count, and mark one or all as read through `/api/notifications`.

### Frontend

- React Router routes the home, login, registration, venue list, venue detail, and availability pages.
- Home and venue pages show four hardcoded venue cards/details with temporary remote images and unconfirmed venue facts marked as such.
- Login and registration call the auth API through an Axios client configured for `http://localhost:5000/api` and `withCredentials: true`.
- Availability fetches live slot status; the booking form supports event details, review, submission, and pending confirmation. Login returns the user to the booking form after sign-in.
- Responsive styles exist for the home, venue, availability, booking request, and booking history screens. Registration still has minimal styling.

## 4. Incomplete or missing requirements

- **Authentication experience:** No global frontend session provider, role-aware admin redirects, logout control, or account recovery. Booking screens redirect unauthenticated users to login and return them to the original route. The login UI asks for USN/email, while the backend accepts email only.
- **Registration:** No optional organization name or account-type support for external organizations. No UI for department or other account profile details.
- **Venue data:** The model and public read API exist, but venue records are not seeded and frontend venue pages still use duplicated hardcoded data.
- **Bookings:** Request, own-booking, and approval APIs plus booking form/review/confirmation and My Bookings/detail screens exist. Resubmission and cancellation are still missing.
- **Availability and reservations:** Backend availability calculation and approval reservation writes exist, and the frontend availability screen is connected. No write path yet creates blocks, and real database concurrency behavior still needs Atlas-backed integration verification.
- **Administrative capabilities:** ADMIN is now a supported role, and the approval API exists. Secure admin provisioning, admin dashboard, separate admin navigation, venue/slot management, approval queue UI, blocked-slot management, and manual booking remain.
- **Authorization policy:** The approval service enforces Principal/Admin access and CSE HOD access only for the CSE Seminar Hall. Administrative account provisioning and wider policy integration remain.
- **Notifications and guidelines:** In-app notification APIs exist; notification UI, email delivery, and the guidelines page remain outstanding.
- **Verification:** 29 backend unit-level checks currently pass. They mock transaction sessions; real MongoDB transaction support and concurrent approval behavior remain unverified against Atlas.

## 5. Architecture and risk observations

- Core venue and booking workflow records and an approval transaction are implemented. All future reservation/block write paths must use the same per-venue transaction lock.
- Venue definitions are duplicated across Home, Venues, VenueDetails, and Availability, creating a risk of inconsistent IDs and labels.
- The backend now has a basic centralized error response handler; reusable API request validation middleware is still absent despite validation-related dependencies being present.
- The local frontend API base URL and CORS origin are fixed to localhost, so deployment configuration is not yet in place.
- `server.js` overrides DNS servers globally with public resolver IPs. This is an unusual deployment-level workaround and should be investigated before production use rather than silently retained as a required application behavior.
- Rate-limit support is installed but not applied to public authentication routes.
- The role enum now includes `ADMIN`, and approval policy checks venue/department. Secure administrative provisioning is not implemented.
- The temporary `/api/auth/admin-test` route should be removed when proper admin/approval routes and tests replace it.
- The current authentication flow uses HTTP-only cookies and reloads the user from the database, which is a useful base. Production cookie, CORS, CSRF, secret management, and deployment settings still need review.
- The root CSS still includes Vite starter styling, including a fixed-width root layout and color-scheme behavior that may interfere with responsive, consistent page styling.
- Several home-page actions route to login even when their labels imply browsing venue details or bookings; those flows need to be connected as the product workflow is implemented.

## 6. Incremental implementation roadmap

### Phase 1 — Foundation and decisions

1. Preserve the current authentication implementation and document runtime configuration without exposing secrets.
2. Confirm authoritative venue details, operating hours, slot schedule, cleaning buffer, approval rules, department ownership, cancellation cutoff, and administrative account provisioning.
3. Set up a test strategy around the critical booking and approval rules before relying on those flows.

### Phase 2 — Backend booking foundation

1. Models, indexes, public venue reads, availability calculation, request submission, and customer booking reads are implemented.
2. Implemented approval with transaction locking, conflict checks, the one-hour buffer, blocked-slot checks, and automatic rejection of conflicting pending requests.
3. Implement booking cancellation and rejected-request resubmission; add secure ADMIN provisioning.
4. Add Atlas-backed integration coverage for simultaneous approvals and the business rules.

### Phase 3 — User booking workflow

1. Connect venue pages to the venue API and remove duplicated hardcoded venue records.
2. Replace sample availability with live slots and clear status states.
3. Build booking form, review, confirmation, My Bookings, booking details, cancellation/resubmission, and session-aware routing.
4. Add external organization fields and guidelines once policy is confirmed.

### Phase 4 — Administrative experience

1. Build a separate admin route/layout and dashboard.
2. Add approval queue/details with server-enforced role and department policy.
3. Add venue management, manual reservations, blocked slots, and administrative availability views.

### Phase 5 — Notifications and release readiness

1. Add in-app notifications and email delivery for request, approval, rejection, cancellation, and conflict outcomes.
2. Complete responsive/accessibility and error/loading-state review.
3. Verify deployment configuration, security settings, and the end-to-end acceptance suite.

## 7. Recommended immediate next step

Backend booking foundations, transactional approval, and in-app notifications are in place. The live availability, booking request, and customer booking history screens are connected. Next is the administrative dashboard/approval UI and notification views, followed by cancellation/resubmission. Atlas-backed transaction verification remains a release requirement.

## 8. Implementation progress

### Component 1 — Venue catalog (complete)

- Added a Mongoose Venue model with a unique slug, descriptive fields, optional capacity/location/department, facilities, configurable operating hours and predefined time slots, active status, timestamps, and validation for slot/day uniqueness and valid time ranges.
- Added public active-venue listing and slug detail endpoints at `GET /api/venues` and `GET /api/venues/:slug`.
- Added the public availability endpoint and interval-based availability calculation. The service uses the SJBIT campus timezone (Asia/Kolkata), considers reservations and active blocked periods, and does not treat pending requests as unavailable.
- Added Booking, Reservation, and BlockedSlot schemas. Booking history retains decisions; manual records are represented in Booking with `source: MANUAL`; reservation intervals will carry the cleaning-buffer end when created by approval/manual-booking workflows.
- Added a backend test script and schema/service/controller tests. These tests do not require a live MongoDB instance.
- Added authenticated customer request submission and own-booking list/detail APIs.
- Added transactional booking decisions and in-app notifications for submission, approval, rejection, and conflicting auto-rejection. Notification writes roll back with booking changes.
- Added authenticated notification list/unread count and mark-read APIs.
- Verification: 29 backend tests passed; JavaScript syntax checks passed.
- Connected the availability page to live backend slot statuses and added a booking form with review, submission, and confirmation. Login redirects back to the booking form after sign-in.
- Added My Bookings and booking detail pages, including owner-scoped loading, status filters, decision history, and rejection reason display.
- Frontend verification: ESLint and Vite production build passed.
- No venue seed data was added because authoritative capacities, facilities, and schedules are not confirmed.

### Component 2 — Booking data model (complete)

- Added a booking request model that allows multiple pending requests for the same venue/date/slot, distinguishes manual reservations, and retains status decision history.
- Added field/status/source validation and indexes for venue/date/status and requester history.
- Verification: included in the 29 passing backend tests.

### Component 3 — Availability foundation (complete)

- Added reservation and blocked-period models and an availability service that returns `AVAILABLE`, `BOOKED`, `BLOCKED`, or `CLOSED` for each configured venue slot.
- Availability reads account for intervals crossing campus dates and use an explicit Asia/Kolkata offset. They do not block slots for pending requests.
- Verification: included in the 29 passing backend tests.

### Component 4 — Customer booking submission and history APIs (complete)

- Added authenticated customer request submission at `POST /api/bookings`. The API validates required event information, configured slot, venue capacity, facility selections, and current availability before storing a pending request with initial history.
- Added `GET /api/bookings` and `GET /api/bookings/:id`, both restricted to the authenticated customer's own records.
- Verification: included in the 29 passing backend tests.

### Component 5 — Approval workflow (complete; Atlas concurrency verification pending)

- Added `ADMIN` to supported roles while public registration continues to force `CUSTOMER`.
- Added `PATCH /api/bookings/:id/decision`, with Principal/Admin access for all venues and CSE HOD access limited to the CSE Seminar Hall.
- Decisions use MongoDB transactions and a shared per-venue write lock also used by customer submissions. This serializes approval/submission rechecks for a venue; an approval creates the reservation through the end of the one-hour buffer and records the decision.
- Conflicting pending requests are changed to `REJECTED` with a reason and history entry. Reservation and blocked-period conflicts stop approval.
- Verification: included in the 29 passing tests, using mocked sessions. Atlas transaction support and real concurrent request/approval behavior have not been exercised.

### Component 6 — In-app notifications (complete)

- Added a Notification model with recipient, type, message, related booking, unread state, and owner-focused indexes.
- Submission, approval, rejection, and auto-rejection notifications are written inside their booking transaction. Email delivery is not configured and is not claimed.
- Added authenticated list/unread-count and mark-one/mark-all read APIs.
- Verification: included in the 29 passing backend tests.

### Component 7 — Live availability and booking request UI (complete)

- Replaced sample availability states with `GET /api/venues/:slug/availability`, including loading/error states and disabling booked, blocked, or unscheduled slots.
- Added booking form, review, and pending confirmation at `/venues/:id/book`; submission uses the authenticated booking API. Login returns to the requested booking flow.
- Verification: frontend ESLint and Vite production build passed.

### Component 8 — Customer booking history UI (complete)

- Added `/bookings` with status filters and `/bookings/:id` with event details, status, decision history, and rejection reason.
- Both pages use owner-scoped APIs and send unauthenticated users to login, returning them to the requested page afterward.
- Verification: frontend ESLint and Vite production build passed.
