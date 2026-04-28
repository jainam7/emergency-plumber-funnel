# Twilio SMS Setup — True North Plumbing

End-to-end wiring is **already complete** in code. Once you fill in the four env values below and restart the backend, every new lead saved via `POST /api/leads` will fire an SMS to the dispatcher.

## What you need to set

Open `/app/backend/.env` and fill in these four values (currently empty):

```
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
DISPATCH_PHONE_NUMBER=""
```

| Variable | What it is | Where to get it |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account ID, starts with `AC...` (34 chars) | Twilio Console home page → "Account Info" panel → "Account SID" |
| `TWILIO_AUTH_TOKEN` | Secret token used to sign API calls | Same panel → "Auth Token" → click "Show" |
| `TWILIO_FROM_NUMBER` | Either a Twilio-owned number in **E.164** (e.g. `+15871234567`) **OR** a Messaging Service SID starting with `MG...` | Console → "Phone Numbers → Manage → Active numbers" (buy one if needed). Or "Messaging → Services → create" for a Messaging Service SID. **For Canada (587/403/etc), buy a Canadian number** to avoid international SMS surcharges. |
| `DISPATCH_PHONE_NUMBER` | The dispatcher's mobile in E.164 (e.g. `+14035551234`) | Whatever phone should receive the alerts. **During Twilio trial mode, this number must be verified** in your Twilio Verified Caller IDs list. |

## Quick step-by-step (5 minutes)

1. Go to https://www.twilio.com/console and sign in (or sign up — free trial gives you ~$15 credit and a sandbox number)
2. Copy `Account SID` and `Auth Token` from the dashboard → paste into `.env`
3. Buy a phone number: **Phone Numbers → Buy a Number** → filter Country = Canada, capability = SMS → ~$1/month
4. Copy that number (in `+1XXXXXXXXXX` format) into `TWILIO_FROM_NUMBER`
5. If on free trial: **Phone Numbers → Verified Caller IDs → Add a new Caller ID** → enter the dispatcher's mobile and complete the verification call/SMS
6. Put the dispatcher's number into `DISPATCH_PHONE_NUMBER` (E.164, e.g. `+14035551234`)
7. Restart backend: `sudo supervisorctl restart backend`
8. Submit a test lead from the chat widget on the live site → dispatcher's phone should buzz within seconds

## What the SMS looks like

```
🚨 NEW LEAD (chat_widget)
Jane Smith — 4035550199
[Emergency leak / burst pipe] [Right now — emergency] Burst pipe in basement…
Reply or call now.
```

## Safe behavior

- If **any** of the four env values is empty/blank, the app **logs a notice and silently skips** the SMS. Lead is still saved. So the public site keeps working before you wire up Twilio.
- The Twilio call runs as a **FastAPI BackgroundTask** — the chat widget gets its `200 OK` instantly and never waits on Twilio.
- The Auth Token is **never logged**. Only the resulting Twilio message SID + delivery status are logged.
- Twilio errors (auth failure, suspended account, invalid number, etc.) are **caught and logged**, not raised — so a Twilio outage cannot break lead capture.

## Costs

- Phone number rental: ~CAD $1.15/month
- SMS to Canadian numbers: ~CAD $0.0085/message (so 100 leads/month ≈ CAD $0.85)
- Trial credit: $15 free on signup (about 1500+ messages)

## Files involved

- `/app/backend/notifications.py` — SMS helper (gracefully no-ops if creds blank)
- `/app/backend/server.py` — `POST /api/leads` schedules `send_lead_sms` as a BackgroundTask
- `/app/backend/.env` — the four placeholder variables you need to fill in
- `/app/backend/requirements.txt` — `twilio==9.10.5` already added
