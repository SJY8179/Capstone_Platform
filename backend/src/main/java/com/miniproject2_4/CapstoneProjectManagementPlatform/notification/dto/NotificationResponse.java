package com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.domain.Notification;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.domain.NotificationType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String message;
    private String linkUrl;
    private Boolean isRead;
    private String metadata;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    public static NotificationResponse from(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.id = notification.getId();
        response.type = notification.getType();
        response.title = notification.getTitle();
        response.message = notification.getMessage();
        response.linkUrl = notification.getLinkUrl();
        response.isRead = notification.getIsRead();
        response.metadata = notification.getMetadata();
        response.createdAt = notification.getCreatedAt();
        response.readAt = notification.getReadAt();
        return response;
    }
}