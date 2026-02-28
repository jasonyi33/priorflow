"use client";

import { ConvexProvider as ConvexClientProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Allow running without Convex during early development
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    // No Convex URL configured — render children without provider
    // Dev 4 can still build UI against mock data / API stubs
    return <>{children}</>;
  }

  return (
    <ConvexClientProvider client={convex}>{children}</ConvexClientProvider>
  );
}
