import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/login(.*)',
  '/register(.*)',
  '/forgot-password(.*)',
  '/api/webhooks(.*)',
  '/api/locale(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const { pathname } = req.nextUrl

  // Signed-in user on landing page → redirect to dashboard
  if (userId && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Signed-in user on login/register → redirect to dashboard
  if (userId && (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Not signed in on protected route → redirect to sign-in
  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
