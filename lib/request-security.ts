import { NextResponse } from "next/server"

const JSON_CONTENT_TYPES = ["application/json"]

export function hasAllowedContentType(request: Request, allowedTypes: string[]): boolean {
  const contentType = request.headers.get("content-type")?.toLowerCase() || ""
  return allowedTypes.some((allowedType) => contentType.startsWith(allowedType))
}

export function requireJsonRequest(request: Request) {
  if (hasAllowedContentType(request, JSON_CONTENT_TYPES)) {
    return null
  }

  return NextResponse.json(
    { ok: false, message: "Unsupported content type. Expected application/json." },
    { status: 415 }
  )
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init)
  response.headers.set("Cache-Control", "no-store, max-age=0")
  return response
}
