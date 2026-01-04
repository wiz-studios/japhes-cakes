import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
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
              headers: request.headers,
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
              headers: request.headers,
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
  const path = request.nextUrl.pathname

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

    // KITCHEN Route: Allowed for 'kitchen' OR 'admin'
    if (path.startsWith("/kitchen")) {
      const allowed = role === "admin" || role === "kitchen"
      if (!allowed) {
        if (role === "delivery") return NextResponse.redirect(new URL("/delivery", request.url))
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    }

    // DELIVERY Route: Allowed for 'delivery' OR 'admin'
    if (path.startsWith("/delivery")) {
      const allowed = role === "admin" || role === "delivery"
      if (!allowed) {
        if (role === "kitchen") return NextResponse.redirect(new URL("/kitchen", request.url))
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    }

    // ADMIN Route: Allowed ONLY for 'admin'
    if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
      const allowed = role === "admin"
      if (!allowed) {
        if (role === "kitchen") return NextResponse.redirect(new URL("/kitchen", request.url))
        if (role === "delivery") return NextResponse.redirect(new URL("/delivery", request.url))
        return NextResponse.redirect(new URL("/admin/login", request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
