package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop100ByRecipient_IdOrderByCreatedAtDesc(Long recipientId);
    List<Notification> findTop100ByRecipient_IdAndIsReadOrderByCreatedAtDesc(Long recipientId, boolean isRead);
}
