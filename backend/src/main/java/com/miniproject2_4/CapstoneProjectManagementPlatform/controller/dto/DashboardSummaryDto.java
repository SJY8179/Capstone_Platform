package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class DashboardSummaryDto {
    public static class Metric {
        public int totalAssignments;
        public int completedAssignments;
        public int ongoingAssignments;
        public double completionRate; // 0~100
    }
    public static class SimpleAssignment {
        public Long id;
        public String title;
        public LocalDateTime dueDate;
        public String status; // ONGOING, DONE...
    }
    public static class SimpleEvent {
        public Long id;
        public String title;
        public String type; // MEETING, DEADLINE...
        public LocalDateTime startAt;
        public LocalDateTime endAt;
        public String location;
    }
    public static class DaySchedule {
        public LocalDate date;
        public List<SimpleEvent> events; // 이날의 이벤트 리스트
    }

    public String currentProjectTitle;
    public Metric metric;
    public List<SimpleAssignment> upcomingDeadlines; // 3~5개
    public List<SimpleEvent> upcomingEvents; // 3~5개
    public List<DaySchedule> weekSchedules; // 이번주 월~일
}
