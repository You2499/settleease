import React from 'react';

// Global crash test state management
type CrashTestState = {
  analytics: boolean;
  dashboard: boolean;
  addExpense: boolean;
  managePeople: boolean;
  manageCategories: boolean;
  manageSettlements: boolean;
  editExpenses: boolean;
};

class CrashTestManager {
  private state: CrashTestState = {
    analytics: false,
    dashboard: false,
    addExpense: false,
    managePeople: false,
    manageCategories: false,
    manageSettlements: false,
    editExpenses: false,
  };

  private listeners: Set<() => void> = new Set();

  // Set crash state for a component
  setCrashState(component: keyof CrashTestState, shouldCrash: boolean) {
    this.state[component] = shouldCrash;
    this.notifyListeners();
  }

  // Get crash state for a component
  getCrashState(component: keyof CrashTestState): boolean {
    return this.state[component];
  }

  // Reset all crash states
  resetAll() {
    Object.keys(this.state).forEach(key => {
      this.state[key as keyof CrashTestState] = false;
    });
    this.notifyListeners();
  }

  // Get all crash states
  getAllStates(): CrashTestState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // Check if component should crash and throw error
  checkAndCrash(component: keyof CrashTestState, errorMessage: string) {
    if (this.state[component]) {
      throw new Error(`[CRASH TEST] ${errorMessage}`);
    }
  }
}

// Global instance
export const crashTestManager = new CrashTestManager();

// Hook for React components to use crash test state
export function useCrashTest() {
  const [, forceUpdate] = React.useState({});
  
  React.useEffect(() => {
    const unsubscribe = crashTestManager.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  return {
    setCrashState: crashTestManager.setCrashState.bind(crashTestManager),
    getCrashState: crashTestManager.getCrashState.bind(crashTestManager),
    resetAll: crashTestManager.resetAll.bind(crashTestManager),
    getAllStates: crashTestManager.getAllStates.bind(crashTestManager),
    checkAndCrash: crashTestManager.checkAndCrash.bind(crashTestManager),
  };
}