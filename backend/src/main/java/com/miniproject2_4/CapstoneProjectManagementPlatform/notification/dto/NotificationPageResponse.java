package com.miniproject2_4.CapstoneProjectManagementPlatform.notification.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.domain.Page;

import java.util.List;

@Getter
@Setter
public class NotificationPageResponse {
    private List<NotificationResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;

    public static NotificationPageResponse from(Page<NotificationResponse> page) {
        NotificationPageResponse response = new NotificationPageResponse();
        response.content = page.getContent();
        response.page = page.getNumber();
        response.size = page.getSize();
        response.totalElements = page.getTotalElements();
        response.totalPages = page.getTotalPages();
        response.first = page.isFirst();
        response.last = page.isLast();
        return response;
    }
}