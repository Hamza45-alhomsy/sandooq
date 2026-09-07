// src/proxy.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
const middleware = createMiddleware(routing);

export default function (request: any) {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    return Response.redirect(new URL("/ar", request.url));
  }
  return middleware(request);
}

export const config = {
  // Match app routes while skipping APIs and static assets
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
