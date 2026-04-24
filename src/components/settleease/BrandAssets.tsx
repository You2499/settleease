"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  size?: number;
}

export function GoogleMark({ className, size = 20 }: BrandMarkProps) {
  return (
    <Image
      src="/google.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}

export function GeminiMark({ className, size = 20 }: BrandMarkProps) {
  return (
    <Image
      src="/gemini.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}
