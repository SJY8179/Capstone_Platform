package com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.domain.NotificationType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateNotificationRequest {
    private Long recipientId;
    private NotificationType type;
    private String title;
    private String message;
    private String linkUrl;
    private String metadata;

    public CreateNotificationRequest() {}

    public CreateNotificationRequest(Long recipientId, NotificationType type, String title,
                                   String message, String linkUrl, String metadata) {
        this.recipientId = recipientId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.linkUrl = linkUrl;
        this.metadata = metadata;
    }
}