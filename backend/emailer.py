"""Email service via Resend. All sends run in a thread to keep FastAPI async."""
import asyncio
import logging
import os
import resend

logger = logging.getLogger("emailer")
resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER = os.environ.get("SENDER_EMAIL", "FleetGrid <onboarding@resend.dev>")
APP_URL = os.environ.get("APP_URL", "")


def _wrap(title: str, body_html: str, cta: dict | None = None) -> str:
    cta_block = ""
    if cta:
        cta_block = f"""
        <tr><td align="center" style="padding:24px 0">
          <a href="{cta['url']}" style="background:#002FA7;color:#fff;text-decoration:none;padding:14px 28px;font-family:Arial,sans-serif;font-weight:600;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;display:inline-block">{cta['label']}</a>
        </td></tr>
        """
    return f"""<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#0a0a0a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0">
  <tr><td style="background:#0a0a0a;color:#fff;padding:24px 32px;font-weight:800;letter-spacing:-0.02em;font-size:18px">FLEETGRID</td></tr>
  <tr><td style="padding:32px">
    <h1 style="font-size:24px;margin:0 0 16px 0;letter-spacing:-0.02em">{title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#334155">{body_html}</div>
  </td></tr>
  {cta_block}
  <tr><td style="background:#f8fafc;padding:16px 32px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0">
    Sent from FleetGrid · Multi-tenant fleet operating system
  </td></tr>
</table></td></tr></table></body></html>"""


async def _send(to: str, subject: str, html: str) -> dict | None:
    if not os.environ.get("RESEND_API_KEY"):
        logger.warning("RESEND_API_KEY missing; email skipped")
        return None
    try:
        return await asyncio.to_thread(
            resend.Emails.send,
            {"from": SENDER, "to": [to], "subject": subject, "html": html},
        )
    except Exception as e:
        logger.error(f"Resend send failed to {to}: {e}")
        return None


async def send_verification_email(to: str, name: str, token: str) -> None:
    url = f"{APP_URL}/verify-email?token={token}"
    body = f"<p>Hi {name},</p><p>Welcome to FleetGrid. Confirm your email to activate your workspace.</p><p>This link expires in 24 hours.</p>"
    await _send(to, "Verify your FleetGrid email", _wrap("Verify your email", body, {"url": url, "label": "Verify email"}))


async def send_password_reset_email(to: str, name: str, token: str) -> None:
    url = f"{APP_URL}/reset-password?token={token}"
    body = f"<p>Hi {name},</p><p>We received a request to reset your password. The link below expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>"
    await _send(to, "Reset your FleetGrid password", _wrap("Reset your password", body, {"url": url, "label": "Reset password"}))


async def send_delivery_status_email(to: str, customer_name: str, tracking_code: str, status: str) -> None:
    pretty = status.replace("_", " ").title()
    url = f"{APP_URL}/track/{tracking_code}"
    body = f"<p>Hi {customer_name},</p><p>Your shipment <b style='font-family:monospace'>{tracking_code}</b> is now <b>{pretty}</b>.</p>"
    await _send(to, f"Shipment {tracking_code} · {pretty}", _wrap(f"Shipment is {pretty}", body, {"url": url, "label": "Track shipment"}))
