# True North Plumbing — PRD

## Original Problem Statement
Single-page, mobile-first, CRO-focused landing page for True North Plumbing (Calgary, Canada). Strict goal: lead generation + phone calls. No 3D animations or heavy background videos.

## Brand
- Primary: Deep Trust Blue `#0b3d91`
- Accent / CTA: High-Visibility Orange `#ff6b00`
- Type: Inter (clean sans-serif)
- Vibe: urgent, professional, local, trustworthy

## User Personas
- Calgary homeowner with an active plumbing emergency (burst pipe, no hot water, clogged drain) — wants instant phone contact or a quick estimate.

## Architecture
- **Backend** (FastAPI + MongoDB): `POST /api/leads`, `GET /api/leads` with Lead model `{id, name, phone, issue, source, created_at}`. UUID ids, ISO timestamps, `_id` excluded.
- **Frontend** (React + Tailwind + Shadcn UI): single-page with sticky Navbar, Hero, Trust Banner, Services (3 cards), Final CTA, Footer, plus Shadcn Dialog lead-capture modal.

## Implemented (December 2025)
- Sticky white navbar with bold logo + red "24/7 Emergency Service" + phone CTA `tel:+14035550199`
- Hero (dark blue) with H1, H2, pulsing orange CTA, secondary "Call now" outline button, mini-trust strip, plumber photo with rating overlay
- Trust banner (Licensed & Insured, A+ BBB, 500+ reviews) with Lucide icons
- 3 service cards (Leaks, Water Heater, Drain) — each with image, icon, copy, "Get a quote" CTA
- Final CTA section "Need a Plumber Right Now?" with second pulsing orange button
- Minimal dark footer with copyright text per spec
- Shadcn Dialog lead form (name, phone, issue) — POSTs to `/api/leads`, success state with click-to-call
- Scripted **chat widget** (floating orange bubble, bottom-right) — multi-step flow with typing indicator
- All orange CTAs carry `ai-chat-trigger` class and now open the chat widget
- **Auth + Admin panel (Dec 2025)** — JWT auth (PyJWT + bcrypt), seeded admin from `.env`, `/admin/login` + `/admin` dashboard with leads table, status workflow (new/contacted/booked/lost), filter tiles, search, mobile cards, per-account brute-force lockout (5 fails / 15 min)
- Mobile-first responsive (validated at 390px); lightweight CSS animations (cta-pulse, float-in) — respect `prefers-reduced-motion`
- Tested: 3 testing-agent iterations; all 100% green after the brute-force fix

## Backlog (P1 / P2)
- P1: Hook a real chat widget into `.ai-chat-trigger` (code already wired)
- P1: Replace placeholder phone number with the real business line
- P2: Admin-protected `/leads` viewer page (currently unauthenticated GET)
- P2: SMS/email notification on new lead (Twilio / SendGrid / Resend)
- P2: Service-area map and customer review carousel
- P2: Schema.org LocalBusiness + Plumber JSON-LD for local SEO
- P2: Add `og:image` / `twitter:card` meta for social shares

## Next Action Items
- Wire actual chat widget JS (button class is `ai-chat-trigger`)
- Decide on lead-notification channel (SMS vs email)
