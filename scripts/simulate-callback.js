/**
 * SIMULATE MPESA CALLBACK
 * Usage: 
 *   node scripts/simulate-callback.js <CHECKOUT_REQUEST_ID> <SUCCESS/FAIL>
 * 
 * Example:
 *   node scripts/simulate-callback.js ws_CO_123456... success
 *   node scripts/simulate-callback.js ws_CO_123456... fail
 */

const checkoutRequestId = process.argv[2]
const status = process.argv[3] || 'success'

if (!checkoutRequestId) {
    console.error("Please provide a checkout request ID.")
    process.exit(1)
}

const payload = {
    checkoutRequestId: checkoutRequestId,
    resultCode: status === 'success' ? 0 : 1,
    resultDesc: status === 'success' ? "The service request is processed successfully." : "The balance is insufficient for the transaction.",
    mpesaReceiptNumber: status === 'success' ? "QTY" + Math.random().toString(36).substring(7).toUpperCase() : null
}

console.log("Sending Callback Payload:", payload)

fetch("http://localhost:3000/api/mpesa/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
})
    .then(res => {
        console.log("Status:", res.status)
        return res.text()
    })
    .then(txt => console.log("Response:", txt))
    .catch(err => console.error("Error:", err))
