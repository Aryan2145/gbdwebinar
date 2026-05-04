# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on localhost:3000
npm run build      # Build production bundle
npm start          # Start production server

# Local dev with PostgreSQL (preferred)
docker-compose up  # Starts app + PostgreSQL 16 locally
```

No test suite exists. Type-check with `npx tsc --noEmit`.

## Architecture

Full-stack Next.js 14 (Pages Router) webinar registration platform for RGB India's "Growth by Design" masterclass. TypeScript throughout, Tailwind CSS for styling, Framer Motion for animations.

**Pages:**
- `src/pages/index.tsx` — Single-page public landing (~1250 lines). Contains the entire registration flow: hero, social proof sections, Razorpay payment form (multi-ticket, session selection, attendee names). Handles its own Razorpay callback logic inline.
- `src/pages/admin.tsx` — Password-protected admin dashboard. JWT auth stored in HTTP-only cookie (24h). View/filter registrations, manage webinar sessions.

**API Routes (`src/pages/api/`):**
- `create-order` — Creates Razorpay order (₹99/ticket × quantity)
- `verify` — Validates Razorpay signature, saves registration to DB
- `payment-failed` — Logs failed payment attempts
- `sessions` — Returns active sessions (public)
- `admin/login`, `admin/logout` — JWT auth
- `admin/registrations` — Fetch all registrations (admin-only)
- `admin/sessions`, `admin/sessions/[id]` — CRUD for webinar sessions (admin-only)

**Libs:**
- `src/lib/db.ts` — `pg` connection pool. Uses `rejectUnauthorized: false` in production for RDS SSL.
- `src/lib/auth.ts` — JWT verification helper for admin routes.

**Database:** PostgreSQL. Schema in `init.sql`. Two tables: `sessions` (webinar scheduling) and `registrations` (payment + attendee data, FK to sessions).

**Payment flow:** User submits form → `create-order` (Razorpay order) → Razorpay checkout opens → on success callback `verify` validates signature + saves to DB → confirmation shown inline.

## Environment Variables

Copy `.env.example` to `.env.local` for local dev:

```
RAZORPAY_KEY_ID=         # Razorpay API key (live: rzp_live_*, test: rzp_test_*)
RAZORPAY_KEY_SECRET=     # Razorpay secret
DATABASE_URL=            # PostgreSQL connection string
ADMIN_PASSWORD=          # Plain-text password for /admin login
JWT_SECRET=              # Secret for signing admin JWT tokens
```

Local dev uses `postgresql://postgres:postgres@localhost:5432/gbd_webinar` (Docker Compose).

## Design Tokens

Tailwind config defines custom colors used throughout:
- `primary`: `#0D3535` (dark teal)
- `accent`: `#C8A043` (gold)
- Background: `#F8F7F4` (light beige)

Fonts: Playfair Display (headings), DM Sans (body) — loaded via `_document.tsx`.

## Deployment

Docker multi-stage build (`Dockerfile`). `next.config.js` uses `output: 'standalone'`. Production compose file: `docker-compose.prod.yml`. The app is deployed on an EC2 instance backed by AWS RDS PostgreSQL.
