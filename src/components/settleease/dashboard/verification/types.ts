import type { Person, Expense, SettlementPayment } from "@/lib/settleease/types";

export interface TestResult {
  id: string;
  name: string;
  description: string;
  status: "pass" | "fail" | "warning";
  details: string[];
  executionTime?: number;
  data?: any;
  debugInfo?: {
    inputData?: any;
    calculationSteps?: any[];
    expectedOutput?: any;
    actualOutput?: any;
    errorDetails?: string;
  };
}

export interface DebugReport {
  timestamp: string;
  testResults: TestResult[];
  systemInfo: {
    totalPeople: number;
    totalExpenses: number;
    totalSettlements: number;
    totalValue: number;
    dataIntegrityScore: number;
  };
  liveData: {
    people: Person[];
    expenses: Expense[];
    settlementPayments: SettlementPayment[];
    calculatedBalances: Record<string, number>;
    simplifiedTransactions: any[];
    pairwiseTransactions: any[];
  };
  failureAnalysis?: {
    criticalFailures: string[];
    potentialCauses: string[];
    recommendedActions: string[];
  };
}

export interface AlgorithmVerificationProps {
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  peopleMap: Record<string, string>;
  // UI-displayed data for verification
  uiSimplifiedTransactions?: any[];
  uiPairwiseTransactions?: any[];
}