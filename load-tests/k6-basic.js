import http from "k6/http"
import { check, sleep } from "k6"

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"
const TEST_PHONE = __ENV.TEST_PHONE || "0712345678"
const TEST_ORDER_ID = __ENV.TEST_ORDER_ID || ""

export const options = {
  scenarios: {
    landing_page: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 120 },
        { duration: "30s", target: 0 },
      ],
      exec: "landingPage",
    },
    submit_inquiry: {
      executor: "constant-arrival-rate",
      rate: 6,
      timeUnit: "1m",
      duration: "3m",
      preAllocatedVUs: 20,
      maxVUs: 60,
      exec: "submitInquiry",
    },
    payment_init: {
      executor: "constant-arrival-rate",
      rate: 20,
      timeUnit: "1m",
      duration: "3m",
      preAllocatedVUs: 10,
      maxVUs: 40,
      exec: "initPayment",
    },
    status_lookup: {
      executor: "constant-arrival-rate",
      rate: 30,
      timeUnit: "1m",
      duration: "3m",
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: "statusLookup",
    },
    health_probe: {
      executor: "constant-vus",
      vus: 5,
      duration: "3m",
      exec: "healthProbe",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1800", "p(99)<3000"],
  },
}

function jsonHeaders(idempotencyKey) {
  return {
    headers: {
      "Content-Type": "application/json",
      "x-request-id": idempotencyKey,
    },
  }
}

export function landingPage() {
  const response = http.get(`${BASE_URL}/`)
  check(response, {
    "landing page ok": (r) => r.status >= 200 && r.status < 400,
  })
  sleep(0.2)
}

export function healthProbe() {
  const response = http.get(`${BASE_URL}/api/health?deep=1`)
  check(response, {
    "health endpoint ok": (r) => r.status === 200 || r.status === 503,
  })
  sleep(0.5)
}

export function submitInquiry() {
  const idKey = `inq-${__VU}-${__ITER}`
  const payload = JSON.stringify({
    name: `Load Tester ${__VU}`,
    phone: TEST_PHONE,
    course: "Cake Baking",
    message: `k6 inquiry run ${__ITER}`,
  })
  const response = http.post(`${BASE_URL}/api/school-inquiry`, payload, jsonHeaders(idKey))
  check(response, {
    "inquiry accepted or throttled": (r) => [200, 400, 429].includes(r.status),
  })
  sleep(0.3)
}

export function initPayment() {
  if (!TEST_ORDER_ID) {
    sleep(0.5)
    return
  }

  const idKey = `stk-${__VU}-${Math.floor(__ITER / 2)}`
  const payload = JSON.stringify({
    orderId: TEST_ORDER_ID,
    phone: TEST_PHONE,
    idempotencyKey: idKey,
  })
  const response = http.post(`${BASE_URL}/api/mpesa/stk`, payload, jsonHeaders(idKey))
  check(response, {
    "payment init handled": (r) => [200, 400, 429].includes(r.status),
  })
  sleep(0.4)
}

export function statusLookup() {
  if (!TEST_ORDER_ID) {
    sleep(0.4)
    return
  }
  const response = http.get(`${BASE_URL}/status?id=${encodeURIComponent(TEST_ORDER_ID)}&phone=${encodeURIComponent(TEST_PHONE)}`)
  check(response, {
    "status lookup responds": (r) => r.status >= 200 && r.status < 500,
  })
  sleep(0.2)
}
