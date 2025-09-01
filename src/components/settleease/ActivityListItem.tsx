import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from '@/lib/settleease/utils';
import { 
  Activity, 
  Users, 
  Clock,
  Plus,
  Edit,
  Trash2,
  Handshake,
  UserPlus,
  Tag,
  TrendingUp
} from 'lucide-react';

interface ActivityFeedItem {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  metadata: any;
  affected_people: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  affected_people_names: string[];
  created_by_name: string;
  relative_time: string;
  activity_category: string;
}

interface ActivityListItemProps {
  activity: ActivityFeedItem;
  onClick?: (activity: ActivityFeedItem) => void;
  actions?: React.ReactNode;
}

const ACTIVITY_TYPE_ICONS = {
  expense_added: Plus,
  expense_updated: Edit,
  expense_deleted: Trash2,
  settlement_recorded: Handshake,
  settlement_removed: Trash2,
  person_added: UserPlus,
  person_updated: Edit,
  person_deleted: Trash2,
  category_added: Tag,
  category_updated: Edit,
  category_deleted: Trash2,
  balance_changes: TrendingUp,
};

const ACTIVITY_TYPE_COLORS = {
  expense_added: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  expense_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  expense_deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  settlement_recorded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  settlement_removed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  person_added: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  person_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  person_deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  category_added: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  category_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  category_deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  balance_changes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export default function ActivityListItem({
  activity,
  onClick,
  actions,
}: ActivityListItemProps) {
  const ActivityIcon = ACTIVITY_TYPE_ICONS[activity.activity_type as keyof typeof ACTIVITY_TYPE_ICONS] || Activity;
  
  const getAmountDisplay = () => {
    if (activity.metadata?.total_amount) {
      return formatCurrency(activity.metadata.total_amount);
    }
    if (activity.metadata?.amount_settled) {
      return formatCurrency(activity.metadata.amount_settled);
    }
    return null;
  };

  const amountDisplay = getAmountDisplay();

  return (
    <li onClick={() => onClick?.(activity)} className={onClick ? 'cursor-pointer' : ''}>
      <Card className="bg-card/70 hover:bg-card/90 transition-all rounded-md">
        <CardHeader className="pb-1.5 pt-2.5 px-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <CardTitle className="flex items-center text-xl sm:text-2xl font-bold" title={activity.title}>
              <ActivityIcon className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
              {activity.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              {amountDisplay && (
                <span className="text-sm sm:text-md font-bold text-primary">
                  {amountDisplay}
                </span>
              )}
              <Badge 
                variant="secondary" 
                className={`text-xs ${ACTIVITY_TYPE_COLORS[activity.activity_type as keyof typeof ACTIVITY_TYPE_COLORS] || 'bg-gray-100 text-gray-800'}`}
              >
                {activity.activity_type.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-2 text-xs text-muted-foreground space-y-0.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center">
              <span>{activity.description}</span>
            </div>
            <div className="flex items-center mt-0.5 sm:mt-0">
              <Clock className="mr-1 h-3 w-3" />
              <span>{activity.relative_time}</span>
            </div>
          </div>
          
          {activity.affected_people_names.length > 0 && (
            <div className="flex items-center">
              <Users className="mr-1 h-3 w-3" />
              <span>Affected: <span className="font-medium">{activity.affected_people_names.join(', ')}</span></span>
            </div>
          )}

          {activity.activity_type === 'expense_updated' && activity.metadata?.changes && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
              <div className="font-medium mb-1">Changes made:</div>
              {activity.metadata.changes.slice(0, 3).map((change: any, index: number) => (
                <div key={index} className="ml-2">
                  • {change.field}: {change.display_old || change.old_value} → {change.display_new || change.new_value}
                </div>
              ))}
              {activity.metadata.changes.length > 3 && (
                <div className="ml-2 text-muted-foreground">
                  ... and {activity.metadata.changes.length - 3} more changes
                </div>
              )}
            </div>
          )}

          {activity.activity_type === 'balance_changes' && activity.metadata?.balance_changes && (
            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 rounded text-xs border border-orange-200 dark:border-orange-800">
              <div className="font-medium mb-2 text-orange-800 dark:text-orange-200">
                Balance Changes ({activity.metadata.change_count} {activity.metadata.change_count === 1 ? 'person' : 'people'} affected):
              </div>
              <div className="space-y-1">
                {activity.metadata.balance_changes.map((change: any, index: number) => (
                  <div key={index} className="flex items-center justify-between ml-2">
                    <span className="font-medium text-foreground">{change.person_name}:</span>
                    <span className={`font-semibold ${
                      change.net_change > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {change.display_change}
                    </span>
                  </div>
                ))}
              </div>
              {activity.metadata.expense_description && (
                <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-800 text-muted-foreground">
                  Related to: {activity.metadata.expense_description} ({formatCurrency(activity.metadata.expense_amount)})
                </div>
              )}
            </div>
          )}

          {actions && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:justify-end sm:space-x-2.5 pt-2">
              {actions}
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  );
}