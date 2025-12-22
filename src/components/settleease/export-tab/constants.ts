import { Calendar, CalendarDays, CalendarRange, CalendarClock, Infinity } from "lucide-react";
import { subDays, subMonths, startOfYear } from "date-fns";
import type { DatePresetConfig } from "./types";

export const DATE_PRESETS: DatePresetConfig[] = [
    {
        id: 'last7days',
        label: 'Last 7 Days',
        icon: CalendarDays,
        getRange: () => ({ start: subDays(new Date(), 7), end: new Date() })
    },
    {
        id: 'last30days',
        label: 'Last 30 Days',
        icon: Calendar,
        getRange: () => ({ start: subDays(new Date(), 30), end: new Date() })
    },
    {
        id: 'last3months',
        label: 'Last 3 Months',
        icon: CalendarRange,
        getRange: () => ({ start: subMonths(new Date(), 3), end: new Date() })
    },
    {
        id: 'thisYear',
        label: 'This Year',
        icon: CalendarClock,
        getRange: () => ({ start: startOfYear(new Date()), end: new Date() })
    },
    {
        id: 'allTime',
        label: 'All Time',
        icon: Infinity as any,
        getRange: () => ({ start: new Date(2020, 0, 1), end: new Date() })
    },
];
