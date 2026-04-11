"use client";

import * as React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { getConvexUrl } from "@/lib/settleease/convexUrl";

const convex = new ConvexReactClient(getConvexUrl());

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
