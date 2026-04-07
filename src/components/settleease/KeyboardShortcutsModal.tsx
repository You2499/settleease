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

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardShortcutsModal({ isOpen, onOpenChange }: KeyboardShortcutsModalProps) {
  const shortcuts = [
    { keys: ['⌘', 'E'], description: 'Add new expense (Admin only)', mac: true },
    { keys: ['Ctrl', 'E'], description: 'Add new expense (Admin only)', mac: false },
    { keys: ['⌘', 'F'], description: 'Focus search in dashboard', mac: true },
    { keys: ['Ctrl', 'F'], description: 'Focus search in dashboard', mac: false },
    { keys: ['?'], description: 'Show this shortcuts menu', mac: null },
  ];

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const relevantShortcuts = shortcuts.filter(s => s.mac === null || s.mac === isMac);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-display-card">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-body-standard">
            Speed up your workflow with these shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {relevantShortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-body-standard text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={i}>
                    <kbd className="px-2 py-1 text-small font-medium bg-muted text-muted-foreground rounded border border-border shadow-sm">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && <span className="text-muted-foreground">+</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
