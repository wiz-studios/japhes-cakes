function normalizeLipanaBaseUrl(baseUrl: string | undefined, env: "sandbox" | "production") {
    if (!baseUrl) return undefined

    const trimmed = baseUrl.replace(/\/+$/, "")
    const lower = trimmed.toLowerCase()

    if (lower.includes("api-sandbox.lipana.dev")) {
        return env === "production" ? "https://api.lipana.dev" : trimmed
    }
    if (lower.includes("api.lipana.dev")) {
        return env === "sandbox" ? "https://api-sandbox.lipana.dev" : trimmed
    }

    if (lower.includes("sandbox.lipana.dev") || lower === "https://lipana.dev") {
        return env === "production"
            ? "https://api.lipana.dev"
            : "https://api-sandbox.lipana.dev"
    }

    return trimmed
}

export const PAYMENT_CONFIG = {
    env: (process.env.PAYMENTS_ENV || "sandbox") as "sandbox" | "production",

    get isProduction() {
        return this.env === "production"
    },

    lipana: {
        baseUrl: normalizeLipanaBaseUrl(process.env.LIPANA_BASE_URL, (process.env.PAYMENTS_ENV || "sandbox") as "sandbox" | "production"),
        secretKey: process.env.LIPANA_SECRET_KEY,
        webhookSecret: process.env.LIPANA_WEBHOOK_SECRET,
        paybillNumber: process.env.MPESA_PAYBILL_NUMBER || "982100",
        paybillAccount: process.env.MPESA_PAYBILL_ACCOUNT || "5040323411",
    },
}

// Validation to ensure we don't run with missing keys
if (!PAYMENT_CONFIG.lipana.secretKey) {
    console.warn("⚠️ LIPANA_SECRET_KEY is missing. Payments will fail.")
}
