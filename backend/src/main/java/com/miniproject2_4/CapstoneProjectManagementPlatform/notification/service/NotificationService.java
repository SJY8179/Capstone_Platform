package com.miniproject2_4.CapstoneProjectManagementPlatform.notification.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.domain.Notification;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto.CreateNotificationRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto.NotificationPageResponse;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto.NotificationResponse;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public NotificationResponse create(CreateNotificationRequest request) {
        Notification notification = Notification.create(
                request.getRecipientId(),
                request.getType(),
                request.getTitle(),
                request.getMessage(),
                request.getLinkUrl(),
                request.getMetadata()
        );

        Notification saved = notificationRepository.save(notification);
        log.info("Created notification id={} for recipient={}", saved.getId(), saved.getRecipientId());

        return NotificationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse getPage(Long recipientId, Boolean unreadOnly, Pageable pageable) {
        Page<Notification> notifications;

        if (Boolean.TRUE.equals(unreadOnly)) {
            notifications = notificationRepository.findByRecipientIdAndIsReadFalse(recipientId, pageable);
        } else {
            notifications = notificationRepository.findByRecipientId(recipientId, pageable);
        }

        Page<NotificationResponse> responsePage = notifications.map(NotificationResponse::from);
        return NotificationPageResponse.from(responsePage);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long recipientId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(recipientId);
    }

    @Transactional
    public boolean markRead(Long id, Long recipientId, Boolean isRead) {
        int updated = notificationRepository.updateIsReadByIdAndRecipientId(id, recipientId, isRead);
        if (updated == 0) {
            log.warn("Failed to mark notification as read: id={}, recipientId={}", id, recipientId);
            return false;
        }

        log.info("Marked notification as {}: id={}, recipientId={}", isRead ? "read" : "unread", id, recipientId);
        return true;
    }

    @Transactional
    public int markAllRead(Long recipientId) {
        int updated = notificationRepository.updateMarkAllReadByRecipientId(recipientId);
        log.info("Marked {} notifications as read for recipient={}", updated, recipientId);
        return updated;
    }

    @Transactional
    public boolean delete(Long id, Long recipientId) {
        try {
            notificationRepository.deleteByIdAndRecipientId(id, recipientId);
            log.info("Deleted notification: id={}, recipientId={}", id, recipientId);
            return true;
        } catch (Exception e) {
            log.warn("Failed to delete notification: id={}, recipientId={}", id, recipientId, e);
            return false;
        }
    }
}