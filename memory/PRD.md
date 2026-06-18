# FleetGrid — Fleet & Delivery Management SaaS (PRD)

## Original problem statement
Production-ready, enterprise-grade, multi-tenant Fleet & Delivery Management SaaS web application. Originally specified for Next.js + Django + Postgres + Redis + Celery; implemented with React + FastAPI + MongoDB while preserving all multi-tenant SaaS semantics.

## Architecture
- **Backend**: FastAPI (Python), Motor (async MongoDB), bcrypt + PyJWT for auth
- **Frontend**: React + React Router, Tailwind, shadcn/ui, Recharts, Leaflet (CartoDB tiles), Phosphor icons, sonner toasts
- **Tenancy**: every collection scoped via `organization_id`; `tenant_scope(user)` builds the Mongo filter. Super admins are unscoped.
- **RBAC**: `require_roles([…])` dependency; 6 roles: super_admin, org_owner, ops_manager, dispatcher, driver, customer
- **Auth**: JWT (HS256), bcrypt password hashing, token claims include `sub`, `organization_id`, `roles`

## User personas
- **Org Owner**: registers workspace, invites users, manages billing
- **Ops Manager**: manages fleet, drivers, monitors deliveries
- **Dispatcher**: creates deliveries, assigns drivers/vehicles
- **Driver**: mobile-friendly portal — start trip, update location, submit POD
- **Customer**: lightweight portal + public tracking page
- **Super admin**: platform-wide (scaffolded; unscoped queries)

## Implemented (Feb 2026 — v1.2)
- **Service type selector** (shipping vs travel) on every booking. Travel adds `journey_date/time`, `passengers`, `round_trip`, `return_date`. Shipping keeps weight/COD/package fields. Form dynamically swaps based on tab.
- **Inline customer booking** for fleet owners: pick from saved directory OR enter name/phone/email inline. `save_customer` toggle auto-creates a permanent record; otherwise a temporary record is attached to the booking. Existing `customer_id` flow still works (backward-compat).
- **Address autocomplete & validation** via `/api/geocode` proxying **OpenStreetMap Photon** (free, no key). Raw lat/lng inputs removed from the UI — addresses must be picked from suggestions, system fills coordinates automatically. Rejects submission without valid pickup+drop selections.
- Priority field expanded to include `express` and `same_day` (per shipping-service spec).
- All existing tests pass (15/15) — zero regression.

## Implemented (Feb 2026 — v1.1)
- **Email verification (blocking)**: new signups receive Resend email; login is blocked until verified. `/verify-email`, `/resend-verification`.
- **Password reset**: `/forgot-password` + `/reset-password` flow with single-use 1-hour tokens; emails sent via Resend.
- **Delivery status emails to customers**: out_for_delivery / delivered / failed transitions auto-email the customer (Resend) with a tracking link.
- **Razorpay billing (India, INR)**: `/billing/plans`, `/billing/create-order`, `/billing/verify` (with signature verification), `/billing/history`. Frontend Settings → Billing renders 3 plans (Starter ₹4,999 / Growth ₹12,999 / Enterprise ₹49,999) and opens the official Razorpay Checkout modal. Successful payment switches org plan and is logged in audit.
- Existing seeded users auto-migrated to email_verified=true so demo workflow is uninterrupted.

## Implemented (Feb 2026 — v1.0)
- Multi-tenant org registration + login (`/auth/register`, `/auth/login`, `/auth/me`)
- Vehicles CRUD (registration #, type, fuel, capacity, status)
- Drivers CRUD + ratings + live location push endpoint
- Customers CRUD with search
- Deliveries CRUD with tracking codes, full status timeline, assign, status updates, POD submission
- Public tracking page `/track/:code` with map + timeline (no auth)
- Live fleet map with auto-refresh and driver markers
- Dashboard with KPIs, 7-day throughput line chart, status pie/bar, recent feed
- Analytics page (throughput, status mix, driver efficiency)
- Audit logs (immutable history for org owners)
- Settings: org profile + billing UI (plans displayed, payment gateway abstracted)
- Team invitations with role assignment
- Driver portal at `/driver` (pickup → in_transit → out_for_delivery → POD)
- Customer portal at `/portal` listing orders
- In-app notifications (driver assignment events)
- Seeded demo org "Acme Logistics" with 4 users / 3 vehicles / 3 drivers / 3 customers / 6 deliveries

## Test credentials (all password Password123!)
owner@acme.com · dispatcher@acme.com · driver@acme.com · customer@acme.com

## Backlog — P0 / P1 / P2
- **P0**: Email/SMS notifications (Resend/Twilio) for assignment + delivery events; password reset flow
- **P0**: Real payment integration (Stripe) for plan upgrades
- **P1**: Multi-stop route optimization (Google OR-Tools or OSRM)
- **P1**: Driver mobile geolocation throttling + offline queue
- **P1**: Photo uploads for POD (object storage) — currently URL string only
- **P2**: Geofencing + arrival notifications
- **P2**: CSV import for deliveries
- **P2**: Webhooks for status events
- **P2**: Super admin platform dashboard
- **P2**: Heatmaps for delivery density

## Test status
Iteration 1 (Feb 2026): 15/15 backend pytest pass (100%). All operator nav routes, driver portal, public tracking verified. No critical issues found.

## Implemented (Jun 2026 — Phase 2)

### Architecture
- **`backend/storage.py`**: Storage abstraction (`LocalStorageBackend` + `S3StorageBackend` placeholder). Uploads served at `/api/files/{filename}`.
- **`backend/phase2_services.py`**: Offer creation, atomic accept-first-wins, haversine distance, payout estimation, rating aggregates, notification helpers.
- **`backend/phase2_routes.py`**: All Phase 2 REST endpoints mounted on existing `/api` router.

### Database collections (new)
| Collection | Purpose |
|---|---|
| `partner_onboarding` | Multi-step partner applications with verification state |
| `verification_documents` | Selfie, ID, RC, insurance, vehicle photos |
| `delivery_offers` | Accept-first-wins offer records with expiry |
| `delivery_ratings` | Customer/driver post-delivery ratings |

### Features
1. **Partner onboarding wizard** (`/partner/onboarding`) — 8 steps, resumable progress, document uploads
2. **Verification workflow** — states: pending → docs_review → approved/rejected → active/suspended
3. **Admin review queue** (`/app/verification`) — approve, reject, request resubmission with audit logs
4. **Delivery offer system** — `POST /deliveries/{id}/offer`, atomic accept, auto-expire competing offers
5. **Driver jobs feed** (`/driver/jobs`) — nearby offers with distance, payout, expiry timer, sorting
6. **Pickup confirmation** — photo, GPS, notes, timeline event `pickup_confirmed`
7. **Enhanced POD** — photo upload, signature, QR confirmation, GPS (`POST /deliveries/{id}/pod/v2`)
8. **Ratings** — customer rates driver (punctuality, professionalism); driver rates customer interaction
9. **Operations dashboard** — `GET /dashboard/operations` (verifications, offers, drivers, ratings)
10. **Driver verification gate** — unverified drivers cannot be manually assigned

### API endpoints (Phase 2)
- `GET/PATCH /partner/onboarding/me`, `/step`, `/documents`, `/submit`
- `GET /admin/verification/queue`, `GET /admin/verification/{id}`, `POST .../review`
- `POST /deliveries/{id}/offer`, `GET /driver/jobs`, `POST /offers/{id}/accept|decline`
- `POST /deliveries/{id}/pickup-confirm`, `/upload`, `/pod/v2`
- `POST /deliveries/{id}/ratings/customer|driver`
- `GET /dashboard/operations`

### Security
- All queries tenant-scoped via `tenant_scope(user)`
- RBAC on every endpoint (`require_roles`)
- Upload validation (type + 10 MB limit)
- Audit log on every write
- Atomic offer acceptance prevents race conditions

### Tests
- `backend/tests/phase2_test.py` — onboarding, offers, RBAC, operations dashboard
