import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])
const CSRF_EXEMPT_PREFIXES = [
  "/api/mpesa/",
  "/api/pay/",
  "/api/cron/",
]

function getExpectedOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "")
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host
  return `${forwardedProto}://${forwardedHost}`
}

function buildContentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV !== "production"
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https:`,
    "connect-src 'self' https: wss:",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ")
}

function isCsrfExemptPath(pathname: string) {
  return CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function hasTrustedOrigin(request: NextRequest) {
  const expectedOrigin = getExpectedOrigin(request)
  const originHeader = request.headers.get("origin")?.trim()
  if (originHeader) return originHeader === expectedOrigin

  const refererHeader = request.headers.get("referer")?.trim()
  if (!refererHeader) return false

  try {
    return new URL(refererHeader).origin === expectedOrigin
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (process.env.NODE_ENV === "production") {
    const proto = request.headers.get("x-forwarded-proto")
    if (proto && proto !== "https") {
      const secureUrl = new URL(request.url)
      secureUrl.protocol = "https:"
      return NextResponse.redirect(secureUrl, 308)
    }
  }

  if (MUTATING_METHODS.has(request.method) && !isCsrfExemptPath(path) && !hasTrustedOrigin(request)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ ok: false, message: "Cross-site request blocked." }, { status: 403 })
    }
    return new NextResponse("Cross-site request blocked.", { status: 403 })
  }

  const nonce = crypto.randomUUID().replace(/-/g, "")
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    },
  )

  // 2. Get User Info
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Define Protected Routes
  if (path.startsWith("/admin") || path.startsWith("/kitchen") || path.startsWith("/delivery")) {
    // If not logged in, redirect to login
    if (path.startsWith("/admin/login")) {
      return response
    }

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    // 4. Role-Based Access Control
    const role = user.user_metadata?.role
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const isAdminByEmail = !!adminEmail && user.email?.toLowerCase() === adminEmail

    // KITCHEN Route: Allowed for 'kitchen' OR 'admin'
    if (path.startsWith("/kitchen")) {
      const allowed = isAdminByEmail || role === "admin" || role === "kitchen"
      if (!allowed) {
        if (role === "delivery") return NextResponse.redirect(new URL("/delivery", request.url))
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    }

    // DELIVERY Route: Allowed for 'delivery' OR 'admin'
    if (path.startsWith("/delivery")) {
      const allowed = isAdminByEmail || role === "admin" || role === "delivery"
      if (!allowed) {
        if (role === "kitchen") return NextResponse.redirect(new URL("/kitchen", request.url))
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    }

    // ADMIN Route: Allowed ONLY for 'admin'
    if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
      const allowed = isAdminByEmail || role === "admin"
      if (!allowed) {
        if (role === "kitchen") return NextResponse.redirect(new URL("/kitchen", request.url))
        if (role === "delivery") return NextResponse.redirect(new URL("/delivery", request.url))
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    }
  }

  response.headers.set("x-nonce", nonce)
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce))

  if (
    path.startsWith("/admin") ||
    path.startsWith("/kitchen") ||
    path.startsWith("/delivery") ||
    path.startsWith("/api/")
  ) {
    response.headers.set("Cache-Control", "no-store, max-age=0")
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
