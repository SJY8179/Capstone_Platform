package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProjectDocument;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectDocumentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectDocumentService {

    private final ProjectRepository projectRepository;
    private final ProjectDocumentRepository documentRepository;

    public List<ProjectDocument> list(Long projectId) {
        return documentRepository.findByProject_IdOrderByIdDesc(projectId);
    }

    @Transactional
    public ProjectDocument create(Long projectId, String title, String url, ProjectDocument.Type type, UserAccount author) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
        ProjectDocument doc = ProjectDocument.builder()
                .project(p)
                .title(title)
                .url(url)
                .type(type == null ? ProjectDocument.Type.OTHER : type)
                .createdBy(author)
                .createdAt(LocalDateTime.now())
                .build();
        return documentRepository.save(doc);
    }

    @Transactional
    public void delete(Long docId) {
        documentRepository.deleteById(docId);
    }
}
