"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { TestResult } from "./types";

interface TestResultsProps {
  testResults: TestResult[];
  showDebugMode: boolean;
}

export default function TestResults({
  testResults,
  showDebugMode,
}: TestResultsProps) {
  const getStatusIcon = (status: "pass" | "fail" | "warning") => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: "pass" | "fail" | "warning") => {
    const variants = {
      pass: "bg-green-100 text-green-800 border-green-200",
      fail: "bg-red-100 text-red-800 border-red-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };

    return (
      <Badge className={`${variants[status]} border`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (testResults.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="h-[600px] border rounded-lg">
      <div className="p-4 space-y-4">
        {testResults.map((result) => (
          <Card key={result.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(result.status)}
                <div>
                  <h4 className="font-semibold">{result.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {result.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {result.executionTime && (
                  <span className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{result.executionTime}ms</span>
                  </span>
                )}
                {getStatusBadge(result.status)}
              </div>
            </div>

            {result.details.length > 0 && (
              <div className="mt-3 p-3 bg-muted/50 rounded-md">
                <div className="space-y-1">
                  {result.details.map((detail, index) => (
                    <p key={index} className="text-sm font-mono">
                      {detail}
                    </p>
                  ))}
                </div>

                {/* Show debug info in debug mode */}
                {showDebugMode && result.debugInfo && (
                  <div className="mt-3 pt-3 border-t border-muted">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      DEBUG INFO:
                    </div>
                    {result.debugInfo.errorDetails && (
                      <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                        <strong>Error:</strong> {result.debugInfo.errorDetails}
                      </div>
                    )}
                    {result.debugInfo.inputData && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          Input Data
                        </summary>
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.debugInfo.inputData, null, 2)}
                        </pre>
                      </details>
                    )}
                    {result.debugInfo.calculationSteps && (
                      <details className="text-xs mt-2">
                        <summary className="cursor-pointer text-muted-foreground">
                          Calculation Steps
                        </summary>
                        <div className="mt-1 space-y-1">
                          {result.debugInfo.calculationSteps.map((step, i) => (
                            <div key={i} className="text-xs font-mono">
                              {i + 1}. {JSON.stringify(step)}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}