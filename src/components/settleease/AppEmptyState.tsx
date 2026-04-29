"use client";

import React from "react";

import { cn } from "@/lib/utils";

type EmptyStateSize = "page" | "panel" | "compact";

interface AppEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  secondaryDescription?: string;
  size: EmptyStateSize;
  children?: React.ReactNode;
}

const sizeConfig: Record<
  EmptyStateSize,
  {
    outer: string;
    iconWrap: string;
    icon: string;
    title: string;
    description: string;
    secondary: string;
  }
> = {
  page: {
    outer: "flex min-h-[280px] flex-1 items-center justify-center px-4 py-12 text-center sm:py-16",
    iconWrap: "h-16 w-16",
    icon: "h-7 w-7",
    title: "mt-5 text-xl font-semibold text-foreground sm:text-2xl",
    description: "mt-3 text-sm leading-6 text-muted-foreground sm:text-base",
    secondary: "mt-2 text-sm leading-6 text-muted-foreground",
  },
  panel: {
    outer: "flex min-h-[220px] flex-1 items-center justify-center rounded-lg border bg-card/30 px-4 py-8 text-center",
    iconWrap: "h-14 w-14",
    icon: "h-6 w-6",
    title: "mt-4 text-base font-semibold text-foreground sm:text-lg",
    description: "mt-2 text-sm leading-6 text-muted-foreground",
    secondary: "mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm",
  },
  compact: {
    outer: "flex min-h-[150px] items-center justify-center rounded-lg bg-secondary/20 px-4 py-6 text-center",
    iconWrap: "h-12 w-12",
    icon: "h-5 w-5",
    title: "mt-3 text-sm font-semibold text-foreground sm:text-base",
    description: "mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm",
    secondary: "mt-1 text-xs leading-5 text-muted-foreground",
  },
};

export default function AppEmptyState({
  icon: Icon,
  title,
  description,
  secondaryDescription,
  size,
  children,
}: AppEmptyStateProps) {
  const config = sizeConfig[size];

  return (
    <div className={config.outer}>
      <div className="max-w-md">
        <div className={cn("mx-auto grid place-items-center rounded-full bg-secondary/50 text-primary", config.iconWrap)}>
          <Icon className={config.icon} />
        </div>
        <h2 className={config.title}>{title}</h2>
        <p className={config.description}>{description}</p>
        {secondaryDescription ? <p className={config.secondary}>{secondaryDescription}</p> : null}
        {children ? <div className="mt-4 flex justify-center">{children}</div> : null}
      </div>
    </div>
  );
}
