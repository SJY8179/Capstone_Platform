package com.miniproject2_4.CapstoneProjectManagementPlatform.notification.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientId(Long recipientId, Pageable pageable);

    Page<Notification> findByRecipientIdAndIsReadFalse(Long recipientId, Pageable pageable);

    long countByRecipientIdAndIsReadFalse(Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = :isRead, n.readAt = CASE WHEN :isRead = true THEN CURRENT_TIMESTAMP ELSE null END WHERE n.id = :id AND n.recipientId = :recipientId")
    int updateIsReadByIdAndRecipientId(@Param("id") Long id, @Param("recipientId") Long recipientId, @Param("isRead") Boolean isRead);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.recipientId = :recipientId AND n.isRead = false")
    int updateMarkAllReadByRecipientId(@Param("recipientId") Long recipientId);

    void deleteByIdAndRecipientId(Long id, Long recipientId);
}