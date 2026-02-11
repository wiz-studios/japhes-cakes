# Strict M-Pesa STK Push Implementation (Lipana)

This document outlines the **Sandbox-First** integration of M-Pesa STK Push using the Lipana API. The system is designed to enforce zero data leaks between sandbox and production environments.

## Core Architecture

The implementation follows a strict **"Env-Flag"** pattern. A single source of truth (`PAYMENTS_ENV`) dictates whether the system talks to real money endpoints or the sandbox.

```mermaid
graph TD
    User[User] -->|Click Pay| Client[Client (Browser)]
    Client -->|Submit Order| Server[Server Action]
    Server -->|1. Validate & Persist| DB[(Supabase)]
    Server -->|2. Initiate STK| Lipana[Lipana API]
    Lipana -->|3. STK Prompt| Phone[User Phone]
    Lipana -->|4. Webhook Event| Webhook[Webhook Endpoint]
    Webhook -->|5. Verify & Update| DB
    DB -->|6. Status Update| Client
```

## Implemented Components

### 1. Central Configuration
**File:** `lib/config/payments.ts`

- **Purpose**: Prevents "magic strings" and accidental production usage.
- **Logic**: Exports `PAYMENT_CONFIG` which automatically selects keys and URLs based on `process.env.PAYMENTS_ENV`.
- **Base URL**: Optionally set `LIPANA_BASE_URL` (no trailing `/v1` needed); the SDK will use the default base if unset.
  - Production default: `https://api.lipana.dev`
  - Sandbox default: `https://api-sandbox.lipana.dev`

### Paybill Account Reference
**Default**: Paybill `982100`, Account `5040323411` (configurable via env vars).

### 2. Secure Backend Initiation
**File:** `lib/mpesa.ts`

- **Function**: `initiateMpesaSTK(orderId, phone)`
- **Security**: 
    - Fetches `order.total_amount` directly from the database (never trusts the client).
    - Generates and stores a unique `lipana_checkout_request_id` for tracking.
- **API**: Uses `@lipana/sdk` (`transactions.initiateStkPush`) with environment set by `PAYMENTS_ENV`.

### 3. Strict Webhook Handler
**File:** `app/api/webhooks/lipana/route.ts`

- **Security**: Verifies `X-Lipana-Signature` using HMAC SHA-256 and your Secret Key.
- **Idempotency**: 
    - Checks `lipana_checkout_request_id` to find the order.
    - **Crucial**: If an order is already `paid`, it ignores duplicate success or failure callbacks to prevent overwriting valid payments.
- **Updates**: Sets status to `paid` or `failed` and records the `lipana_transaction_id`.

### 4. Sandbox UX
**File:** `components/OrderSubmitted.tsx`

- **Visual Feedback**: Displays a specific **"Test Payment (Sandbox)"** badge when in sandbox mode.
- **Status Messaging**:
    - *Initiated*: "Waiting for M-Pesa confirmation..."
    - *Success*: "Payment Confirmed"
    - *Failure*: "Payment failed — retry"

## Data Model Changes

We updated `lib/types/payment.ts` and the Order schema to track external IDs:

```typescript
interface Order {
    // ... existing fields
    lipana_transaction_id: string | null       // The final receipt ID (e.g., LPN_...)
    lipana_checkout_request_id: string | null  // The unique request ID for tracking
}
```

## How to Test (Sandbox)

1.  Ensure `.env.local` has `PAYMENTS_ENV=sandbox` and valid Lipana keys.
2.  Place an order on `localhost:3000`.
3.  Choose **M-Pesa** payment.
4.  **Observe**:
    - The UI shows the yellow "Sandbox" badge.
    - If configured correctly, your test phone receives a prompt (or use Lipana simulator).
    - After paying (or simulating success), the UI updates to **"Payment Confirmed"** automatically via polling.
5.  **Verify Kitchen Lock**: Try to view the order in the Admin Dashboard; it should be allowed to progress only after payment.
