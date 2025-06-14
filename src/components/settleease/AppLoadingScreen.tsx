
"use client";

import React from 'react';
import { HandCoins } from 'lucide-react';

interface AppLoadingScreenProps {
  title: string;
  subtitle: string;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
      <HandCoins className="h-16 w-16 text-primary animate-spin mb-6" />
      <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">{title}</h2>
      <p className="text-muted-foreground text-center max-w-sm">{subtitle}</p>
    </div>
  );
};

export default AppLoadingScreen;
