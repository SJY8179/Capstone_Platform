package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Notification;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // 특정 사용자의 모든 알림을 최신순으로 조회
    List<Notification> findByUser_IdOrderByCreatedAtDesc(Long userId);

    /**
     * 특정 사용자의 읽지 않은 알림을 최신순으로 조회합니다.
     * Spring Data JPA가 메서드 이름을 분석하여 자동으로 쿼리를 생성해줍니다.
     * @param userId 사용자의 ID
     * @return 알림 목록
     */
    List<Notification> findByUser_IdAndReadFalseOrderByCreatedAtDesc(Long userId);

    /**
     * 알림 유형(type)과 관련 엔티티 ID(relatedId)로 특정 알림을 찾습니다.
     * @param type 알림의 유형
     * @param relatedId 관련 엔티티의 ID (예: 초대장 ID)
     * @return Optional<Notification> 객체
     */
    Optional<Notification> findByTypeAndRelatedId(NotificationType type, Long relatedId);
}