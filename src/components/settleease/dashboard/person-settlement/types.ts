export interface PersonSummary {
  netBalance: number;
  totalPaid: number;
  totalOwed: number;
  totalSettledAsDebtor: number;
  totalSettledAsCreditor: number;
  isBalanced: boolean;
}