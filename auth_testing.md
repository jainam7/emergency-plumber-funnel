# Auth Testing Playbook — True North Plumbing Admin

## Endpoints
- `POST /api/auth/login` — body `{email, password}` → `{access_token, user}`
- `GET /api/auth/me` — Bearer token → user object
- `POST /api/auth/logout` — Bearer token → 200 OK (client discards token)
- `GET /api/leads` — Bearer token (admin only)
- `PATCH /api/leads/{id}/status` — Bearer token (admin only) — body `{status: "new"|"contacted"|"booked"|"lost"}`

## Storage
- MongoDB collection `users` — admin user seeded on startup from `.env` (ADMIN_EMAIL / ADMIN_PASSWORD)
- bcrypt password hash (starts with `$2b$`)
- MongoDB collection `login_attempts` — IP+email keyed; 5 fails = 15 min lockout
- Index: `users.email` unique; `login_attempts.identifier`

## Curl checks
```bash
# 1. Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@truenorthplumbing.ca","password":"TrueNorth2026!"}'

# 2. Use the returned access_token
TOKEN=<paste>
curl http://localhost:8001/api/auth/me -H "Authorization: Bearer $TOKEN"

# 3. List leads (now protected)
curl http://localhost:8001/api/leads -H "Authorization: Bearer $TOKEN"

# 4. Update a lead status
curl -X PATCH "http://localhost:8001/api/leads/<lead_id>/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted"}'

# 5. Wrong password 5x → 6th returns 429 lockout
```

## Frontend
- `/admin/login` — form, calls `/api/auth/login`, stores token in `localStorage.tnp_token`
- `/admin` — protected, fetches `/api/leads` and `/api/auth/me` with Bearer header
- Logout button calls `/api/auth/logout` and clears `localStorage`
