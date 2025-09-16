package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Notification;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.NotificationType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record NotificationDto(
        Long id,
        NotificationType type,
        String title,
        String message,
        String timestamp, // 프론트엔드와 일관성을 위해 ISO 문자열로 변환
        boolean read,
        Long relatedId,
        AuthorDto author
) {
    // 내부 정적 DTO로 작성자 정보 캡슐화
    public record AuthorDto(String name, String avatarUrl) {
        public static AuthorDto from(UserAccount author) {
            // 알림 작성자가 없는 경우(시스템 알림 등) null 처리
            if (author == null) {
                return null;
            }
            return new AuthorDto(author.getName(), author.getAvatarUrl());
        }
    }

    /**
     * Notification 엔티티를 NotificationDto로 변환하는 정적 팩토리 메소드
     */
    public static NotificationDto from(Notification entity) {
        return new NotificationDto(
                entity.getId(),
                entity.getType(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME), // LocalDateTime -> ISO String
                entity.isRead(),
                entity.getRelatedId(),
                AuthorDto.from(entity.getAuthor())
        );
    }
}