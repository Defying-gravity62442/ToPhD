import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for API routes, static files, and auth routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/privacy.html') ||
    pathname.startsWith('/terms.html') ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  const token = await getToken({ req: request })
  
  // If not authenticated and trying to access protected routes, redirect to home
  if (!token && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If authenticated, check onboarding status for protected routes
  if (token && pathname !== '/') {
    // Skip onboarding check for onboarding pages themselves
    if (pathname.startsWith('/onboarding/')) {
      return NextResponse.next()
    }

    // Skip onboarding check for create-goal and dashboard (these will handle their own redirects)
    if (pathname === '/create-goal' || pathname === '/dashboard') {
      return NextResponse.next()
    }

    // For all other protected routes, check onboarding status
    try {
      const onboardingResponse = await fetch(`${request.nextUrl.origin}/api/user/onboarding-status`, {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      })

      if (onboardingResponse.ok) {
        const { nextStep, isComplete } = await onboardingResponse.json()
        
        // If onboarding is not complete, redirect to appropriate step
        if (!isComplete) {
          let redirectUrl = '/onboarding/consent'

          if (nextStep === 'e2ee') {
            redirectUrl = '/onboarding/e2ee'
          } else if (nextStep === 'preferences') {
            redirectUrl = '/onboarding/preferences'
          }

          return NextResponse.redirect(new URL(redirectUrl, request.url))
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status in middleware:', error)
      // On error, allow the request to proceed
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 