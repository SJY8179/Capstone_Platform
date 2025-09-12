package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.FeedbackDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.CursorPage;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Feedback;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.FeedbackRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final ProjectRepository projectRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public List<FeedbackDto> list(Long projectId, int limit) {
        int safeLimit = Math.max(0, limit);
        return feedbackRepository.findRecentWithAuthor(projectId).stream()
                .limit(safeLimit)
                .map(FeedbackService::toDto)
                .toList();
    }

    public CursorPage<FeedbackDto> page(Long projectId, Long beforeId, int limit) {
        int safeLimit = Math.max(1, limit);
        var rows = feedbackRepository.findPageWithAuthor(
                projectId,
                beforeId,
                PageRequest.of(0, safeLimit)
        );
        var items = rows.stream().map(FeedbackService::toDto).toList();
        Long nextCursor = (rows.size() == safeLimit)
                ? rows.get(rows.size() - 1).getId()
                : null;
        return new CursorPage<>(items, nextCursor);
    }

    @Transactional
    public FeedbackDto create(Long projectId, UserAccount author, String content) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트가 존재하지 않습니다."));

        Feedback f = Feedback.builder()
                .project(project)
                .author(author)
                .content(content)
                .build();

        Feedback saved = feedbackRepository.save(f);
        return toDto(saved);
    }

    @Transactional
    public FeedbackDto update(Long projectId, Long feedbackId, String content) {
        Feedback f = feedbackRepository.findByIdAndProject_Id(feedbackId, projectId)
                .orElseThrow(() -> new EntityNotFoundException("피드백이 존재하지 않거나 프로젝트와 일치하지 않습니다."));
        f.setContent(content);
        return toDto(f);
    }

    @Transactional
    public void delete(Long projectId, Long feedbackId) {
        Feedback f = feedbackRepository.findByIdAndProject_Id(feedbackId, projectId)
                .orElseThrow(() -> new EntityNotFoundException("피드백이 존재하지 않거나 프로젝트와 일치하지 않습니다."));
        feedbackRepository.delete(f);
    }

    private static FeedbackDto toDto(Feedback f) {
        return new FeedbackDto(
                f.getId(),
                f.getAuthor() != null ? f.getAuthor().getName() : "익명",
                f.getContent(),
                f.getCreatedAt() != null ? f.getCreatedAt().format(ISO) : null
        );
    }
}
