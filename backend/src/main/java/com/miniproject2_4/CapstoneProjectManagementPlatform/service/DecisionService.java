package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Decision;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.DecisionRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
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
    private final UserRepository userRepository;

    public List<Decision> list(Long projectId) {
        // decidedBy, project를 함께 로딩하여 컨트롤러에서 안전하게 DTO 매핑
        return decisionRepository.findByProjectIdWithRefs(projectId);
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
    public Decision patch(Long id, Decision patch, Long decidedById) {
        // 연관까지 로딩된 상태로 가져와서 이후 DTO 매핑 시 Lazy 예외 방지
        Decision d = decisionRepository.findByIdWithRefs(id)
                .orElseThrow(() -> new IllegalArgumentException("Decision not found: " + id));

        if (patch.getTitle() != null) d.setTitle(patch.getTitle());
        if (patch.getContext() != null) d.setContext(patch.getContext());
        if (patch.getOptions() != null) d.setOptions(patch.getOptions());
        if (patch.getDecision() != null) d.setDecision(patch.getDecision());
        if (patch.getConsequences() != null) d.setConsequences(patch.getConsequences());
        if (patch.getDecidedAt() != null) d.setDecidedAt(patch.getDecidedAt());

        if (decidedById != null) {
            UserAccount by = userRepository.findById(decidedById)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + decidedById));
            d.setDecidedBy(by);
        }
        return d; // 영속 상태이며 decidedBy/project 로딩 완료
    }

    @Transactional
    public void delete(Long id) {
        decisionRepository.deleteById(id);
    }
}
