package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

/**
 * 프론트 호환:
 * - date: "yyyy-MM-dd"
 * - time, endTime: "HH:mm"
 * - endTime은 이벤트일 때만 채워짐(선택)
 */
public record ScheduleDto(
        String id,        // "A-1", "E-2"
        String title,
        String description,
        String type,       // 'deadline' | 'presentation' | 'meeting' | 'task'
        String status,     // 'completed' | 'in-progress' | 'scheduled' | 'pending'
        String priority,   // 'high' | 'medium' | 'low'
        String date,       // YYYY-MM-DD
        String time,       // HH:mm
        String endTime,    // HH:mm (이벤트만)
        String duration,   // e.g. "30m" or null
        String location,
        String relatedProject
) {}
