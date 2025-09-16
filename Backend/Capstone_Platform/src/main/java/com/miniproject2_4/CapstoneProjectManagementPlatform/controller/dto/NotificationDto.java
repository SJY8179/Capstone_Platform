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
        String timestamp,
        boolean read,
        Long relatedId,
        AuthorDto author
) {
    public record AuthorDto(String name, String avatarUrl) {
        public static AuthorDto from(UserAccount author) {
            // 알림 작성자가 없는 경우(시스템 알림 등) null 처리
            if (author == null) {
                return null;
            }
            return new AuthorDto(author.getName(), author.getAvatarUrl());
        }
    }

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