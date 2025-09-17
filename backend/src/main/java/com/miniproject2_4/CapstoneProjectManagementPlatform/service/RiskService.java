package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Risk;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.RiskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RiskService {

    private final ProjectRepository projectRepository;
    private final RiskRepository riskRepository;

    public List<Risk> list(Long projectId) {
        return riskRepository.findByProject_IdOrderByIdDesc(projectId);
    }

    @Transactional
    public Risk create(Long projectId, Risk draft) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
        draft.setId(null);
        draft.setProject(p);
        draft.setUpdatedAt(LocalDateTime.now());
        if (draft.getStatus() == null) draft.setStatus(Risk.Status.OPEN);
        return riskRepository.save(draft);
    }

    @Transactional
    public Risk patch(Long riskId, Risk patch) {
        Risk r = riskRepository.findById(riskId)
                .orElseThrow(() -> new IllegalArgumentException("Risk not found: " + riskId));
        if (patch.getTitle() != null) r.setTitle(patch.getTitle());
        if (patch.getImpact() != 0) r.setImpact(patch.getImpact());
        if (patch.getLikelihood() != 0) r.setLikelihood(patch.getLikelihood());
        if (patch.getMitigation() != null) r.setMitigation(patch.getMitigation());
        if (patch.getOwner() != null) r.setOwner(patch.getOwner());
        if (patch.getDueDate() != null) r.setDueDate(patch.getDueDate());
        if (patch.getStatus() != null) r.setStatus(patch.getStatus());
        r.setUpdatedAt(LocalDateTime.now());
        return r;
    }

    @Transactional
    public void delete(Long riskId) {
        riskRepository.deleteById(riskId);
    }
}