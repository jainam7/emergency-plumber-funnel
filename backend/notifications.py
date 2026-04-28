"""
Twilio SMS notifications.

The dispatcher gets an SMS the moment a new lead lands. This module is
deliberately defensive: if any required env var is missing/blank, send_lead_sms
becomes a silent no-op so the app keeps working before credentials are wired in.

Env vars (configure in /app/backend/.env):
  TWILIO_ACCOUNT_SID      — Account SID from Twilio Console (starts with 'AC...')
  TWILIO_AUTH_TOKEN       — Auth Token from Twilio Console (kept secret)
  TWILIO_FROM_NUMBER      — A Twilio-owned number in E.164 format (e.g. +15005550006)
                            OR a Messaging Service SID starting with 'MG...'
  DISPATCH_PHONE_NUMBER   — The dispatcher's mobile in E.164 (+1... for Canada/US)
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

REQUIRED_ENV_VARS = (
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
    "DISPATCH_PHONE_NUMBER",
)


def _twilio_configured() -> bool:
    return all(os.environ.get(k, "").strip() for k in REQUIRED_ENV_VARS)


def _truncate(s: str, n: int = 100) -> str:
    s = (s or "").strip()
    return s if len(s) <= n else s[: n - 1] + "…"


def _build_message(name: str, phone: str, issue: str, source: Optional[str]) -> str:
    src = (source or "").split(":", 1)[0] or "web"
    return (
        f"🚨 NEW LEAD ({src})\n"
        f"{name} — {phone}\n"
        f"{_truncate(issue, 140)}\n"
        f"Reply or call now."
    )


def send_lead_sms(name: str, phone: str, issue: str, source: Optional[str] = None) -> None:
    """Synchronous Twilio call. Use FastAPI's BackgroundTasks to keep the
    POST /api/leads response fast. Never raises; logs and swallows errors."""
    if not _twilio_configured():
        logger.info("Twilio not configured — skipping SMS for lead %s", phone)
        return

    try:
        # Lazy import so missing twilio package doesn't break app boot.
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        account_sid = os.environ["TWILIO_ACCOUNT_SID"].strip()
        auth_token = os.environ["TWILIO_AUTH_TOKEN"].strip()
        from_value = os.environ["TWILIO_FROM_NUMBER"].strip()
        to_number = os.environ["DISPATCH_PHONE_NUMBER"].strip()

        client = Client(account_sid, auth_token)
        body = _build_message(name, phone, issue, source)

        kwargs = {"to": to_number, "body": body}
        if from_value.startswith("MG"):
            # Messaging Service SID
            kwargs["messaging_service_sid"] = from_value
        else:
            kwargs["from_"] = from_value

        msg = client.messages.create(**kwargs)
        # Never log the auth token or the full body. SID is fine to log.
        logger.info("Twilio SMS dispatched sid=%s status=%s to=%s", msg.sid, msg.status, to_number)
    except Exception as e:  # noqa: BLE001
        # Includes TwilioRestException; swallow so lead capture is never blocked.
        logger.exception("Twilio SMS failed: %s", type(e).__name__)
