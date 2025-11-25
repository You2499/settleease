"use client";

import React, { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Database,
  Sparkles,
  Calculator,
  RefreshCw,
  CircleCheck,
  CircleX,
  CircleAlert,
  Clock,
  Zap,
  TriangleAlert,
} from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Person, Expense, SettlementPayment } from '@/lib/settleease/types';

interface StatusTabProps {
  db?: SupabaseClient;
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingSettlements?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  message: string;
  responseTime?: number;
  lastChecked?: Date;
  icon: React.ElementType;
}

export default function StatusTab({
  db,
  people,
  expenses,
  settlementPayments,
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingSettlements = false,
  isDataFetchedAtLeastOnce = true,
}: StatusTabProps) {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Database Connection',
      status: 'checking',
      message: 'Checking connection...',
      icon: Database,
    },
    {
      name: 'AI Summarization API',
      status: 'checking',
      message: 'Checking API health...',
      icon: Sparkles,
    },
    {
      name: 'Settlement Calculations',
      status: 'checking',
      message: 'Verifying algorithms...',
      icon: Calculator,
    },
    {
      name: 'Data Sync',
      status: 'checking',
      message: 'Checking sync status...',
      icon: RefreshCw,
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Check service health
  const checkServiceHealth = async () => {
    setIsRefreshing(true);
    const newServices: ServiceStatus[] = [];

    // 1. Database Connection
    const dbStart = Date.now();
    try {
      if (db) {
        const { error } = await db.from('people').select('id').limit(1);
        const dbTime = Date.now() - dbStart;
        
        newServices.push({
          name: 'Database Connection',
          status: error ? 'down' : 'operational',
          message: error ? `Connection failed: ${error.message}` : 'Connected and responsive',
          responseTime: dbTime,
          lastChecked: new Date(),
          icon: Database,
        });
      } else {
        newServices.push({
          name: 'Database Connection',
          status: 'down',
          message: 'Database client not initialized',
          lastChecked: new Date(),
          icon: Database,
        });
      }
    } catch (error) {
      newServices.push({
        name: 'Database Connection',
        status: 'down',
        message: `Error: ${String(error)}`,
        lastChecked: new Date(),
        icon: Database,
      });
    }

    // 2. AI Summarization API
    const aiStart = Date.now();
    try {
      const response = await fetch('/api/summarize/health');
      const aiTime = Date.now() - aiStart;
      const data = await response.json();
      
      const allHealthy = data.checks?.geminiApiKey && 
                        data.checks?.supabaseUrl && 
                        data.checks?.supabaseServiceKey &&
                        data.checks?.promptFetch;

      newServices.push({
        name: 'AI Summarization API',
        status: allHealthy ? 'operational' : 'degraded',
        message: allHealthy 
          ? `All systems operational (v${data.checks?.promptVersion || 'unknown'})` 
          : 'Some components unavailable',
        responseTime: aiTime,
        lastChecked: new Date(),
        icon: Sparkles,
      });
    } catch (error) {
      newServices.push({
        name: 'AI Summarization API',
        status: 'down',
        message: 'API unreachable',
        lastChecked: new Date(),
        icon: Sparkles,
      });
    }

    // 3. Settlement Calculations
    try {
      // Quick validation of calculation integrity
      const balances: Record<string, number> = {};
      people.forEach(p => balances[p.id] = 0);
      
      expenses.forEach(expense => {
        if (expense.exclude_from_settlement) return;
        
        expense.paid_by?.forEach(payment => {
          balances[payment.personId] = (balances[payment.personId] || 0) + Number(payment.amount);
        });
        
        expense.shares?.forEach(share => {
          balances[share.personId] = (balances[share.personId] || 0) - Number(share.amount);
        });
      });

      settlementPayments.forEach(settlement => {
        balances[settlement.debtor_id] = (balances[settlement.debtor_id] || 0) + Number(settlement.amount_settled);
        balances[settlement.creditor_id] = (balances[settlement.creditor_id] || 0) - Number(settlement.amount_settled);
      });

      const balanceSum = Object.values(balances).reduce((sum, b) => sum + b, 0);
      const isBalanced = Math.abs(balanceSum) < 0.01;

      newServices.push({
        name: 'Settlement Calculations',
        status: isBalanced ? 'operational' : 'degraded',
        message: isBalanced 
          ? 'All calculations balanced' 
          : `Balance discrepancy detected: ${formatCurrency(balanceSum)}`,
        lastChecked: new Date(),
        icon: Calculator,
      });
    } catch (error) {
      newServices.push({
        name: 'Settlement Calculations',
        status: 'down',
        message: `Calculation error: ${String(error)}`,
        lastChecked: new Date(),
        icon: Calculator,
      });
    }

    // 4. Data Sync
    const syncStatus = isLoadingPeople || isLoadingExpenses || isLoadingSettlements;
    newServices.push({
      name: 'Data Sync',
      status: syncStatus ? 'checking' : 'operational',
      message: syncStatus ? 'Syncing data...' : 'All data synchronized',
      lastChecked: new Date(),
      icon: RefreshCw,
    });

    setServices(newServices);
    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // Initial check
  useEffect(() => {
    if (isDataFetchedAtLeastOnce && db) {
      checkServiceHealth();
    }
  }, [isDataFetchedAtLeastOnce, db]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing && isDataFetchedAtLeastOnce && db) {
        checkServiceHealth();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isRefreshing, isDataFetchedAtLeastOnce, db]);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      case 'checking':
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CircleCheck className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <CircleAlert className="h-5 w-5 text-yellow-600" />;
      case 'down':
        return <CircleX className="h-5 w-5 text-red-600" />;
      case 'checking':
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Degraded</Badge>;
      case 'down':
        return <Badge variant="destructive">Down</Badge>;
      case 'checking':
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const overallStatus = services.every(s => s.status === 'operational') 
    ? 'operational' 
    : services.some(s => s.status === 'down') 
    ? 'down' 
    : 'degraded';

  const isLoading = !isDataFetchedAtLeastOnce || isLoadingPeople || isLoadingExpenses || isLoadingSettlements;

  if (isLoading) {
    return (
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-7 sm:h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-full sm:w-96" />
            </div>
            <Skeleton className="h-9 w-full sm:w-32" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 sm:p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl rounded-lg h-full flex flex-col">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
              <Activity className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              System Status
            </CardTitle>
            <CardDescription className="mt-2">
              Real-time health monitoring of all SettleEase services
            </CardDescription>
          </div>
          <Button
            onClick={checkServiceHealth}
            disabled={isRefreshing}
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Overall Status Banner */}
        <Card className={`border-2 ${
          overallStatus === 'operational' 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : overallStatus === 'down'
            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
            : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
        }`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`p-3 rounded-full ${
                overallStatus === 'operational' 
                  ? 'bg-green-200 dark:bg-green-900' 
                  : overallStatus === 'down'
                  ? 'bg-red-200 dark:bg-red-900'
                  : 'bg-yellow-200 dark:bg-yellow-900'
              }`}>
                {overallStatus === 'operational' ? (
                  <CircleCheck className="h-8 w-8 text-green-700 dark:text-green-300" />
                ) : overallStatus === 'down' ? (
                  <CircleX className="h-8 w-8 text-red-700 dark:text-red-300" />
                ) : (
                  <TriangleAlert className="h-8 w-8 text-yellow-700 dark:text-yellow-300" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold mb-1">
                  {overallStatus === 'operational' 
                    ? 'All Systems Operational' 
                    : overallStatus === 'down'
                    ? 'Service Disruption Detected'
                    : 'Partial Service Degradation'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {overallStatus === 'operational' 
                    ? 'All services are running smoothly' 
                    : overallStatus === 'down'
                    ? 'One or more critical services are down'
                    : 'Some services are experiencing issues'}
                </p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last checked: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Status Cards */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Service Health
          </h3>
          
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.name} className="overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="p-3 bg-muted rounded-full">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${getStatusColor(service.status)}`} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-base sm:text-lg">{service.name}</h4>
                        {getStatusBadge(service.status)}
                      </div>
                      <p className="text-sm text-muted-foreground break-words">
                        {service.message}
                      </p>
                      {service.responseTime && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Response time: {service.responseTime}ms
                        </p>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0 self-start sm:self-center">
                      {getStatusIcon(service.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* System Metrics */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            System Metrics
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{people.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">People</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{expenses.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Expenses</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{settlementPayments.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Settlements</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">
                    {formatCurrency(expenses.reduce((sum, e) => sum + e.total_amount, 0))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Total Value</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
