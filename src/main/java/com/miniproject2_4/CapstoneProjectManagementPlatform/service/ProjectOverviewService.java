package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProjectOverview;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectOverviewRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectOverviewService {

    private final ProjectRepository projectRepository;
    private final ProjectOverviewRepository overviewRepository;

    public ProjectOverview getOrInit(Long projectId) {
        return overviewRepository.findByProject_Id(projectId)
                .orElseGet(() -> {
                    Project p = projectRepository.findById(projectId)
                            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
                    ProjectOverview ov = ProjectOverview.builder()
                            .project(p)
                            .markdown("")
                            .status(ProjectOverview.Status.PUBLISHED)
                            .version(1)
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return overviewRepository.save(ov);
                });
    }

    @Transactional
    public ProjectOverview saveDirect(Long projectId, String markdown, UserAccount editor) {
        ProjectOverview ov = getOrInit(projectId);
        ov.setMarkdown(markdown == null ? "" : markdown);
        ov.setStatus(ProjectOverview.Status.PUBLISHED);
        ov.setVersion(ov.getVersion() + 1);
        ov.setUpdatedBy(editor);
        ov.setUpdatedAt(LocalDateTime.now());
        ov.setPendingMarkdown(null);
        ov.setPendingAuthor(null);
        ov.setPendingAt(null);
        // 명시 저장으로 즉시 일관성 보장
        return overviewRepository.save(ov);
    }

    @Transactional
    public ProjectOverview submitProposal(Long projectId, String markdown, UserAccount author) {
        ProjectOverview ov = getOrInit(projectId);
        ov.setPendingMarkdown(markdown == null ? "" : markdown);
        ov.setPendingAuthor(author);
        ov.setPendingAt(LocalDateTime.now());
        ov.setStatus(ProjectOverview.Status.PENDING);
        return overviewRepository.save(ov);
    }

    @Transactional
    public ProjectOverview approve(Long projectId, UserAccount approver) {
        ProjectOverview ov = getOrInit(projectId);
        if (ov.getPendingMarkdown() == null) {
            // 승인할 제안 없음 → 상태만 정합성 맞춤
            ov.setStatus(ProjectOverview.Status.PUBLISHED);
            return overviewRepository.save(ov);
        }
        ov.setMarkdown(ov.getPendingMarkdown());
        ov.setVersion(ov.getVersion() + 1);
        ov.setUpdatedBy(approver);
        ov.setUpdatedAt(LocalDateTime.now());
        ov.setPendingMarkdown(null);
        ov.setPendingAuthor(null);
        ov.setPendingAt(null);
        ov.setStatus(ProjectOverview.Status.PUBLISHED);
        return overviewRepository.save(ov);
    }

    @Transactional
    public ProjectOverview reject(Long projectId) {
        ProjectOverview ov = getOrInit(projectId);
        ov.setPendingMarkdown(null);
        ov.setPendingAuthor(null);
        ov.setPendingAt(null);
        ov.setStatus(ProjectOverview.Status.PUBLISHED);
        return overviewRepository.save(ov);
    }
}
