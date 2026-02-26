import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const ENV_FILE = join(ROOT, ".env.local")

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, "utf8")
  const parsed = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eqIndex = line.indexOf("=")
    if (eqIndex < 1) continue
    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    parsed[key] = value
  }
  return parsed
}

const fileEnv = parseEnvFile(ENV_FILE)
const env = { ...fileEnv, ...process.env }

const errors = []
const warnings = []

function hasValue(key) {
  const value = env[key]
  return typeof value === "string" && value.trim().length > 0
}

function requireKey(key) {
  if (!hasValue(key)) {
    errors.push(`Missing required env: ${key}`)
  }
}

function requireOneOf(keys, label) {
  const ok = keys.some((key) => hasValue(key))
  if (!ok) {
    errors.push(`Missing required env (${label}): set one of ${keys.join(", ")}`)
  }
}

function readEnv(key) {
  const value = env[key]
  return typeof value === "string" ? value.trim() : ""
}

function validateHttpsUrl(key, expectedPath) {
  const raw = readEnv(key)
  if (!raw) return
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== "https:") {
      errors.push(`${key} must use https: ${raw}`)
    }
    if (expectedPath && !parsed.pathname.includes(expectedPath)) {
      errors.push(`${key} should include path '${expectedPath}': ${raw}`)
    }
  } catch {
    errors.push(`${key} is not a valid URL: ${raw}`)
  }
}

function validateHttpsUrlAnyPath(key, expectedPaths) {
  const raw = readEnv(key)
  if (!raw) return
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== "https:") {
      errors.push(`${key} must use https: ${raw}`)
    }
    const matches = expectedPaths.some((expectedPath) => parsed.pathname.includes(expectedPath))
    if (!matches) {
      errors.push(`${key} should include one of paths [${expectedPaths.join(", ")}]: ${raw}`)
    }
  } catch {
    errors.push(`${key} is not a valid URL: ${raw}`)
  }
}

function warnIfNoToken(key) {
  const raw = readEnv(key)
  if (!raw) return
  if (!raw.includes("token=")) {
    warnings.push(`${key} has no token query parameter (recommended for hardened callback URLs).`)
  }
}

function checkFile(path) {
  if (!existsSync(join(ROOT, path))) {
    errors.push(`Missing required file: ${path}`)
  }
}

// Core application env
requireKey("NEXT_PUBLIC_SUPABASE_URL")
requireKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")
requireKey("SUPABASE_SERVICE_ROLE_KEY")
requireKey("ADMIN_EMAIL")

// Daraja + callbacks
requireKey("MPESA_ENV")
requireKey("MPESA_CONSUMER_KEY")
requireKey("MPESA_CONSUMER_SECRET")
requireKey("MPESA_PASSKEY")
requireOneOf(["MPESA_PAYBILL_SHORTCODE", "MPESA_SHORTCODE"], "Paybill shortcode")
requireKey("MPESA_CALLBACK_URL")
requireKey("MPESA_C2B_CONFIRMATION_URL")
requireKey("MPESA_C2B_VALIDATION_URL")
requireKey("MPESA_CALLBACK_SECRET")
requireKey("MPESA_C2B_CALLBACK_SECRET")
requireKey("MPESA_REGISTER_SECRET")

// Helpful optional hardening
if (!hasValue("MPESA_CALLBACK_HMAC_SECRET")) {
  warnings.push("Optional env not set: MPESA_CALLBACK_HMAC_SECRET")
}
if (!hasValue("MPESA_C2B_CALLBACK_HMAC_SECRET")) {
  warnings.push("Optional env not set: MPESA_C2B_CALLBACK_HMAC_SECRET")
}

// Validate enums and URLs
const mpesaEnv = readEnv("MPESA_ENV")
if (mpesaEnv && !["sandbox", "production"].includes(mpesaEnv)) {
  errors.push(`MPESA_ENV must be 'sandbox' or 'production' (got '${mpesaEnv}')`)
}

validateHttpsUrl("NEXT_PUBLIC_SUPABASE_URL")
validateHttpsUrlAnyPath("MPESA_CALLBACK_URL", ["/api/mpesa/callback", "/api/pay/callback"])
validateHttpsUrlAnyPath("MPESA_C2B_CONFIRMATION_URL", ["/api/mpesa/c2b/confirmation", "/api/pay/c2b/confirmation"])
validateHttpsUrlAnyPath("MPESA_C2B_VALIDATION_URL", ["/api/mpesa/c2b/validation", "/api/pay/c2b/validation"])
warnIfNoToken("MPESA_C2B_CONFIRMATION_URL")
warnIfNoToken("MPESA_C2B_VALIDATION_URL")

// Migration files expected for production cutover
checkFile("migrations/add_resilience_indexes_and_idempotency.sql")
checkFile("migrations/rls_production_cutover.sql")

const sourceLabel = existsSync(ENV_FILE) ? ".env.local + process env" : "process env only"
console.log(`Prelaunch check source: ${sourceLabel}`)
console.log("")

if (errors.length > 0) {
  console.error("FAILED checks:")
  for (const error of errors) {
    console.error(` - ${error}`)
  }
  if (warnings.length > 0) {
    console.log("")
    console.log("Warnings:")
    for (const warning of warnings) {
      console.log(` - ${warning}`)
    }
  }
  process.exit(1)
}

console.log("All required prelaunch checks passed.")
if (warnings.length > 0) {
  console.log("")
  console.log("Warnings:")
  for (const warning of warnings) {
    console.log(` - ${warning}`)
  }
}
