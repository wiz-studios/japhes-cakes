import crypto from "crypto"
import { PAYMENT_CONFIG } from "../lib/config/payments"

// Load env vars if running standalone (or assume run via 'npx tsx' which loads .env)
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const SECRET = process.env.LIPANA_WEBHOOK_SECRET || process.env.LIPANA_SECRET_KEY
const BASE_URL = "http://localhost:3000/api/webhooks/lipana"

async function simulateWebhook() {
    const checkoutRequestId = process.argv[2]
    if (!checkoutRequestId) {
        console.error("Usage: npx tsx scripts/simulate-webhook.ts <checkout_request_id> [success|failed]")
        process.exit(1)
    }

    const status = process.argv[3] || "success"
    const isSuccess = status === "success"

    const payload = {
        type: isSuccess ? "payment.success" : "payment.failed",
        data: {
            checkout_request_id: checkoutRequestId,
            transaction_reference: isSuccess ? "LIPANA_TEST_" + Date.now() : undefined,
            ResultCode: isSuccess ? 0 : 1,
            ResultDesc: isSuccess ? "Success" : "User Cancelled"
        }
    }

    const body = JSON.stringify(payload)

    // Generate Valid Signature
    const hmac = crypto.createHmac("sha256", SECRET!)
    const signature = hmac.update(body).digest("hex")

    console.log(`Sending ${status} webhook for ID: ${checkoutRequestId}...`)
    console.log(`Target: ${BASE_URL}`)
    console.log(`Signature: ${signature}`)

    try {
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Lipana-Signature": signature
            },
            body
        })

        const data = await res.json()
        console.log("Response:", res.status, data)
    } catch (err) {
        console.error("Request Failed:", err)
    }
}

simulateWebhook()
