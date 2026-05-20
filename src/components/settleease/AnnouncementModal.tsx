"use client";

import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { Announcement } from '@/lib/settleease';
import SettleEaseDialog, {
  SettleEaseModalHeader,
  SettleEaseModalBody,
  SettleEaseModalFooter,
} from './SettleEaseDialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface AnnouncementModalProps {
  announcement: Announcement;
  isOpen: boolean;
  onDismiss: () => void;
}

export default function AnnouncementModal({ announcement, isOpen, onDismiss }: AnnouncementModalProps) {
  // Resolve Lucide Icon dynamically
  const IconComponent = (LucideIcons as any)[announcement.icon_name] || LucideIcons.Megaphone;

  return (
    <SettleEaseDialog 
      open={isOpen} 
      onOpenChange={(open) => !open && onDismiss()} 
      className="sm:max-w-lg"
    >
      <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
        <SettleEaseModalHeader
          title={announcement.title}
          description="Global System Update"
          icon={IconComponent}
          tone={announcement.tone}
        />
        <SettleEaseModalBody className="space-y-4 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
          {announcement.description}
        </SettleEaseModalBody>
        <SettleEaseModalFooter className="sm:justify-end">
          <Button
            onClick={onDismiss}
            className="h-10 rounded-full px-5 bg-primary hover:bg-primary/95 text-white font-medium shadow-sm transition gap-1.5 w-full sm:w-auto"
          >
            <Check className="h-4 w-4 shrink-0" />
            Acknowledge & Dismiss
          </Button>
        </SettleEaseModalFooter>
      </div>
    </SettleEaseDialog>
  );
}
