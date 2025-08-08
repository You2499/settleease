"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  DollarSign,
  Users,
  Receipt,
  Gift,
  Activity,
  FileText,
} from "lucide-react";

interface TestDetailRendererProps {
  detail: string;
}

export default function TestDetailRenderer({ detail }: TestDetailRendererProps) {
  const renderDetailWithIcon = (text: string) => {
    // Remove the prefix and get the actual content
    let content = text;
    let icon = null;
    let className = "text-gray-800 dark:text-gray-200";

    if (text.startsWith("PASS ")) {
      content = text.substring(5);
      icon = <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />;
      className = "text-green-800 dark:text-green-200";
    } else if (text.startsWith("FAIL ")) {
      content = text.substring(5);
      icon = <XCircle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />;
      className = "text-red-800 dark:text-red-200";
    } else if (text.startsWith("WARNING ")) {
      content = text.substring(8);
      icon = <AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0 mt-0.5" />;
      className = "text-yellow-800 dark:text-yellow-200";
    } else if (text.startsWith("CRITICAL: ")) {
      content = text.substring(10);
      icon = <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" />;
      className = "text-red-800 dark:text-red-200 font-semibold";
    } else if (text.startsWith("DETAIL ")) {
      content = text.substring(7);
      icon = <Info className="h-3 w-3 text-blue-600 flex-shrink-0 mt-0.5" />;
      className = "text-blue-800 dark:text-blue-200 font-medium";
    } else if (text.startsWith("NOTE ")) {
      content = text.substring(5);
      icon = <Info className="h-3 w-3 text-blue-600 flex-shrink-0 mt-0.5" />;
      className = "text-blue-800 dark:text-blue-200";
    } else if (text.startsWith("ITEM ")) {
      content = text.substring(5);
      icon = <Receipt className="h-3 w-3 text-purple-600 flex-shrink-0 mt-0.5" />;
      className = "text-purple-800 dark:text-purple-200";
    } else if (text.startsWith("CELEBRATION ")) {
      content = text.substring(12);
      icon = <Gift className="h-3 w-3 text-pink-600 flex-shrink-0 mt-0.5" />;
      className = "text-pink-800 dark:text-pink-200";
    } else if (text.startsWith("BALANCE ")) {
      content = text.substring(8);
      icon = <DollarSign className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />;
      className = "text-green-800 dark:text-green-200";
    } else if (text.includes("→")) {
      // Transaction format
      icon = <Activity className="h-3 w-3 text-blue-600 flex-shrink-0 mt-0.5" />;
      className = "text-blue-800 dark:text-blue-200";
    } else if (text.includes("People with") || text.includes("Individual balances")) {
      icon = <Users className="h-3 w-3 text-indigo-600 flex-shrink-0 mt-0.5" />;
      className = "text-indigo-800 dark:text-indigo-200";
    } else if (text.includes("Total balance") || text.includes("totaling") || text.includes("₹")) {
      icon = <DollarSign className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />;
      className = "text-green-800 dark:text-green-200";
    } else {
      // Default case
      icon = <FileText className="h-3 w-3 text-gray-600 flex-shrink-0 mt-0.5" />;
    }

    return (
      <div className="flex items-start gap-2">
        {icon}
        <span className={`${className} text-xs sm:text-sm font-mono break-words flex-1`}>
          {content}
        </span>
      </div>
    );
  };

  return renderDetailWithIcon(detail);
}