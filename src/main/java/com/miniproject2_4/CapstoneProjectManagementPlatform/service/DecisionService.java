package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Decision;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.DecisionRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DecisionService {

    private final ProjectRepository projectRepository;
    private final DecisionRepository decisionRepository;

    public List<Decision> list(Long projectId) {
        return decisionRepository.findByProject_IdOrderByIdDesc(projectId);
    }

    @Transactional
    public Decision create(Long projectId, Decision draft) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
        draft.setId(null);
        draft.setProject(p);
        draft.setCreatedAt(LocalDateTime.now());
        return decisionRepository.save(draft);
    }

    @Transactional
    public Decision patch(Long id, Decision patch) {
        Decision d = decisionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Decision not found: " + id));
        if (patch.getTitle() != null) d.setTitle(patch.getTitle());
        if (patch.getContext() != null) d.setContext(patch.getContext());
        if (patch.getOptions() != null) d.setOptions(patch.getOptions());
        if (patch.getDecision() != null) d.setDecision(patch.getDecision());
        if (patch.getConsequences() != null) d.setConsequences(patch.getConsequences());
        if (patch.getDecidedAt() != null) d.setDecidedAt(patch.getDecidedAt());
        if (patch.getDecidedBy() != null) d.setDecidedBy(patch.getDecidedBy());
        return d;
    }

    @Transactional
    public void delete(Long id) {
        decisionRepository.deleteById(id);
    }
}