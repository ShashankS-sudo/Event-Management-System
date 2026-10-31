# SJBIT College Venue Booking and Management System
## Implementation Status Report

**Assessment date:** 1 November 2026
**Scope:** Initial repository review, followed by incremental implementation of venue, booking, availability, customer and approval workflows, notifications, separate administration screens, blocked-slot management, manual reservations, customer notification/guidelines UI, and shared session/sign-out. Remaining operational workflows are in progress.

## 1. Executive summary

The repository contains a React/Vite frontend, an Express/Mongoose backend, and an authentication implementation. Backend models and APIs cover venues, booking requests, approved reservations, blocked periods, notifications, approval, manual reservations, customer cancellation/exception/resubmission, and ADMIN venue management. The frontend includes API-backed venue browsing, guidelines, booking request/review/confirmation, customer history/notification pages, shared session state, sign-out, and admin approval/block/manual-booking/venue screens. Email delivery and some operational capabilities remain unimplemented.

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
- The authenticated profile includes department for HOD access checks; login and profile responses expose the public role/profile fields.
- Registration and login share a 10-attempt/15-minute in-memory rate limiter.
- Initial ADMIN provisioning is available only through `backend/scripts/createAdmin.js` (`npm run admin:create`). The script hashes a minimum 12-character password, refuses to alter an existing account, and public registration cannot assign privileged roles.
- `/api/auth/admin-test` is a temporary HOD/Principal authorization test route.
- Venue catalog supports public `GET /api/venues` and `GET /api/venues/:slug`; only active venues are returned.
- Availability supports `GET /api/venues/:slug/availability?date=YYYY-MM-DD`, based on configured slots, operating hours, approved reservation intervals, and active blocks. Pending requests are not treated as reservations.
- Booking, Reservation, and BlockedSlot schemas are defined, including audit-history fields, manual-vs-customer source, references, and query indexes.
- Authenticated customers can submit requests through `POST /api/bookings`; the service validates inputs, venue capacity/facilities and configured slot, then rechecks availability before creating a pending booking.
- Authenticated customers can list their bookings through `GET /api/bookings` and read an owned booking through `GET /api/bookings/:id`. The owner is part of the database query.
- Authorized administrators, principals, and CSE HODs can decide requests through `PATCH /api/bookings/:id/decision`. Approval and rejection run in MongoDB transactions; approved reservations include a one-hour cleaning buffer and conflicting pending requests are rejected with history entries.
- Administrative users can read an approval queue through `GET /api/admin/bookings`; queue filters and HOD venue scoping are enforced server-side.
- ADMIN users can list, create, and remove blocked periods through `/api/admin/blocked-slots`. Creation shares the venue transaction lock, refuses overlap with approved reservations, and rejects/notifies conflicting pending requests.
- ADMIN users can create immediate manual reservations through `POST /api/admin/manual-bookings`; these use the Booking model, share transaction locks, include a cleaning buffer, and reject/notify overlapping pending requests.
- ADMIN users can list, create, and update venue records through `/api/admin/venues`, including status, descriptive fields, capacity, facilities, operating hours, and time slots.
- Customers can cancel eligible bookings through `PATCH /api/bookings/:id/cancel`; the four-day cutoff is configurable with `CANCELLATION_DEADLINE_DAYS` (default 4). Approved reservations are released in the cancellation transaction.
- Customers can request a late-cancellation exception through `POST /api/bookings/:id/cancellation-exception`; eligible approvers decide through `PATCH /api/bookings/:id/cancellation-exception/decision`. Approval cancels the request and releases an approved reservation transactionally.
- Customers can resubmit rejected requests through `POST /api/bookings/:id/resubmit`; the previous rejected record is retained and linked from the new pending version.
- In-app notifications are created in the same transaction as request submission and decisions. Authenticated users can list their own notifications, see unread count, and mark one or all as read through `/api/notifications`.

### Frontend

- React Router routes the home, login, registration, venue list, venue detail, and availability pages.
- Home, venue list, and venue details now load active venue names and configured data from the backend; temporary presentation images are selected by venue slug. Missing capacities, locations, facilities, or descriptions are shown as unconfirmed rather than invented.
- Added a guidelines page describing the implemented request, approval, tracking, cancellation, and exception workflows. It explicitly states that official SJBIT policy details need confirmation.
- Added a shared frontend session context initialized from `/api/auth/me`, sign-out actions on public/admin navigation, role-aware post-login routing, and an email-only login label matching the backend.
- Login and registration call the auth API through an Axios client with `withCredentials: true`; the API URL can be set through `VITE_API_URL` and defaults to `http://localhost:5000/api`.
- Availability fetches live slot status; the booking form supports event details, review, submission, and pending confirmation. Login returns the user to the booking form after sign-in.
- Separate admin routes provide an administration dashboard, approval queue, blocked-period management, and manual booking.
- Responsive styles exist for the home, venue, availability, booking request, and booking history screens. Registration still has minimal styling.

## 4. Incomplete or missing requirements

- **Authentication experience:** Shared session state, sign-out, role-aware post-login routing, and the email login label are implemented. Account recovery remains unavailable; ongoing privileged-account management and production session/CSRF settings need work.
- **Registration:** No optional organization name or account-type support for external organizations. No UI for department or other account profile details.
- **Venue data:** Frontend venue cards/details are API-backed and the duplicated venue records were removed. Venue records are not seeded, and official capacities, schedules, facilities, descriptions, and locations still need confirmation.
- **Bookings:** Request, own-booking, approval, manual reservation, cancellation, late-cancellation exception, and resubmission APIs plus user booking screens exist. Atlas-backed transaction concurrency still needs verification.
- **Availability and reservations:** Backend availability calculation, approval reservation writes, and ADMIN blocked-period writes exist; the frontend availability screen is connected. Real database concurrency behavior still needs Atlas-backed integration verification.
- **Administrative capabilities:** Dashboard, navigation, approval queue, blocked-slot management, manual booking, venue/slot management, and controlled initial ADMIN provisioning now exist. Ongoing privileged account administration remains.
- **Authorization policy:** The approval service enforces Principal/Admin access and CSE HOD access only for the CSE Seminar Hall. Initial ADMIN provisioning is available by local script; HOD/Principal provisioning and full institutional policy integration remain.
- **Notifications and guidelines:** In-app notification APIs and read/unread UI exist. The guidelines page describes current app behavior; official policy validation and email delivery remain outstanding.
- **Verification:** 49 backend unit-level checks pass. They mock transaction sessions; real MongoDB transaction support and concurrent approval behavior remain unverified against Atlas.

## 5. Architecture and risk observations

- Core venue and booking workflow records and an approval transaction are implemented. All future reservation/block write paths must use the same per-venue transaction lock.
- Venue records are loaded from the backend by Home, Venues, and VenueDetails. Presentation images remain mapped to known venue slugs; new venues use a generic fallback image.
- The backend now has a basic centralized error response handler; reusable API request validation middleware is still absent despite validation-related dependencies being present.
- Frontend API URL and backend CORS origins are environment-configurable. Production cookie, CSRF, secret management, reverse-proxy, and shared rate-limit-store settings still need review.
- `server.js` overrides DNS servers globally with public resolver IPs. This is an unusual deployment-level workaround and should be investigated before production use rather than silently retained as a required application behavior.
- Authentication endpoints have an in-memory rate limit; use a shared store for multi-instance production deployments.
- The role enum includes `ADMIN`, and approval policy checks venue/department. Initial ADMIN setup is a local script; there is no web endpoint for privileged account creation.
- The current authentication flow uses HTTP-only cookies and reloads the user from the database, which is a useful base. Production cookie, CORS, CSRF, secret management, and deployment settings still need review.
- Replaced the Vite starter root layout and automatic dark-mode styles with a responsive application-wide base stylesheet.
- Account recovery, session/CSRF review, confirmation of college policy, and end-to-end acceptance remain open.

## 6. Incremental implementation roadmap

### Phase 1 — Foundation and decisions

1. Preserve the current authentication implementation and document runtime configuration without exposing secrets.
2. Confirm authoritative venue details, operating hours, slot schedule, cleaning buffer, approval rules, department ownership, cancellation cutoff, and administrative account provisioning.
3. Set up a test strategy around the critical booking and approval rules before relying on those flows.

### Phase 2 — Backend booking foundation

1. Models, indexes, public venue reads, availability calculation, request submission, and customer booking reads are implemented.
2. Implemented approval with transaction locking, conflict checks, the one-hour buffer, blocked-slot checks, and automatic rejection of conflicting pending requests.
3. Cancellation, post-cutoff exception handling, rejected-request resubmission, and initial ADMIN provisioning are implemented.
4. Add Atlas-backed integration coverage for simultaneous approvals and the business rules.

### Phase 3 — User booking workflow

1. Connect venue pages to the venue API and remove duplicated hardcoded venue records. (Complete.)
2. Replace sample availability with live slots and clear status states.
3. Build booking form, review, confirmation, My Bookings, booking details, cancellation/resubmission, and session-aware routing.
4. Add external organization fields once policy is confirmed; the workflow guidelines page is present, pending policy review.

### Phase 4 — Administrative experience

1. Separate admin route/layout, dashboard, and approval queue/details are implemented with server-enforced role and department policy.
2. Blocked-slot management, manual reservations, and venue/time-slot management are implemented. Add administrative availability views.

### Phase 5 — Notifications and release readiness

1. In-app notifications and customer read/unread UI are implemented. Add email delivery for request, approval, rejection, cancellation, and conflict outcomes.
2. Complete responsive/accessibility and error/loading-state review.
3. Verify deployment configuration, security settings, and the end-to-end acceptance suite.

## 7. Recommended immediate next step

The admin dashboard, approval queue, blocked-slot management, manual reservations, venue/slot administration, cancellation, rejected-request resubmission, notification UI, post-cutoff cancellation exception workflow, guidelines page, API-backed venue browsing, shared session/sign-out, and initial ADMIN provisioning are implemented and pass checks. Next is deployment/security configuration and acceptance verification. Atlas-backed transaction verification and confirmed venue/policy data remain release requirements.

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
- Verification: 49 backend tests passed; JavaScript syntax checks passed.
- Connected the availability page to live backend slot statuses and added a booking form with review, submission, and confirmation. Login redirects back to the booking form after sign-in.
- Added My Bookings and booking detail pages, including owner-scoped loading, status filters, decision history, and rejection reason display.
- Frontend verification: ESLint and Vite production build passed.
- Added the separate admin layout, dashboard, and approval queue with pending/approved/rejected/cancelled filters, booking review, approval, and rejection-reason entry.
- Added `GET /api/admin/bookings` with server-side role/department scope and a 100-record cap.
- Added ADMIN-only blocked period list/create/remove APIs and a responsive admin screen. Block creation refuses approved reservation conflicts and atomically rejects conflicting pending requests with notifications.
- Added the customer notifications page at `/notifications`, including unread count, mark-one/mark-all read actions, booking links, loading/error states, and a Home navigation link.
- Added the late-cancellation exception API and customer form. Requests require a reason and can only be submitted after the configured cutoff; approver notifications are generated.
- Added a Late Cancellations filter to the admin approval queue. Authorized decisions record the approver and outcome; approval cancels the booking and releases its reservation in the transaction.
- Verification: 49 backend tests passed; frontend ESLint and Vite production build passed.
- No venue seed data was added because authoritative capacities, facilities, and schedules are not confirmed.

### Component 2 — Booking data model (complete)

- Added a booking request model that allows multiple pending requests for the same venue/date/slot, distinguishes manual reservations, and retains status decision history.
- Added field/status/source validation and indexes for venue/date/status and requester history.
- Verification: included in the 32 passing backend tests.

### Component 3 — Availability foundation (complete)

- Added reservation and blocked-period models and an availability service that returns `AVAILABLE`, `BOOKED`, `BLOCKED`, or `CLOSED` for each configured venue slot.
- Availability reads account for intervals crossing campus dates and use an explicit Asia/Kolkata offset. They do not block slots for pending requests.
- Verification: included in the 32 passing backend tests.

### Component 4 — Customer booking submission and history APIs (complete)

- Added authenticated customer request submission at `POST /api/bookings`. The API validates required event information, configured slot, venue capacity, facility selections, and current availability before storing a pending request with initial history.
- Added `GET /api/bookings` and `GET /api/bookings/:id`, both restricted to the authenticated customer's own records.
- Verification: included in the 32 passing backend tests.

### Component 5 — Approval workflow (complete; Atlas concurrency verification pending)

- Added `ADMIN` to supported roles while public registration continues to force `CUSTOMER`.
- Added `PATCH /api/bookings/:id/decision`, with Principal/Admin access for all venues and CSE HOD access limited to the CSE Seminar Hall.
- Decisions use MongoDB transactions and a shared per-venue write lock also used by customer submissions. This serializes approval/submission rechecks for a venue; an approval creates the reservation through the end of the one-hour buffer and records the decision.
- Conflicting pending requests are changed to `REJECTED` with a reason and history entry. Reservation and blocked-period conflicts stop approval.
- Verification: included in the 32 passing tests, using mocked sessions. Atlas transaction support and real concurrent request/approval behavior have not been exercised.

### Component 6 — In-app notifications (complete)

- Added a Notification model with recipient, type, message, related booking, unread state, and owner-focused indexes.
- Submission, approval, rejection, and auto-rejection notifications are written inside their booking transaction. Email delivery is not configured and is not claimed.
- Added authenticated list/unread-count and mark-one/mark-all read APIs.
- Verification: included in the 32 passing backend tests.

### Component 7 — Live availability and booking request UI (complete)

- Replaced sample availability states with `GET /api/venues/:slug/availability`, including loading/error states and disabling booked, blocked, or unscheduled slots.
- Added booking form, review, and pending confirmation at `/venues/:id/book`; submission uses the authenticated booking API. Login returns to the requested booking flow.
- Verification: frontend ESLint and Vite production build passed.

### Component 8 — Customer booking history UI (complete)

- Added `/bookings` with status filters and `/bookings/:id` with event details, status, decision history, and rejection reason.
- Both pages use owner-scoped APIs and send unauthenticated users to login, returning them to the requested page afterward.
- Verification: frontend ESLint and Vite production build passed.

### Component 9 — Administrative dashboard and approval queue (complete)

- Added `/admin/dashboard` and `/admin/bookings` under a separate administrative layout. HODs outside CSE are denied access in the UI, and the backend independently limits CSE HOD queue records to the CSE Seminar Hall.
- Added booking detail review, approval, rejection with a required reason, and feedback when conflicting pending requests are automatically rejected.
- Added the queue API and status/role-scope tests.
- Verification: all 49 backend tests passed; frontend ESLint and Vite production build passed.

### Component 10 — Blocked-slot management (complete)

- Added ADMIN-only active block list, create, and removal endpoints. Creation uses the shared venue transaction lock, reports approved-reservation conflicts, and auto-rejects/notifies pending requests overlapping the saved block.
- Added the admin blocked-slots page with campus-time date/time inputs, conflict reporting, and active block removal.
- Verification: included in the 49 passing backend tests; frontend ESLint and Vite production build passed.

### Component 12 — Customer cancellation and resubmission (complete)

- Added transaction-safe cancellation with a configurable four-day deadline. Pending bookings are cancelled directly; approved bookings also release their reservation and create a notification.
- Resubmission creates a new pending Booking linked to the rejected original, preserving previous decisions and notifying the customer.
- Added cancellation and edit/resubmit actions to the customer booking detail page.
- Verification: included in the 49 passing backend tests; frontend ESLint and Vite production build passed.

### Component 11 — Manual reservations (complete)

- Added ADMIN-only `POST /api/admin/manual-bookings`. A manual booking is an approved Booking record with `source: MANUAL` and no customer requester.
- Manual creation checks configured availability and capacity, writes an approved Reservation through the one-hour cleaning buffer, and auto-rejects/notifies conflicting pending requests in the transaction.
- Added the ADMIN manual booking form.
- Verification: included in the 49 passing backend tests; frontend ESLint and Vite production build passed.

### Component 13 — Customer notifications UI (complete)

- Added `/notifications` with unread count, mark-one/mark-all read actions, related-booking navigation, empty/loading/error states, and responsive styling.
- Added a Home navigation link to the notification page; backend read/list routes were already in place.
- Verification: frontend ESLint and Vite production build passed.

### Component 14 — Late cancellation exception workflow (complete; Atlas concurrency verification pending)

- Added customer exception requests with a required reason after the configured cutoff, plus transactional notifications to the customer and eligible approvers.
- Added an approver queue filter and decision actions. Approval cancels the booking and releases an approved reservation; rejection records the decision and sends the customer an update.
- Verification: 49 backend tests passed, including exception-request notification coverage; frontend ESLint and Vite production build passed.

### Component 15 — Guidelines and API-backed venue pages (complete; official policy data pending)

- Added the `/guidelines` page with clear booking, approval, tracking, and cancellation instructions, plus a notice that official SJBIT policies need confirmation.
- Connected Home, Venues, and VenueDetails to the public venue API; removed duplicated venue descriptions, capacities, and details from the frontend. Temporary images remain mapped by venue slug for presentation only.
- Venue record seeding and official data validation remain pending because authoritative SJBIT capacities, facilities, schedules, and policy details have not been provided.
- Verification: 49 backend tests passed; frontend ESLint and Vite production build passed.

### Component 16 — Shared session and sign-out (complete; account recovery pending)

- Added frontend shared session state initialized through `/api/auth/me` and updated after login; role-based accounts default to the admin dashboard after login.
- Added sign-out actions in the public home header and admin header. The authenticated profile now exposes the department needed for HOD venue scoping.
- Changed the login label and prompt to email to match the backend's email-only authentication.
- Verification: 49 backend tests passed; frontend ESLint and Vite production build passed.

### Component 17 — Initial administrator provisioning and auth throttling (complete; operational verification pending)

- Added `npm run admin:create`, a local-only account creation script for the initial ADMIN. It requires environment-provided credentials, enforces a 12-character minimum password, hashes credentials, and refuses to modify an existing account.
- Added a 10-attempt per 15-minute in-memory rate limit to login and registration; removed the temporary `/api/auth/admin-test` route.
- Updated README with local run, test, and first-admin provisioning instructions.
- Verification: backend suite remains at 49 passing tests; frontend ESLint and Vite production build passed. The provisioning script was syntax-checked but not run against the unavailable database.

### Component 18 — Deployment endpoint configuration (complete; production security review pending)

- Frontend API base can be configured with `VITE_API_URL`; backend credentialed CORS can use `FRONTEND_ORIGIN` or a comma-separated `FRONTEND_ORIGINS` list.
- Documented local and deployment configuration variables in the README. Production cookie/CSRF, secrets, proxy trust, and shared rate-limit storage still need environment-specific review.
- Verification: 49 backend tests passed; frontend ESLint and Vite production build passed.

### Component 19 — ADMIN venue and time-slot management (complete; authoritative data entry pending)

- Added ADMIN-only venue listing, creation, and update endpoints and the `/admin/venues` configuration screen.
- Updates share the venue transaction lock with booking operations. With pending/approved requests, the system prevents slug/schedule changes, capacity reductions below booked attendance, removing requested facilities, and deactivation while pending requests await decisions.
- Verification: 49 backend tests passed, including checks for safe edits and schedule protection; frontend ESLint and Vite production build passed.

### Component 20 — Responsive global style foundation (complete)

- Removed the starter fixed-width centered root, dark-mode color overrides, and broad default heading sizes; added a light, responsive base with consistent box sizing and form typography.
- Verification: 49 backend tests passed; frontend ESLint and Vite production build passed.
