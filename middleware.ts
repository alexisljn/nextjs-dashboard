import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
 
// NextAuthResult.auth is the function used as the middleware here
export default NextAuth(authConfig).auth;
 
export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};