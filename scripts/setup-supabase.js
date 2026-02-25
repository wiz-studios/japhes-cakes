const fs = require("fs")
const path = require("path")
const { Client } = require("pg")

function readArg(flag) {
  const idx = process.argv.indexOf(`--${flag}`)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

async function runSqlFile(client, relativePath) {
  const fullPath = path.join(__dirname, "..", relativePath)
  const sql = fs.readFileSync(fullPath, "utf8")
  if (!sql.trim()) return
  await client.query(sql)
}

async function main() {
  const databaseUrl = readArg("db") || process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("Usage: node scripts/setup-supabase.js --db <DATABASE_URL>")
    process.exit(1)
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  console.log("Connecting to database...")
  await client.connect()

  try {
    console.log("Applying schema and migrations...")
    const schemaFiles = [
      "scripts/01-init-schema.sql",
      "migrations/add_payment_fields.sql",
      "migrations/add_partial_payment.sql",
      "migrations/add_mpesa_checkout_id.sql",
      "migrations/add_payment_attempts.sql",
      "migrations/harden_payment_uniqueness.sql",
      "migrations/add_gps_delivery.sql",
      "migrations/add_friendly_id.sql",
      "migrations/update_payment_status_constraint.sql",
      "migrations/add_school_gallery.sql",
      "migrations/add_resilience_indexes_and_idempotency.sql",
      "migrations/rls_production_cutover.sql",
      "scripts/06-get-recent-scheduled-pizza-orders.sql",
      "scripts/02-seed-zones.sql",
    ]

    for (const file of schemaFiles) {
      await runSqlFile(client, file)
    }

    console.log("Setup complete.")
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error("Setup failed:", error.message)
  process.exit(1)
})
