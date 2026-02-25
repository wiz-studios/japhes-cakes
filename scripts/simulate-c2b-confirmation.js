/**
 * SIMULATE M-PESA C2B CONFIRMATION CALLBACK (PAYBILL)
 *
 * Usage:
 *   node scripts/simulate-c2b-confirmation.js <BILL_REF> [AMOUNT] [TRANS_ID]
 *
 * Example:
 *   node scripts/simulate-c2b-confirmation.js PAB12CD3 1000
 */

function formatDarajaTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0")
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("")
}

const billRef = process.argv[2]
const amount = Number(process.argv[3] || 10)
const transId = process.argv[4] || `C2B${Date.now()}`
const baseUrl = process.env.BASE_URL || "http://localhost:3000"

if (!billRef) {
  console.error("Usage: node scripts/simulate-c2b-confirmation.js <BILL_REF> [AMOUNT] [TRANS_ID]")
  process.exit(1)
}

if (!Number.isFinite(amount) || amount <= 0) {
  console.error("Amount must be a positive number.")
  process.exit(1)
}

const payload = {
  TransactionType: "Pay Bill",
  TransID: transId,
  TransTime: formatDarajaTime(),
  TransAmount: amount,
  BusinessShortCode:
    process.env.MPESA_C2B_SHORTCODE ||
    process.env.MPESA_PAYBILL_SHORTCODE ||
    process.env.MPESA_SHORTCODE ||
    "600000",
  BillRefNumber: billRef,
  InvoiceNumber: "",
  OrgAccountBalance: "",
  ThirdPartyTransID: "",
  MSISDN: "254712345678",
  FirstName: "Test",
  MiddleName: "User",
  LastName: "C2B",
}

console.log("Sending C2B payload:", payload)

fetch(`${baseUrl}/api/mpesa/c2b/confirmation`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
})
  .then(async (res) => {
    const text = await res.text()
    console.log(`Response (${res.status}):`, text)
  })
  .catch((err) => {
    console.error("Request failed:", err)
    process.exit(1)
  })
