# M-Pesa Paybill + C2B + STK Setup

This project now supports:
- STK Push (`CustomerPayBillOnline`) for initiated order payments.
- C2B Paybill callbacks (validation + confirmation) for direct Paybill payments.

## Endpoints

- STK callback: `/api/mpesa/callback`
- C2B validation callback: `/api/mpesa/c2b/validation`
- C2B confirmation callback: `/api/mpesa/c2b/confirmation`
- C2B register URL helper: `POST /api/mpesa/c2b/register`

## Required Env Vars

Core Daraja:
- `MPESA_ENV` (`sandbox` or `production`)
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL` (public URL to `/api/mpesa/callback`)

Shortcode config:
- `MPESA_PAYBILL_SHORTCODE` (recommended)
- `MPESA_SHORTCODE` (backward compatible fallback)
- `MPESA_STK_SHORTCODE` (optional override for STK only)
- `MPESA_C2B_SHORTCODE` (optional override for C2B only)

C2B URL registration:
- `MPESA_C2B_CONFIRMATION_URL` (public URL to `/api/mpesa/c2b/confirmation`)
- `MPESA_C2B_VALIDATION_URL` (public URL to `/api/mpesa/c2b/validation`)
- `MPESA_C2B_RESPONSE_TYPE` (`Completed` or `Cancelled`, default `Completed`)
- `MPESA_C2B_REQUIRE_ORDER_MATCH` (`true` by default; set `false` to accept unknown bill refs)

Optional route protection:
- `MPESA_REGISTER_SECRET` (protects `POST /api/mpesa/c2b/register`)
- `MPESA_CALLBACK_SECRET` (optional shared secret for custom webhook sources)

## One-Time C2B Register Call

After deploying public callback URLs, register them with Daraja:

```bash
curl -X POST "https://<your-domain>/api/mpesa/c2b/register" \
  -H "Content-Type: application/json" \
  -H "x-register-secret: <MPESA_REGISTER_SECRET>" \
  -d "{}"
```

You can also override URLs/shortcode in the body:

```json
{
  "shortcode": "123456",
  "confirmationUrl": "https://example.com/api/mpesa/c2b/confirmation",
  "validationUrl": "https://example.com/api/mpesa/c2b/validation",
  "responseType": "Completed"
}
```

## Sandbox Test Helper

Use the local simulator for C2B confirmation:

```bash
node scripts/simulate-c2b-confirmation.js <ORDER_REF> <AMOUNT>
```
