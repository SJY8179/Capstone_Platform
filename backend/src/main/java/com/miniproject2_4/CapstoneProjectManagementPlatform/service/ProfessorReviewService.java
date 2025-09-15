package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProfessorReviewDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentReviewRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
    private final AssignmentReviewRepository assignmentReviewRepository;

    private static final DateTimeFormatter ISO_OFS = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    /** 목록 조회: 검토 대기(PENDING)만 노출 */
    @Transactional(readOnly = true)
    public List<ProfessorReviewDto.ReviewItem> listPendingReviews(Long userId, int days, int limit) {
        // 교수/참여자 기준 프로젝트
        List<Project> myProjects = projectRepository.findAllByProfessorUserId(userId);
        if (myProjects.isEmpty()) return List.of();

        List<Long> projectIds = myProjects.stream().map(Project::getId).toList();
        List<Assignment> all = assignmentRepository.findByProject_IdIn(projectIds);

        ZoneId zone = ZoneId.systemDefault();

        // PENDING만 노출
        List<Assignment> targets = all.stream()
                .filter(a -> a.getStatus() == AssignmentStatus.PENDING)
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

    /** 일괄 처리 (APPROVE → COMPLETED, REJECT → ONGOING) + 코멘트 로그 저장 */
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
                    a.setStatus(AssignmentStatus.ONGOING); // 목록에서 빠지도록
                }

                // 검토 로그 저장 (코멘트 포함)
                AssignmentReview r = new AssignmentReview();
                r.setAssignment(a);
                r.setDecision(action == ProfessorReviewDto.Action.APPROVE
                        ? AssignmentReview.Decision.APPROVE
                        : AssignmentReview.Decision.REJECT);
                r.setComment(nullIfBlank(it.comment()));     // ★ 여기서 comment 정확히 반영
                r.setReviewerId(userId);
                assignmentReviewRepository.save(r);

                ok++;
            } catch (Exception ex) {
                failed.add(it.assignmentId());
            }
        }

        return new ProfessorReviewDto.BulkResult(ok, failed.size(), failed);
    }

    /** 메모 단독 저장 (NOTE) */
    @Transactional
    public void addNote(Long userId, ProfessorReviewDto.NoteRequest req) {
        if (req == null || req.assignmentId() == null) return;

        Assignment a = assignmentRepository.findById(req.assignmentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Assignment not found: " + req.assignmentId()));

        // 권한검사: 담당교수 || 팀멤버
        Project p = a.getProject();
        boolean isProfessor = (p.getProfessor() != null && Objects.equals(p.getProfessor().getId(), userId));
        boolean isMember = (p.getTeam() != null) &&
                teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), userId);
        if (!(isProfessor || isMember)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No permission to add note");
        }

        AssignmentReview r = new AssignmentReview();
        r.setAssignment(a);
        r.setDecision(AssignmentReview.Decision.NOTE);
        r.setComment(nullIfBlank(req.comment())); // ★ 프런트의 comment 필드를 그대로 저장
        r.setReviewerId(userId);
        assignmentReviewRepository.save(r);
    }

    /** 검토 이력 조회 */
    @Transactional(readOnly = true)
    public List<ProfessorReviewDto.HistoryItem> getHistory(Long assignmentId) {
        // 과제 존재 여부 확인 (없으면 404)
        assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Assignment not found: " + assignmentId));

        ZoneId zone = ZoneId.systemDefault();

        return assignmentReviewRepository
                .findByAssignment_IdOrderByCreatedAtDesc(assignmentId)
                .stream()
                .map(r -> new ProfessorReviewDto.HistoryItem(
                        r.getId(),
                        r.getDecision() != null ? r.getDecision().name() : null,
                        r.getComment(),
                        toIso(r.getCreatedAt(), zone),
                        r.getReviewerId(),
                        r.getReviewerName()
                ))
                .toList();
    }

    private static String toIso(LocalDateTime ts, ZoneId zone) {
        if (ts == null) return null;
        return ts.atZone(zone).toOffsetDateTime().format(ISO_OFS);
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}