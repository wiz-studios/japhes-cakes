export const PAYMENT_CONFIG = {
    env: process.env.PAYMENTS_ENV || "sandbox",

    get isProduction() {
        return this.env === "production"
    },

    lipana: {
        baseUrl: process.env.LIPANA_BASE_URL,
        secretKey: process.env.LIPANA_SECRET_KEY,
        webhookSecret: process.env.LIPANA_WEBHOOK_SECRET,
    },
}

// Validation to ensure we don't run with missing keys
if (!PAYMENT_CONFIG.lipana.secretKey) {
    console.warn("⚠️ LIPANA_SECRET_KEY is missing. Payments will fail.")
}
