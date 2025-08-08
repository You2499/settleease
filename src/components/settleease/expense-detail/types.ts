import type {
  Expense,
  ExpenseItemDetail,
  PayerShare,
  CelebrationContribution,
  PersonItemShareDetails,
  PersonAggregatedItemShares,
  Category,
} from "@/lib/settleease/types";

export interface ExpenseDetailProps {
  expense: Expense;
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (
    categoryName: string
  ) => React.FC<React.SVGProps<SVGSVGElement>>;
  categories: Category[];
  expandedSections: Set<string>;
  toggleSectionExpansion: (sectionId: string) => void;
}

export interface ExpenseCalculations {
  totalOriginalBill: number;
  celebrationContributionOpt: CelebrationContribution | null | undefined;
  celebrationAmount: number;
  amountEffectivelySplit: number;
  involvedPersonIdsOverall: string[];
  sortedInvolvedPersonIdsOverall: string[];
  sortedPaidBy: PayerShare[];
  sortedShares: any[];
  itemwiseBreakdownForDisplay: PersonAggregatedItemShares | null;
  sortedItemwiseBreakdownEntries: [string, any][];
  sortPersonIdsByName: (ids: string[]) => string[];
  getItemCategoryIcon: (categoryName?: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  getCategoryRank: (catName?: string) => number;
}