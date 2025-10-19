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
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-sm font-medium text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-background border-border p-0",
          "hover:bg-accent hover:text-accent-foreground hover:border-accent",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "transition-all duration-200 ease-in-out"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1 mt-2",
        head_row: "flex w-full",
        head_cell: "text-muted-foreground rounded-md w-10 h-8 font-medium text-[0.75rem] flex items-center justify-center uppercase tracking-wide",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "h-10 w-10 flex items-center justify-center",
          "hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        ),
        day: cn(
          "h-10 w-10 p-0 font-normal rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-primary text-primary-foreground font-semibold",
          "hover:bg-primary/90 hover:text-primary-foreground",
          "focus:bg-primary focus:text-primary-foreground",
          "shadow-sm ring-2 ring-primary ring-offset-1 ring-offset-background"
        ),
        day_today: cn(
          "bg-accent text-accent-foreground font-semibold",
          "ring-2 ring-accent ring-offset-1 ring-offset-background"
        ),
        day_outside: cn(
          "text-muted-foreground opacity-50",
          "aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30"
        ),
        day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
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
