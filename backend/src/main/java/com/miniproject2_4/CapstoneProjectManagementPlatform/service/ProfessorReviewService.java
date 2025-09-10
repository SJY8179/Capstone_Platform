package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProfessorReviewDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfessorReviewService {

    private final ProjectRepository projectRepository;
    private final AssignmentRepository assignmentRepository;
    private final TeamMemberRepository teamMemberRepository;

    private static final DateTimeFormatter ISO_OFS = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    /** 목록 조회 */
    @Transactional(readOnly = true)
    public List<ProfessorReviewDto.ReviewItem> listPendingReviews(Long userId, int days, int limit) {
        // 교수/참여자 기준 프로젝트
        List<Project> myProjects = projectRepository.findAllByProfessorUserId(userId);
        if (myProjects.isEmpty()) return List.of();

        List<Long> projectIds = myProjects.stream().map(Project::getId).toList();
        List<Assignment> all = assignmentRepository.findByProject_IdIn(projectIds);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime within = now.plusDays(Math.max(0, days));
        ZoneId zone = ZoneId.systemDefault();

        // Pending 대상 판정
        List<Assignment> targets = all.stream()
                .filter(a -> isPendingForReview(a, within))
                .sorted(Comparator.comparing(
                        a -> Optional.ofNullable(a.getDueDate()).orElse(LocalDateTime.MAX)
                ))
                .limit(Math.max(0, limit))
                .toList();

        return targets.stream()
                .map(a -> new ProfessorReviewDto.ReviewItem(
                        a.getId(),
                        a.getProject().getId(),
                        a.getProject().getTitle(),
                        a.getProject().getTeam() != null ? a.getProject().getTeam().getName() : null,
                        a.getTitle(),
                        toIso(a.getUpdatedAt(), zone),
                        toIso(a.getDueDate(), zone),
                        a.getStatus() != null ? a.getStatus().name() : null
                ))
                .collect(Collectors.toList());
    }

    /** 일괄 처리 */
    @Transactional
    public ProfessorReviewDto.BulkResult bulkReview(Long userId, ProfessorReviewDto.BulkRequest req) {
        ProfessorReviewDto.Action action = req.action();
        List<ProfessorReviewDto.BulkItem> items = req.items();

        int ok = 0;
        List<Long> failed = new ArrayList<>();

        for (ProfessorReviewDto.BulkItem it : items) {
            try {
                Optional<Assignment> opt = assignmentRepository.findById(it.assignmentId());
                if (opt.isEmpty()) {
                    failed.add(it.assignmentId());
                    continue;
                }
                Assignment a = opt.get();

                // projectId 바인딩 검증
                if (a.getProject() == null || !Objects.equals(a.getProject().getId(), it.projectId())) {
                    failed.add(it.assignmentId());
                    continue;
                }

                // 권한검사: 담당교수 || 팀멤버
                Project p = a.getProject();
                boolean isProfessor = (p.getProfessor() != null && Objects.equals(p.getProfessor().getId(), userId));
                boolean isMember = (p.getTeam() != null) &&
                        teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), userId);

                if (!(isProfessor || isMember)) {
                    failed.add(it.assignmentId());
                    continue;
                }

                // 상태 변경
                if (action == ProfessorReviewDto.Action.APPROVE) {
                    a.setStatus(AssignmentStatus.COMPLETED);
                } else { // REJECT
                    a.setStatus(AssignmentStatus.PENDING);
                }

                // 변경은 영속 컨텍스트에 의해 flush됨 (save 호출 불필요)
                ok++;
            } catch (Exception ex) {
                failed.add(it.assignmentId());
            }
        }

        return new ProfessorReviewDto.BulkResult(ok, failed.size(), failed);
    }

    private static boolean isPendingForReview(Assignment a, LocalDateTime within) {
        if (a == null || a.getStatus() == null) return false;
        if (a.getStatus() == AssignmentStatus.PENDING) return true;
        if (a.getStatus() == AssignmentStatus.ONGOING && a.getDueDate() != null) {
            return !a.getDueDate().isAfter(within); // 마감 지났거나 X일 내 임박
        }
        return false;
    }

    private static String toIso(LocalDateTime ts, ZoneId zone) {
        if (ts == null) return null;
        return ts.atZone(zone).toOffsetDateTime().format(ISO_OFS);
    }
}
