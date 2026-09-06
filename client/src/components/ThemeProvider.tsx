"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "@teispace/next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
