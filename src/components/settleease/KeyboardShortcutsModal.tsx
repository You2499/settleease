"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from 'lucide-react';
import {
  SETTLEEASE_SHORTCUTS,
  formatShortcut,
  isMacPlatform,
  type ShortcutDefinition,
  type ShortcutGroup,
} from '@/lib/settleease/shortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardShortcutsModal({ isOpen, onOpenChange }: KeyboardShortcutsModalProps) {
  const isMac = isMacPlatform();
  const groupedShortcuts = React.useMemo(() => {
    const merged = SETTLEEASE_SHORTCUTS.reduce((acc, shortcut) => {
      const existing = acc.get(shortcut.id);
      if (existing) {
        existing.keys.push(formatShortcut(shortcut, isMac));
        return acc;
      }

      acc.set(shortcut.id, {
        shortcut,
        keys: [formatShortcut(shortcut, isMac)],
      });
      return acc;
    }, new Map<string, { shortcut: ShortcutDefinition; keys: string[][] }>());

    return {
      navigation: Array.from(merged.values()).filter((item) => item.shortcut.group === "navigation"),
      actions: Array.from(merged.values()).filter((item) => item.shortcut.group === "actions"),
      focus: Array.from(merged.values()).filter((item) => item.shortcut.group === "focus"),
    } satisfies Record<ShortcutGroup, Array<{ shortcut: ShortcutDefinition; keys: string[][] }>>;
  }, [isMac]);

  const sectionLabels: Record<ShortcutGroup, string> = {
    navigation: "Navigation",
    actions: "Actions",
    focus: "Focus",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-display-card">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-body-standard">
            Speed up your workflow with these shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-5 overflow-y-auto py-4 pr-1">
          {(["navigation", "actions", "focus"] as ShortcutGroup[]).map((group) => (
            <section key={group} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {sectionLabels[group]}
              </h3>
              <div className="overflow-hidden rounded-lg border border-border">
                {groupedShortcuts[group].map(({ shortcut, keys }) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between gap-4 border-b border-border px-3 py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{shortcut.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {shortcut.description}
                        {shortcut.adminOnly ? " (Admin only)" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {keys.map((keySet, shortcutIndex) => (
                        <div key={`${shortcut.id}-${shortcutIndex}`} className="flex items-center gap-1">
                          {keySet.map((key, keyIndex) => (
                            <React.Fragment key={`${key}-${keyIndex}`}>
                              {keyIndex > 0 ? <span className="text-xs text-muted-foreground">+</span> : null}
                              <kbd className="rounded border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
