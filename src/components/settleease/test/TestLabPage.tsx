"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Play,
    Download,
    RefreshCw,
    Calculator,
    Database,
    Brain,
    Monitor,
    Zap,
    FileJson,
    ChevronDown,
    ChevronRight,
    Copy,
    ExternalLink,
} from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    calculateNetBalances,
    calculateSimplifiedTransactions,
    calculatePairwiseTransactions,
} from "@/lib/settleease/settlementCalculations";
import type {
    Person,
    Expense,
    SettlementPayment,
    ManualSettlementOverride,
} from "@/lib/settleease/types";
import {
    allScenarios,
    testPeople,
    testPeopleMap,
    verifyScenario,
    type TestVerificationResult,
} from "./testScenarios";

interface TestLabPageProps {
    // If real data is provided, use it. Otherwise use test scenarios.
    realPeople?: Person[];
    realExpenses?: Expense[];
    realSettlements?: SettlementPayment[];
    realOverrides?: ManualSettlementOverride[];
    realPeopleMap?: Record<string, string>;
}

interface ScenarioTestResult extends TestVerificationResult {
    executionTimeMs: number;
    timestamp: string;
}

export default function TestLabPage({
    realPeople,
    realExpenses,
    realSettlements,
    realOverrides,
    realPeopleMap,
}: TestLabPageProps) {
    const [activeTab, setActiveTab] = useState("scenarios");
    const [isRunning, setIsRunning] = useState(false);
    const [scenarioResults, setScenarioResults] = useState<ScenarioTestResult[]>([]);
    const [realDataResults, setRealDataResults] = useState<any>(null);
    const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

    const hasRealData = realPeople && realPeople.length > 0 && realExpenses && realExpenses.length > 0;

    // Run all scenario tests
    const runScenarioTests = useCallback(async () => {
        setIsRunning(true);
        const results: ScenarioTestResult[] = [];

        for (const scenario of allScenarios) {
            const startTime = performance.now();

            // Calculate actual results
            const actualBalances = calculateNetBalances(
                testPeople.filter(p =>
                    Object.keys(scenario.expected.balances).includes(p.id)
                ),
                scenario.expenses,
                scenario.settlements
            );

            const actualTransactions = calculateSimplifiedTransactions(
                testPeople.filter(p =>
                    Object.keys(scenario.expected.balances).includes(p.id)
                ),
                scenario.expenses,
                scenario.settlements,
                (scenario as any).manualOverrides
            );

            const endTime = performance.now();

            // Verify against expected
            const verification = verifyScenario(scenario, actualBalances, actualTransactions);

            results.push({
                ...verification,
                executionTimeMs: endTime - startTime,
                timestamp: new Date().toISOString(),
            });
        }

        setScenarioResults(results);
        setIsRunning(false);
    }, []);

    // Run real data tests
    const runRealDataTests = useCallback(async () => {
        if (!hasRealData || !realPeople || !realExpenses || !realSettlements) return;

        setIsRunning(true);
        const startTime = performance.now();

        // Calculate balances
        const balances = calculateNetBalances(realPeople, realExpenses, realSettlements);
        const simplifiedTxns = calculateSimplifiedTransactions(
            realPeople,
            realExpenses,
            realSettlements,
            realOverrides
        );
        const pairwiseTxns = calculatePairwiseTransactions(
            realPeople,
            realExpenses,
            realSettlements
        );

        // Run verification tests
        const tests: any[] = [];

        // Test 1: Balance Conservation
        const balanceSum = Object.values(balances).reduce((sum, b) => sum + (b as number), 0);
        tests.push({
            id: "conservation",
            name: "Balance Conservation",
            description: "Sum of all balances must equal zero",
            passed: Math.abs(balanceSum) < 0.01,
            expected: 0,
            actual: balanceSum,
            formula: "Σ(all balances) = 0",
        });

        // Test 2: Expense Integrity
        let expenseIntegrityPassed = true;
        const expenseErrors: string[] = [];

        for (const exp of realExpenses) {
            const totalPaid = exp.paid_by?.reduce((s, p) => s + Number(p.amount), 0) || 0;
            const totalShares = exp.shares?.reduce((s, p) => s + Number(p.amount), 0) || 0;
            const celebration = exp.celebration_contribution?.amount || 0;

            if (Math.abs(totalPaid - exp.total_amount) > 0.01) {
                expenseIntegrityPassed = false;
                expenseErrors.push(`${exp.description}: paid ${totalPaid} ≠ total ${exp.total_amount}`);
            }
            if (Math.abs(totalShares + celebration - exp.total_amount) > 0.01) {
                expenseIntegrityPassed = false;
                expenseErrors.push(`${exp.description}: shares+celebration ${totalShares + celebration} ≠ total ${exp.total_amount}`);
            }
        }

        tests.push({
            id: "expense-integrity",
            name: "Expense Data Integrity",
            description: "paid_by amounts must match total, shares+celebration must match total",
            passed: expenseIntegrityPassed,
            errors: expenseErrors,
        });

        // Test 3: Transactions fully settle balances
        const settledBalances = { ...balances };
        simplifiedTxns.forEach(t => {
            settledBalances[t.from] = (settledBalances[t.from] || 0) + t.amount;
            settledBalances[t.to] = (settledBalances[t.to] || 0) - t.amount;
        });

        const allSettled = Object.values(settledBalances).every(b => Math.abs(b as number) < 0.02);
        tests.push({
            id: "transactions-settle",
            name: "Transactions Fully Settle Balances",
            description: "Applying all simplified transactions should result in zero balances",
            passed: allSettled,
            beforeBalances: balances,
            afterBalances: settledBalances,
        });

        // Test 4: Transaction count is minimal
        const maxTransactions = realPeople.length - 1;
        tests.push({
            id: "transaction-minimization",
            name: "Transaction Minimization",
            description: `Simplified transactions should be ≤ ${maxTransactions} (n-1 where n = people)`,
            passed: simplifiedTxns.length <= maxTransactions,
            expected: `≤ ${maxTransactions}`,
            actual: simplifiedTxns.length,
        });

        // Test 5: Determinism
        const balances2 = calculateNetBalances(realPeople, realExpenses, realSettlements);
        const balances3 = calculateNetBalances(realPeople, realExpenses, realSettlements);
        const isDeterministic = JSON.stringify(balances) === JSON.stringify(balances2) &&
            JSON.stringify(balances2) === JSON.stringify(balances3);
        tests.push({
            id: "determinism",
            name: "Calculation Determinism",
            description: "Same inputs must always produce same outputs",
            passed: isDeterministic,
        });

        // Test 6: exclude_from_settlement respected
        const excludedExpenses = realExpenses.filter(e => e.exclude_from_settlement);
        const activeExpenses = realExpenses.filter(e => !e.exclude_from_settlement);
        const balancesActive = calculateNetBalances(realPeople, activeExpenses, realSettlements);
        const excludedRespected = JSON.stringify(balances) === JSON.stringify(balancesActive) ||
            excludedExpenses.length === 0;
        tests.push({
            id: "exclude-flag",
            name: "Exclude From Settlement Flag",
            description: "Excluded expenses must not affect balances",
            passed: excludedRespected,
            excludedCount: excludedExpenses.length,
            activeCount: activeExpenses.length,
        });

        const endTime = performance.now();

        setRealDataResults({
            tests,
            summary: {
                total: tests.length,
                passed: tests.filter(t => t.passed).length,
                failed: tests.filter(t => !t.passed).length,
                executionTimeMs: endTime - startTime,
                timestamp: new Date().toISOString(),
            },
            data: {
                peopleCount: realPeople.length,
                expenseCount: realExpenses.length,
                settlementCount: realSettlements?.length || 0,
                overrideCount: realOverrides?.length || 0,
                balances,
                simplifiedTransactions: simplifiedTxns,
                pairwiseTransactions: pairwiseTxns,
            },
        });

        setIsRunning(false);
    }, [hasRealData, realPeople, realExpenses, realSettlements, realOverrides]);

    // Toggle scenario expansion
    const toggleScenario = (name: string) => {
        setExpandedScenarios(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    // Export results as JSON
    const exportResults = useCallback(() => {
        const data = {
            timestamp: new Date().toISOString(),
            scenarioResults,
            realDataResults,
            version: "1.0.0",
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `settleease-test-results-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [scenarioResults, realDataResults]);

    // Calculate summary stats
    const scenarioStats = useMemo(() => {
        if (scenarioResults.length === 0) return null;
        return {
            total: scenarioResults.length,
            passed: scenarioResults.filter(r => r.passed).length,
            failed: scenarioResults.filter(r => !r.passed).length,
        };
    }, [scenarioResults]);

    return (
        <div className="container max-w-6xl mx-auto py-6 px-4">
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Zap className="h-6 w-6 text-primary" />
                                Settlement Engine Test Lab
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Comprehensive verification suite to validate calculation accuracy
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportResults}
                                disabled={scenarioResults.length === 0 && !realDataResults}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-4">
                    <TabsTrigger value="scenarios" className="flex items-center gap-1">
                        <Calculator className="h-4 w-4" />
                        <span className="hidden sm:inline">Test Scenarios</span>
                        <span className="sm:hidden">Scenarios</span>
                    </TabsTrigger>
                    <TabsTrigger value="realdata" className="flex items-center gap-1" disabled={!hasRealData}>
                        <Database className="h-4 w-4" />
                        <span className="hidden sm:inline">Real Data</span>
                        <span className="sm:hidden">Real</span>
                    </TabsTrigger>
                    <TabsTrigger value="debug" className="flex items-center gap-1">
                        <Brain className="h-4 w-4" />
                        Debug
                    </TabsTrigger>
                    <TabsTrigger value="export" className="flex items-center gap-1">
                        <FileJson className="h-4 w-4" />
                        Export
                    </TabsTrigger>
                </TabsList>

                {/* SCENARIO TESTS TAB */}
                <TabsContent value="scenarios">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Pre-defined Test Scenarios</CardTitle>
                                    <CardDescription>
                                        Hand-calculated expected values to verify algorithm correctness
                                    </CardDescription>
                                </div>
                                <Button onClick={runScenarioTests} disabled={isRunning}>
                                    {isRunning ? (
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4 mr-1" />
                                    )}
                                    Run All Tests
                                </Button>
                            </div>

                            {scenarioStats && (
                                <div className="flex gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Total:</span>
                                        <Badge variant="outline">{scenarioStats.total}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            {scenarioStats.passed} Passed
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="h-4 w-4 text-red-500" />
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                            {scenarioStats.failed} Failed
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </CardHeader>

                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-3">
                                    {allScenarios.map((scenario, idx) => {
                                        const result = scenarioResults.find(r => r.scenarioName === scenario.name);
                                        const isExpanded = expandedScenarios.has(scenario.name);

                                        return (
                                            <Collapsible key={scenario.name} open={isExpanded}>
                                                <Card className={`border ${result
                                                        ? result.passed
                                                            ? "border-green-200 bg-green-50/50"
                                                            : "border-red-200 bg-red-50/50"
                                                        : ""
                                                    }`}>
                                                    <CollapsibleTrigger
                                                        className="w-full"
                                                        onClick={() => toggleScenario(scenario.name)}
                                                    >
                                                        <div className="flex items-center justify-between p-4">
                                                            <div className="flex items-center gap-3">
                                                                {isExpanded ? (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4" />
                                                                )}
                                                                <div className="text-left">
                                                                    <div className="font-medium flex items-center gap-2">
                                                                        Scenario {idx + 1}: {scenario.name}
                                                                        {result && (
                                                                            result.passed ? (
                                                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                            ) : (
                                                                                <XCircle className="h-4 w-4 text-red-600" />
                                                                            )
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {scenario.description}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {result && (
                                                                <Badge variant={result.passed ? "outline" : "destructive"}>
                                                                    {result.passed ? "PASS" : "FAIL"}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </CollapsibleTrigger>

                                                    <CollapsibleContent>
                                                        <Separator />
                                                        <div className="p-4 space-y-4">
                                                            {/* Expected formula */}
                                                            <div>
                                                                <h4 className="text-sm font-medium mb-2">Expected Calculation:</h4>
                                                                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                                                    {scenario.expected.formula}
                                                                </pre>
                                                            </div>

                                                            {/* Expected balances */}
                                                            <div>
                                                                <h4 className="text-sm font-medium mb-2">Expected Balances:</h4>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                    {Object.entries(scenario.expected.balances).map(([id, amount]) => (
                                                                        <div key={id} className="bg-muted p-2 rounded text-sm">
                                                                            <span className="font-medium">{testPeopleMap[id]}:</span>{" "}
                                                                            <span className={amount > 0 ? "text-green-600" : amount < 0 ? "text-red-600" : ""}>
                                                                                ${amount.toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Test result details */}
                                                            {result && (
                                                                <div>
                                                                    <h4 className="text-sm font-medium mb-2">Actual Results:</h4>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                                                        {Object.entries(result.details.balances.actual).map(([id, amount]) => {
                                                                            const expected = (scenario.expected.balances as Record<string, number>)[id];
                                                                            const matches = expected !== undefined && Math.abs(expected - amount) < 0.02;
                                                                            return (
                                                                                <div
                                                                                    key={id}
                                                                                    className={`p-2 rounded text-sm ${matches ? "bg-green-100" : "bg-red-100"
                                                                                        }`}
                                                                                >
                                                                                    <span className="font-medium">{testPeopleMap[id]}:</span>{" "}
                                                                                    <span>${(amount as number).toFixed(2)}</span>
                                                                                    {!matches && expected !== undefined && (
                                                                                        <span className="text-xs text-red-600 block">
                                                                                            (expected ${expected.toFixed(2)})
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {/* Differences */}
                                                                    {result.details.balances.differences.length > 0 && (
                                                                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                                                            <h5 className="text-sm font-medium text-red-700 mb-1">Differences Found:</h5>
                                                                            <ul className="text-sm text-red-600 list-disc list-inside">
                                                                                {result.details.balances.differences.map((diff, i) => (
                                                                                    <li key={i}>{diff}</li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}

                                                                    {/* Conservation check */}
                                                                    <div className={`mt-2 p-2 rounded text-sm ${result.details.conservationCheck.passes
                                                                            ? "bg-green-100 text-green-700"
                                                                            : "bg-red-100 text-red-700"
                                                                        }`}>
                                                                        Conservation Check: Σ balances = ${result.details.conservationCheck.balanceSum.toFixed(4)}
                                                                        {result.details.conservationCheck.passes ? " ✓" : " ✗ (should be 0)"}
                                                                    </div>

                                                                    <div className="text-xs text-muted-foreground mt-2">
                                                                        Executed in {result.executionTimeMs.toFixed(2)}ms at {result.timestamp}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CollapsibleContent>
                                                </Card>
                                            </Collapsible>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* REAL DATA TAB */}
                <TabsContent value="realdata">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Real Data Verification</CardTitle>
                                    <CardDescription>
                                        Test against your actual expense data
                                    </CardDescription>
                                </div>
                                <Button onClick={runRealDataTests} disabled={isRunning || !hasRealData}>
                                    {isRunning ? (
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4 mr-1" />
                                    )}
                                    Run Tests
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {!hasRealData ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No real data available.</p>
                                    <p className="text-sm">Sign in to test against your actual expense data.</p>
                                </div>
                            ) : realDataResults ? (
                                <div className="space-y-4">
                                    {/* Summary */}
                                    <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">Tests:</span>
                                            <Badge variant="outline">{realDataResults.summary.total}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                                {realDataResults.summary.passed}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <XCircle className="h-4 w-4 text-red-500" />
                                            <Badge variant="outline" className="bg-red-50 text-red-700">
                                                {realDataResults.summary.failed}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground ml-auto">
                                            {realDataResults.summary.executionTimeMs.toFixed(0)}ms
                                        </div>
                                    </div>

                                    {/* Data summary */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-muted/50 p-3 rounded-lg text-center">
                                            <div className="text-2xl font-bold">{realDataResults.data.peopleCount}</div>
                                            <div className="text-xs text-muted-foreground">People</div>
                                        </div>
                                        <div className="bg-muted/50 p-3 rounded-lg text-center">
                                            <div className="text-2xl font-bold">{realDataResults.data.expenseCount}</div>
                                            <div className="text-xs text-muted-foreground">Expenses</div>
                                        </div>
                                        <div className="bg-muted/50 p-3 rounded-lg text-center">
                                            <div className="text-2xl font-bold">{realDataResults.data.settlementCount}</div>
                                            <div className="text-xs text-muted-foreground">Settlements</div>
                                        </div>
                                        <div className="bg-muted/50 p-3 rounded-lg text-center">
                                            <div className="text-2xl font-bold">{realDataResults.data.overrideCount}</div>
                                            <div className="text-xs text-muted-foreground">Overrides</div>
                                        </div>
                                    </div>

                                    {/* Test results */}
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-2">
                                            {realDataResults.tests.map((test: any) => (
                                                <Card key={test.id} className={`border ${test.passed
                                                        ? "border-green-200 bg-green-50/50"
                                                        : "border-red-200 bg-red-50/50"
                                                    }`}>
                                                    <div className="p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {test.passed ? (
                                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                                ) : (
                                                                    <XCircle className="h-5 w-5 text-red-600" />
                                                                )}
                                                                <span className="font-medium">{test.name}</span>
                                                            </div>
                                                            <Badge variant={test.passed ? "outline" : "destructive"}>
                                                                {test.passed ? "PASS" : "FAIL"}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-2">
                                                            {test.description}
                                                        </p>
                                                        {test.expected !== undefined && (
                                                            <div className="text-sm">
                                                                Expected: <code className="bg-muted px-1 rounded">{JSON.stringify(test.expected)}</code>
                                                                {" → "}
                                                                Actual: <code className={`px-1 rounded ${test.passed ? "bg-green-100" : "bg-red-100"
                                                                    }`}>{typeof test.actual === 'number' ? test.actual.toFixed(4) : JSON.stringify(test.actual)}</code>
                                                            </div>
                                                        )}
                                                        {test.errors && test.errors.length > 0 && (
                                                            <ul className="text-sm text-red-600 mt-2 list-disc list-inside">
                                                                {test.errors.slice(0, 5).map((err: string, i: number) => (
                                                                    <li key={i}>{err}</li>
                                                                ))}
                                                                {test.errors.length > 5 && (
                                                                    <li>... and {test.errors.length - 5} more</li>
                                                                )}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>

                                    {/* Balances display */}
                                    <div>
                                        <h4 className="font-medium mb-2">Calculated Balances:</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {Object.entries(realDataResults.data.balances).map(([id, amount]) => (
                                                <div key={id} className="bg-muted p-2 rounded text-sm">
                                                    <span className="font-medium">{realPeopleMap?.[id] || id}:</span>{" "}
                                                    <span className={(amount as number) > 0 ? "text-green-600" : (amount as number) < 0 ? "text-red-600" : ""}>
                                                        ${(amount as number).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>Click "Run Tests" to verify your data</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DEBUG TAB */}
                <TabsContent value="debug">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Debug Information</CardTitle>
                            <CardDescription>
                                Raw calculation outputs for debugging
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Test Scenarios Available:</h4>
                                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-40">
                                        {JSON.stringify(allScenarios.map(s => s.name), null, 2)}
                                    </pre>
                                </div>

                                {scenarioResults.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2">Latest Scenario Results:</h4>
                                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-60">
                                            {JSON.stringify(scenarioResults, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {realDataResults && (
                                    <div>
                                        <h4 className="font-medium mb-2">Real Data Results:</h4>
                                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-60">
                                            {JSON.stringify(realDataResults, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EXPORT TAB */}
                <TabsContent value="export">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Export Test Results</CardTitle>
                            <CardDescription>
                                Download verification proof as JSON or copy to clipboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Button onClick={exportResults} className="w-full" disabled={scenarioResults.length === 0 && !realDataResults}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Full Report (JSON)
                                </Button>

                                <div className="text-center text-sm text-muted-foreground">
                                    {scenarioResults.length > 0 || realDataResults
                                        ? `Report contains ${scenarioResults.length} scenario results ${realDataResults ? 'and real data tests' : ''}`
                                        : "Run tests first to generate a report"}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
