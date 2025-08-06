"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Info, 
  Calculator, 
  CheckCircle2, 
  Users 
} from "lucide-react";

export default function TrustSection() {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold text-blue-900 dark:text-blue-100">
          <Info className="mr-2 h-5 w-5" />
          Why Trust This System?
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
              <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Simple Math
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Every balance is calculated with basic addition and
                subtraction. No complex algorithms - just what you paid
                minus what you owe.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Same End Result
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Whether you choose direct or optimized payments,
                everyone ends up with the exact same final balance. The
                math always works out.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Transparent Process
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                You can verify every calculation yourself. Check the
                "Per Person" tab to see exactly how each person's
                balance is calculated.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}