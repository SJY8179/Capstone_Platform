package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.FeedbackDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public List<FeedbackDto> list(Long projectId, int limit) {
        return feedbackRepository.findRecentWithAuthor(projectId).stream()
                .limit(Math.max(0, limit))
                .map(f -> new FeedbackDto(
                        f.getId(),
                        f.getAuthor() != null ? f.getAuthor().getName() : "익명",
                        f.getContent(),
                        f.getCreatedAt() != null ? f.getCreatedAt().format(ISO) : null
                ))
                .toList();
    }
}
