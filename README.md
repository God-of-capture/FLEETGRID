# FleetGrid

Multi-tenant fleet and delivery management SaaS. Organizations run dispatch operations, drivers accept jobs and complete deliveries, customers book parcels and track shipments, and platform admins oversee the whole network.

## Features

- **Multi-tenant workspaces** — every record scoped by `organization_id`; super admins operate across tenants
- **Role-based access** — `super_admin`, `org_owner`, `ops_manager`, `dispatcher`, `driver`, `customer`
- **Fleet & dispatch** — vehicles, drivers, customers, deliveries, live map, analytics, audit logs
- **Delivery lifecycle** — tracking codes, status timeline, assignment, proof of delivery, public tracking page
- **Phase 2 marketplace** — partner onboarding, document verification, delivery offers (accept-first-wins), driver jobs feed, ratings
- **Customer booking** — send parcels, portal, address autocomplete (OpenStreetMap Photon)
- **Billing** — Razorpay checkout for plan upgrades (optional)
- **Email** — verification, password reset, delivery notifications via Resend (optional)

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, React Router, Tailwind CSS, shadcn/ui, Recharts, Leaflet, Axios |
| Backend | FastAPI, Motor (async MongoDB), bcrypt, PyJWT |
| Database | MongoDB |
| Payments | Razorpay (optional) |
| Email | Resend (optional) |
| Storage | Local filesystem (default) or S3 |

## Project structure

```
FLEETGRID/
├── backend/
│   ├── server.py           # Main API (prefix /api)
│   ├── auth.py             # JWT, RBAC, tenant scoping
│   ├── models.py           # Pydantic models
│   ├── phase2_routes.py    # Offers, onboarding, verification, ratings
│   ├── phase2_services.py  # Business logic for Phase 2
│   ├── admin_routes.py     # Super-admin APIs
│   ├── storage.py          # File upload abstraction
│   ├── emailer.py          # Resend integration
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/          # App screens
│   │   ├── components/     # UI + auth + admin layout
│   │   └── lib/            # API client, auth context
│   └── public/
└── memory/PRD.md           # Product requirements (detailed spec)
```

## Prerequisites

- **Node.js** 18+ and **Yarn**
- **Python** 3.10+
- **MongoDB** running locally (default: `mongodb://localhost:27017`)

## Environment variables

### Backend (`backend/.env`)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=fleetgrid
JWT_SECRET=change-me-to-a-long-random-string
CORS_ORIGINS=http://localhost:3000
APP_URL=http://localhost:8000

# Optional — email (Resend)
RESEND_API_KEY=
SENDER_EMAIL=FleetGrid <onboarding@resend.dev>

# Optional — Razorpay billing
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Optional — super admin seed (created on startup if missing)
SUPER_ADMIN_EMAIL=admin@fleetgrid.com
SUPER_ADMIN_PASSWORD=Admin123!

# Optional — file storage (default: local)
STORAGE_BACKEND=local
UPLOAD_DIR=./uploads
# STORAGE_BACKEND=s3
# S3_BUCKET=
# S3_REGION=ap-south-1
# S3_PUBLIC_BASE=
```

### Frontend (`frontend/.env`)

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

## Local development

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

On first startup the backend seeds a demo organization (**Acme Logistics**) and a super-admin account (see credentials below).

### 2. Frontend

```powershell
cd frontend
yarn install
$env:BROWSER="none"
yarn start
```

App: [http://localhost:3000](http://localhost:3000)

### 3. Production build

```powershell
cd frontend
yarn build
```

## Demo credentials

All demo org users use password **`Password123!`**

| Role | Email | Portal |
|------|-------|--------|
| Org owner | `owner@acme.com` | `/app/dashboard` |
| Dispatcher | `dispatcher@acme.com` | `/app/deliveries` |
| Driver | `driver@acme.com` | `/driver/jobs` |
| Customer | `customer@acme.com` | `/portal` |
| Super admin | `admin@fleetgrid.com` | `/admin` |

Super admin password defaults to **`Admin123!`** (override with `SUPER_ADMIN_PASSWORD`).

## User journeys

| Persona | Login | Register |
|---------|-------|----------|
| Business (fleet operator) | `/login/business` | `/register/business` |
| Customer | `/login/customer` | `/register/customer` |
| Driver / partner | `/login/driver` | `/register/driver` |
| Platform admin | `/admin/login` | — |

Legacy redirects: `/login` → business login, `/register` → business register, `/signup/individual` → customer register.

### Key routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with journey cards |
| `/app/*` | Operator dashboard (fleet, deliveries, map, settings) |
| `/driver/jobs` | Driver offer feed and active jobs |
| `/partner/onboarding` | Partner verification wizard |
| `/app/verification` | Ops verification review queue |
| `/send-parcel` | Customer parcel booking |
| `/portal` | Customer order history |
| `/track/:code` | Public shipment tracking (no auth) |
| `/admin/*` | Platform admin console |

## Testing

```powershell
cd backend
pip install pytest httpx
pytest tests/ -v
```

Set `REACT_APP_BACKEND_URL=http://localhost:8000` if tests need to hit a running API.

## Optional integrations

| Service | Purpose | Without it |
|---------|---------|------------|
| **Resend** | Email verification, password reset, delivery notifications | Emails are skipped; demo users remain verified |
| **Razorpay** | Subscription billing in Settings | Billing UI shows plans; checkout disabled |
| **S3** | Document and POD uploads in production | Files stored under `backend/uploads/` |

## License

Private — all rights reserved unless otherwise specified.
