package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.NotificationDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Notification;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.NotificationType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * 알림을 생성하고 데이터베이스에 저장합니다.
     * @param user 알림을 받을 사용자
     * @param author 알림을 발생시킨 사용자 (시스템 알림의 경우 null 가능)
     * @param type 알림 유형
     * @param title 알림 제목
     * @param message 알림 메시지
     * @param relatedId 관련 데이터의 ID (초대 ID, 팀 ID 등)
     */
    @Transactional
    public void createNotification(UserAccount user, UserAccount author, NotificationType type,
                                   String title, String message, Long relatedId) {
        Notification notification = Notification.builder()
                .user(user)
                .author(author)
                .type(type)
                .title(title)
                .message(message)
                .read(false)
                .relatedId(relatedId)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUser_IdAndReadFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationDto::from)
                .toList();
    }

    @Transactional
    public void markInvitationNotificationAsRead(Long invitationId) {
        notificationRepository.findByTypeAndRelatedId(NotificationType.TEAM_INVITATION, invitationId)
                .ifPresent(notification -> notification.setRead(true));
    }

}