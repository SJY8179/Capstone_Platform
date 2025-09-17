package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Notification;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final ObjectMapper om = new ObjectMapper();

    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final DateTimeFormatter ISO_OFFSET = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    @GetMapping
    public List<Map<String, Object>> list(
            @AuthenticationPrincipal UserAccount me,
            @RequestParam(defaultValue = "false") boolean unreadOnly
    ) {
        return notificationService.list(me.getId(), unreadOnly).stream().map(this::toDto).toList();
    }

    @PostMapping("/{id}/read")
    public void markRead(@PathVariable Long id, @AuthenticationPrincipal UserAccount me) {
        notificationService.markRead(me.getId(), id);
    }

    private Map<String, Object> toDto(Notification n) {
        Object payload = null;
        try {
            payload = (n.getPayload() != null && !n.getPayload().isBlank())
                    ? om.readValue(n.getPayload(), Map.class) : null;
        } catch (Exception ignored) {}

        // LocalDateTime -> ISO with offset + epoch ms
        var zdt = n.getCreatedAt() != null ? n.getCreatedAt().atZone(ZONE) : null;
        String createdAtIso = zdt != null ? ISO_OFFSET.format(zdt) : null;
        Long ts = zdt != null ? zdt.toInstant().toEpochMilli() : null;

        return Map.of(
                "id", n.getId(),
                "type", n.getType().name(),
                "title", n.getTitle(),
                "body", n.getBody(),
                "payload", payload,
                "isRead", n.isRead(),
                "createdAt", createdAtIso != null ? createdAtIso : "", // 타임존 포함 ISO
                "ts", ts != null ? ts : 0L                               // epoch ms (정렬용)
        );
    }
}
