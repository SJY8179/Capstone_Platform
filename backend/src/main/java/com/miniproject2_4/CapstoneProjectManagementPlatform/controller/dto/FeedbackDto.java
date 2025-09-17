package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

public record FeedbackDto(
        Long id,
        String author,     // 작성자 이름
        String content,
        String createdAt   // ISO_LOCAL_DATE_TIME
) {}
