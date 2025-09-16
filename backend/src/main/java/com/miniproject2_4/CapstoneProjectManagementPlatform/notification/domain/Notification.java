package com.miniproject2_4.CapstoneProjectManagementPlatform.notification.domain;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_recipient_read_created",
           columnList = "recipient_id, is_read, created_at")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private NotificationType type;

    @Column(name = "title", length = 120, nullable = false)
    private String title;

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "link_url", length = 255)
    private String linkUrl;

    @Column(name = "is_read", nullable = false, columnDefinition = "boolean default false")
    private Boolean isRead = false;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    public static Notification create(Long recipientId, NotificationType type, String title,
                                    String message, String linkUrl, String metadata) {
        Notification notification = new Notification();
        notification.recipientId = recipientId;
        notification.type = type;
        notification.title = title;
        notification.message = message;
        notification.linkUrl = linkUrl;
        notification.metadata = metadata;
        notification.isRead = false;
        return notification;
    }

    public void markAsRead() {
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }

    public void markAsUnread() {
        this.isRead = false;
        this.readAt = null;
    }
}