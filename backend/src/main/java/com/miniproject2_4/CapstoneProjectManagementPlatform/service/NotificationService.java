package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Notification;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.NotificationType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.NotificationRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper om = new ObjectMapper();

    @Transactional
    public Notification push(Long recipientId, NotificationType type, String title, String body, Map<String, Object> payload) {
        UserAccount u = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("수신자 없음: " + recipientId));
        String payloadJson = null;
        try { if (payload != null) payloadJson = om.writeValueAsString(payload); }
        catch (JsonProcessingException ignored) {}

        Notification n = Notification.builder()
                .recipient(u)
                .type(type)
                .title(title)
                .body(body)
                .payload(payloadJson)
                .isRead(false)
                .build();
        return notificationRepository.save(n);
    }

    public List<Notification> list(Long userId, boolean unreadOnly) {
        return unreadOnly
                ? notificationRepository.findTop100ByRecipient_IdAndIsReadOrderByCreatedAtDesc(userId, false)
                : notificationRepository.findTop100ByRecipient_IdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void markRead(Long userId, Long notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림이 존재하지 않습니다."));
        if (!n.getRecipient().getId().equals(userId)) {
            throw new IllegalArgumentException("본인 알림만 읽음처리할 수 있습니다.");
        }
        n.setRead(true);
    }
}
