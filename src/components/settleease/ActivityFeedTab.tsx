"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Activity,
    RefreshCw,
    AlertTriangle
} from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Person } from '@/lib/settleease/types';
import ActivityListItem from './ActivityListItem';

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

interface ActivityFeedTabProps {
    db: SupabaseClient | undefined;
    people: Person[];
    peopleMap: Record<string, string>;
    onViewExpenseDetails?: (expenseId: string) => void;
}

export default function ActivityFeedTab({
    db,
    people,
    peopleMap,
    onViewExpenseDetails
}: ActivityFeedTabProps) {
    const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedPerson, setSelectedPerson] = useState<string>('all');

    const fetchActivityFeed = async () => {
        if (!db) return;

        setIsLoading(true);
        try {
            const { data: activityData, error: activityError } = await db
                .from('activity_feed_with_details')
                .select('*')
                .limit(100)
                .order('created_at', { ascending: false });

            if (activityError) throw activityError;
            setActivities(activityData || []);
        } catch (error: any) {
            console.error('Error fetching activity feed:', error);
            toast({
                title: "Error",
                description: `Could not fetch activity feed: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActivityFeed();
    }, [db]);

    const filteredActivities = useMemo(() => {
        return activities.filter(activity => {
            const categoryMatch = selectedCategory === 'all' || activity.activity_category === selectedCategory;
            const personMatch = selectedPerson === 'all' || activity.affected_people.includes(selectedPerson);
            return categoryMatch && personMatch;
        });
    }, [activities, selectedCategory, selectedPerson]);

    const groupedActivities = filteredActivities.reduce((acc, activity) => {
        const date = new Date(activity.created_at).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(activity);
        return acc;
    }, {} as Record<string, ActivityFeedItem[]>);

    const activityDates = Object.keys(groupedActivities);

    const handleActivityClick = (activity: ActivityFeedItem) => {
        if (activity.activity_type.includes('expense') && activity.metadata?.expense_id && onViewExpenseDetails) {
            onViewExpenseDetails(activity.metadata.expense_id);
        }
    };

    if (!db) {
        return (
            <Card className="shadow-lg rounded-lg h-full flex flex-col">
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-destructive">
                        <AlertTriangle className="mr-2 h-5 w-5" /> Error
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4 sm:p-6">
                    <p className="text-sm sm:text-base">Could not connect to the database. Activity feed is currently unavailable.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg rounded-lg h-full flex flex-col">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                            <Activity className="mr-2 h-5 w-5 text-primary" /> Activity Feed
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Track all changes and activities in your expense sharing group. Click an expense activity for details.
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchActivityFeed}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`mr-1 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="expenses">Expenses</SelectItem>
                            <SelectItem value="settlements">Settlements</SelectItem>
                            <SelectItem value="people">People</SelectItem>
                            <SelectItem value="categories">Categories</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by person" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All People</SelectItem>
                            {people.map(person => (
                                <SelectItem key={person.id} value={person.id}>
                                    {person.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
                {filteredActivities.length > 0 ? (
                    <ScrollArea className="flex-1">
                        <div className="space-y-4">
                            {activityDates.map((date, index) => (
                                <div key={date}>
                                    <div className={`relative ${index === 0 ? 'mb-3' : 'my-3'}`}>
                                        <div className="absolute inset-0 flex items-center">
                                            <Separator className="bg-border shadow-inner opacity-80" />
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="bg-card px-2 text-muted-foreground font-semibold rounded shadow-inner border border-border/60" style={{ position: 'relative', top: '1px' }}>
                                                {date}
                                            </span>
                                        </div>
                                    </div>
                                    <ul className="space-y-2.5 px-0.5 sm:px-1">
                                        {groupedActivities[date].map(activity => (
                                            <ActivityListItem
                                                key={activity.id}
                                                activity={activity}
                                                onClick={activity.activity_type.includes('expense') ? handleActivityClick : undefined}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <p className="text-sm text-muted-foreground p-2">
                        {selectedCategory !== 'all' || selectedPerson !== 'all'
                            ? 'No activities found with the current filters.'
                            : 'No activities recorded yet.'
                        }
                    </p>
                )}
            </CardContent>
        </Card>
    );
}