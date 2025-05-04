import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('authToken');
  
  // Check if the path is a protected route
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // If there's no token, redirect to login
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
}; 