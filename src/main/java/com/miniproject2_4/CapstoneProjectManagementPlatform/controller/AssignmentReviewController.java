package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AssignmentReviewDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentReviewRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}/assignments/{assignmentId}/reviews")
public class AssignmentReviewController {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentReviewRepository reviewRepository;
    private final TeamMemberRepository teamMemberRepository;

    private static Long currentUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다.");
        }
        return ua.getId();
    }

    /** 검토 이력 조회 */
    @GetMapping
    public List<AssignmentReviewDto.LogItem> list(
            Authentication auth,
            @PathVariable Long projectId,
            @PathVariable Long assignmentId
    ) {
        Long userId = currentUserId(auth);

        Assignment a = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found"));
        Project p = a.getProject();
        if (p == null || !Objects.equals(p.getId(), projectId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignment does not belong to project");
        }

        // 권한: 담당 교수 또는 해당 팀원
        boolean isProfessor = (p.getProfessor() != null && Objects.equals(p.getProfessor().getId(), userId));
        boolean isMember = (p.getTeam() != null) &&
                teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), userId);
        if (!(isProfessor || isMember)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
        }

        ZoneId zone = ZoneId.systemDefault();
        return reviewRepository.findByAssignment_IdOrderByCreatedAtDesc(assignmentId)
                .stream().map(r -> AssignmentReviewDto.LogItem.of(r, zone)).toList();
    }
}