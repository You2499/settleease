"use client";

import type { ElementType, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface SettleEaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  hideCloseButton?: boolean;
  trigger?: ReactNode;
}

export default function SettleEaseDialog({
  open,
  onOpenChange,
  children,
  className,
  hideCloseButton = false,
  trigger,
}: SettleEaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent
        hideCloseButton={hideCloseButton}
        className={cn(
          "max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl overflow-hidden rounded-2xl border-border/70 bg-background p-0 shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.06)_0px_0px_0px_1px,rgba(78,50,23,0.05)_0px_16px_44px_-28px] sm:rounded-[1.25rem]",
          className
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface SettleEaseAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function SettleEaseAlertDialog({
  open,
  onOpenChange,
  children,
  className,
}: SettleEaseAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-hidden rounded-2xl border-border/70 bg-background p-0 shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.06)_0px_0px_0px_1px,rgba(78,50,23,0.05)_0px_16px_44px_-28px] sm:rounded-[1.25rem]",
          className
        )}
      >
        {children}
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface SettleEaseModalHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ElementType;
  accessory?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "brand";
  kind?: "dialog" | "alert";
  className?: string;
}

const toneClasses = {
  default: "bg-background/90 text-foreground",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  danger: "bg-destructive/10 text-destructive",
  brand: "bg-primary/10 text-primary",
};

export function SettleEaseModalHeader({
  title,
  description,
  icon: Icon,
  accessory,
  tone = "default",
  kind = "dialog",
  className,
}: SettleEaseModalHeaderProps) {
  const Header = kind === "alert" ? AlertDialogHeader : DialogHeader;
  const Title = kind === "alert" ? AlertDialogTitle : DialogTitle;
  const Description = kind === "alert" ? AlertDialogDescription : DialogDescription;

  return (
    <Header
      className={cn(
        "border-b bg-[#f7f6f3]/75 px-4 py-3 text-left dark:bg-muted/25 sm:px-5",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5 pr-9">
        {Icon ? (
          <div
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/70 shadow-sm",
              toneClasses[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
            <Title className="text-lg font-semibold leading-6 tracking-normal sm:text-xl">
              {title}
            </Title>
            {accessory ? <div className="shrink-0">{accessory}</div> : null}
          </div>
          {description ? (
            <Description className="mt-1 max-w-2xl text-sm leading-5">
              {description}
            </Description>
          ) : null}
        </div>
      </div>
    </Header>
  );
}

export function SettleEaseModalBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5", className)}>
      {children}
    </div>
  );
}

export function SettleEaseModalToolBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-5", className)}>
      {children}
    </div>
  );
}

export function SettleEaseModalFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t bg-background/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SettleEaseModalSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-background p-3 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function SettleEaseModalNotice({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "brand";
  className?: string;
}) {
  const noticeTone = {
    default: "border-border bg-muted/30 text-muted-foreground",
    success: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100",
    warning: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    brand: "border-primary/20 bg-primary/5 text-muted-foreground",
  };

  return (
    <div className={cn("rounded-xl border p-3 text-sm leading-5", noticeTone[tone], className)}>
      {children}
    </div>
  );
}
