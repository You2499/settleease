"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const insightsSelectTriggerClass =
  "h-10 rounded-lg border-border/60 bg-background px-3 text-sm shadow-sm transition-none hover:bg-background hover:text-foreground data-[state=open]:bg-background";
export const insightsSelectItemClass =
  "transition-none hover:bg-transparent hover:text-popover-foreground focus:bg-transparent focus:text-popover-foreground data-[highlighted]:bg-transparent data-[highlighted]:text-popover-foreground";
export const insightsTabsListClass =
  "grid h-10 w-full grid-cols-2 rounded-lg border border-border/60 bg-muted/60 p-1";
export const insightsTabsTriggerClass =
  "gap-2 rounded-md px-3 text-xs transition-none hover:bg-transparent hover:text-foreground sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm";

export function InsightsLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 pb-12 pt-4 sm:gap-5 sm:px-4 lg:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function InsightsPageHeader({
  icon: Icon,
  title,
  description,
  meta,
  controls,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  controls?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden rounded-lg border shadow-lg", className)}>
      <CardHeader className="px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="flex items-center text-xl font-bold sm:text-2xl">{title}</CardTitle>
            {description ? (
              <CardDescription className="mt-1 text-xs sm:text-sm">{description}</CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      {meta || controls ? (
        <CardContent className="space-y-4 border-t px-4 pb-4 pt-4 sm:px-6 sm:pb-5">
          {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
          {controls ? <div className="min-w-0">{controls}</div> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function InsightsSectionHeader({
  label,
  title,
  icon: Icon,
  className,
}: {
  label?: string;
  title: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-start gap-3", className)}>
      {Icon ? (
        <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0">
        {label ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      </div>
    </div>
  );
}

export function InsightsSurface({
  eyebrow,
  title,
  description,
  headerAside,
  children,
  className,
  tone = "default",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  headerAside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "muted";
}) {
  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border shadow-lg",
        tone === "muted" ? "bg-muted/20" : "bg-card",
        className,
      )}
    >
      <CardHeader className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
            ) : null}
            <CardTitle className="mt-1 text-base font-semibold leading-tight sm:text-lg">{title}</CardTitle>
            {description ? (
              <CardDescription className="mt-1 text-xs leading-relaxed sm:text-sm">{description}</CardDescription>
            ) : null}
          </div>
          {headerAside ? <div className="flex min-w-0 flex-wrap items-center gap-2">{headerAside}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">{children}</CardContent>
    </Card>
  );
}

export function InsightsMetaBadge({
  icon: Icon,
  label,
}: {
  icon?: LucideIcon;
  label: string;
}) {
  return (
    <Badge variant="outline" className="max-w-full rounded-full bg-background/70 px-3 py-1 text-xs font-normal text-muted-foreground">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
        <span className="truncate">{label}</span>
      </span>
    </Badge>
  );
}

export function InsightsEmptyPanel({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-muted/20 px-4 py-5 text-sm text-muted-foreground", className)}>
      {message}
    </div>
  );
}

export function InsightsEmptyState({
  icon: Icon,
  title,
  message,
  className,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-lg border shadow-lg", className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-10 text-center sm:px-8">
        <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-3 max-w-[56ch] text-sm leading-6 text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
