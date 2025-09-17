"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  Sparkles, 
  MousePointer,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useFeatureInteractions } from '@/hooks/useFeatureInteractions';

export default function FeatureIndicatorHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const { clearAllIndicators } = useFeatureInteractions();

  const handleClearAll = () => {
    clearAllIndicators();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4 mr-1" />
          Feature Indicators
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Feature Indicators Guide
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="relative mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Green Dot</p>
                <p className="text-xs text-muted-foreground">
                  New feature available! This appears when a feature is newly enabled for you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Eye className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Notification Modal</p>
                <p className="text-xs text-muted-foreground">
                  Detailed explanation of feature changes. Appears automatically when features are updated.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <MousePointer className="h-4 w-4 text-purple-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Click to Dismiss</p>
                <p className="text-xs text-muted-foreground">
                  Indicators disappear after you click on the feature and acknowledge the notification.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Indicators help you discover new features and stay updated with changes.
            </p>
            
            <Button 
              onClick={handleClearAll}
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Clear All Indicators
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}