package com.miniproject2_4.CapstoneProjectManagementPlatform.notification.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto.CreateNotificationRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto.MarkReadRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto.NotificationPageResponse;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto.NotificationResponse;
import com.miniproject2_4.CapstoneProjectManagementPlatform.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public NotificationPageResponse getNotifications(
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            Authentication auth) {

        Long userId = getCurrentUserId(auth);

        // Sort 파라미터 파싱
        String[] sortParams = sort.split(",");
        String sortField = sortParams[0];
        Sort.Direction direction = sortParams.length > 1 && "asc".equalsIgnoreCase(sortParams[1])
            ? Sort.Direction.ASC : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        return notificationService.getPage(userId, unreadOnly, pageable);
    }

    @GetMapping("/count")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Long> getUnreadCount(Authentication auth) {
        Long userId = getCurrentUserId(auth);
        long count = notificationService.getUnreadCount(userId);
        return Map.of("unreadCount", count);
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long id,
            @RequestBody MarkReadRequest request,
            Authentication auth) {

        Long userId = getCurrentUserId(auth);
        boolean success = notificationService.markRead(id, userId, request.getIsRead());

        if (!success) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다.");
        }

        return ResponseEntity.ok().build();
    }

    @PatchMapping("/mark-all-read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Integer>> markAllAsRead(Authentication auth) {
        Long userId = getCurrentUserId(auth);
        int updatedCount = notificationService.markAllRead(userId);
        return ResponseEntity.ok(Map.of("updatedCount", updatedCount));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id, Authentication auth) {
        Long userId = getCurrentUserId(auth);
        boolean success = notificationService.delete(id, userId);

        if (!success) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다.");
        }

        return ResponseEntity.noContent().build();
    }

    // 내부/테스트용 알림 생성 엔드포인트
    @PostMapping("/internal")
    @PreAuthorize("hasRole('ADMIN')")
    public NotificationResponse createNotification(@RequestBody CreateNotificationRequest request) {
        return notificationService.create(request);
    }

    private Long getCurrentUserId(Authentication auth) {
        UserAccount user = ensureUser(auth);
        return user.getId();
    }

    private UserAccount ensureUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        return (UserAccount) auth.getPrincipal();
    }
}