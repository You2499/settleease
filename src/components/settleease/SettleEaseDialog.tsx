"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SettleEaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  hideCloseButton?: boolean;
}

export default function SettleEaseDialog({
  open,
  onOpenChange,
  children,
  className,
  hideCloseButton = false,
}: SettleEaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton={hideCloseButton}
        className={cn(
          "max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl overflow-hidden rounded-[1.5rem] border-border/70 bg-background p-0 shadow-[rgba(0,0,0,0.075)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.06)_0px_0px_0px_1px,rgba(78,50,23,0.06)_0px_24px_60px_-32px] sm:rounded-[1.75rem]",
          className
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
