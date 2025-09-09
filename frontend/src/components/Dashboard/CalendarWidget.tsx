import React from "react";
import { HorizontalCalendar } from "./HorizontalCalendar";

interface CalendarWidgetProps {
  className?: string;
}

export function CalendarWidget({ className }: CalendarWidgetProps) {
  return <HorizontalCalendar className={className} />;
}
