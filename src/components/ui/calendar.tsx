"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center mb-3",
        caption_label: "text-sm font-medium text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          "hover:bg-muted rounded-md transition-all duration-200",
          "focus:outline-none focus:opacity-100 focus:bg-muted",
          "border-0"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse mt-1",
        head_row: "flex w-full mb-1",
        head_cell: "text-muted-foreground w-9 h-8 font-normal text-xs flex items-center justify-center",
        row: "flex w-full mt-0",
        cell: "relative p-0 text-center text-sm h-9 w-9 flex items-center justify-center",
        day: cn(
          "h-9 w-9 p-0 font-normal rounded-md transition-colors cursor-pointer",
          "hover:bg-muted hover:text-foreground",
          "focus:outline-none focus:bg-muted focus:text-foreground",
          "active:bg-muted/80"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-primary text-primary-foreground font-medium",
          "hover:bg-primary/90 hover:text-primary-foreground",
          "focus:bg-primary/90 focus:text-primary-foreground focus:outline-none"
        ),
        day_today: cn(
          "bg-muted/60 text-foreground font-medium",
          "hover:bg-muted hover:text-foreground"
        ),
        day_outside: cn(
          "text-muted-foreground/40 opacity-50",
          "hover:bg-muted/50 hover:text-muted-foreground/60",
          "aria-selected:bg-primary/20 aria-selected:text-muted-foreground/60"
        ),
        day_disabled: "text-muted-foreground/30 opacity-50 cursor-not-allowed hover:bg-transparent",
        day_range_middle: "aria-selected:bg-primary/20 aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
