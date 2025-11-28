import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  //bypass if query param is with "token"
  if (request.nextUrl.searchParams.get("token") === "dualmint_sFD05QtMc1cEoiYt") {
    return NextResponse.next()
  }

  // Allow access to login page, super-login page, API auth routes, and energy dashboard without authentication
  if (pathname === "/login" || 
    pathname === "/super-login" || pathname.startsWith("/api/auth") || pathname === "/energy" || pathname.startsWith("/api/tsdb") || pathname.startsWith("/api/daily-energy") || pathname.startsWith("/api/saved-energy") 
    || pathname.startsWith("/api/saving-percentage")
    || pathname.startsWith("/api/heartbeat")
  ) {
    return NextResponse.next()
  }

  // Check for authentication token
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    await jwtVerify(token, secret)

    // Token is valid, allow access
    return NextResponse.next()
  } catch (error) {
    // Token is invalid, redirect to login
    console.error("JWT verification failed:", error)
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - images folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public|images).*)",
  ],
}
