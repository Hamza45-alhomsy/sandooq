// src/proxy.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match app routes while skipping APIs and static assets
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
