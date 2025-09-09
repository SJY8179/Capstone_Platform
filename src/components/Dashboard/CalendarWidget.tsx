import React from "react";
import { HorizontalCalendar } from "./HorizontalCalendar";

interface CalendarWidgetProps {
  className?: string;
  projectId?: number; // ← optional
}

export function CalendarWidget({ className, projectId }: CalendarWidgetProps) {
  return <HorizontalCalendar className={className} projectId={projectId} />;
}

export default CalendarWidget;