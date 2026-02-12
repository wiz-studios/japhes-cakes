const fs = require("fs")
const path = require("path")
const { Client } = require("pg")

function readArg(flag) {
  const idx = process.argv.indexOf(`--${flag}`)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`
}

function chunkArray(items, size) {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function runSqlFile(client, relativePath) {
  const fullPath = path.join(__dirname, "..", relativePath)
  const sql = fs.readFileSync(fullPath, "utf8")
  if (!sql.trim()) return
  await client.query(sql)
}

async function main() {
  const oldUrl = readArg("old") || process.env.OLD_DATABASE_URL
  const newUrl = readArg("new") || process.env.NEW_DATABASE_URL

  if (!oldUrl || !newUrl) {
    console.error("Usage: node scripts/migrate-supabase.js --old <OLD_DB_URL> --new <NEW_DB_URL>")
    process.exit(1)
  }

  const oldClient = new Client({
    connectionString: oldUrl,
    ssl: { rejectUnauthorized: false },
  })
  const newClient = new Client({
    connectionString: newUrl,
    ssl: { rejectUnauthorized: false },
  })

  console.log("Connecting to old database...")
  await oldClient.connect()
  console.log("Connecting to new database...")
  await newClient.connect()

  try {
    console.log("Applying schema and migrations to new database...")
    const schemaFiles = [
      "scripts/01-init-schema.sql",
      "migrations/add_payment_fields.sql",
      "migrations/add_mpesa_checkout_id.sql",
      "migrations/add_gps_delivery.sql",
      "migrations/add_friendly_id.sql",
      "migrations/update_payment_status_constraint.sql",
      "migrations/add_school_gallery.sql",
      "scripts/06-get-recent-scheduled-pizza-orders.sql",
    ]

    for (const file of schemaFiles) {
      await runSqlFile(newClient, file)
    }

    const { rows: paymentRows } = await oldClient.query(
      "SELECT DISTINCT payment_status FROM orders WHERE payment_status IS NOT NULL"
    )
    const paymentStatuses = paymentRows.map((r) => r.payment_status)
    if (paymentStatuses.includes("expired")) {
      console.log("Detected payment_status='expired' in old data; updating constraint to allow it.")
      await newClient.query("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check")
      await newClient.query(
        "ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending', 'initiated', 'paid', 'pay_on_delivery', 'pay_on_pickup', 'failed', 'expired'))"
      )
    }

    console.log("Clearing target tables in new database...")
    await newClient.query(
      'TRUNCATE "order_items", "admin_notes", "orders", "delivery_zones" RESTART IDENTITY CASCADE'
    )

    const targetTables = ["delivery_zones", "orders", "order_items", "admin_notes"]

    for (const table of targetTables) {
      console.log(`Migrating ${table}...`)
      const { rows } = await oldClient.query(`SELECT * FROM ${quoteIdent(table)}`)
      if (rows.length === 0) {
        console.log(`- ${table}: no rows`)
        continue
      }

      const columns = Object.keys(rows[0])
      const columnList = columns.map(quoteIdent).join(", ")
      const chunks = chunkArray(rows, 500)

      for (const chunk of chunks) {
        const values = []
        const placeholders = chunk
          .map((row) => {
            const rowPlaceholders = columns.map((col) => {
              values.push(row[col])
              return `$${values.length}`
            })
            return `(${rowPlaceholders.join(", ")})`
          })
          .join(", ")

        const insertSql = `INSERT INTO ${quoteIdent(table)} (${columnList}) VALUES ${placeholders}`
        await newClient.query(insertSql, values)
      }

      console.log(`- ${table}: ${rows.length} rows migrated`)
    }

    console.log("Migration complete.")
  } finally {
    await oldClient.end()
    await newClient.end()
  }
}

main().catch((error) => {
  console.error("Migration failed:", error.message)
  process.exit(1)
})
