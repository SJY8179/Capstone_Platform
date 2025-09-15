package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;

    /** 프로젝트의 과제를 마감일 오름차순으로 모두 가져오기 */
    public List<Assignment> listByProjectOrdered(Long projectId) {
        return assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId);
    }

    /** 프로젝트의 다가오는 과제 일부만 (limit) — 현재 시각 이후만 */
    public List<Assignment> listUpcoming(Long projectId, int limit) {
        var now = LocalDateTime.now();
        return assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId)
                .stream()
                .filter(a -> a.getDueDate() != null && a.getDueDate().isAfter(now))
                .limit(Math.max(0, limit))
                .toList();
    }

    /** 상태별 개수 */
    public long countCompleted(Long projectId) { return assignmentRepository.countByProject_IdAndStatus(projectId, AssignmentStatus.COMPLETED); }
    public long countOngoing(Long projectId)   { return assignmentRepository.countByProject_IdAndStatus(projectId, AssignmentStatus.ONGOING); }
    public long countPending(Long projectId)   { return assignmentRepository.countByProject_IdAndStatus(projectId, AssignmentStatus.PENDING); }

    /** 생성 */
    @Transactional
    public Assignment create(Long projectId, String title, String dueDateIso, AssignmentStatus status) {
        var proj = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
        var a = new Assignment();
        a.setProject(proj);
        a.setTitle(title != null ? title : "");

        // dueDate 보정: 입력 없으면 +7일 23:59, 날짜만 오면 23:59 로 보정
        LocalDateTime due = parseDateTime(dueDateIso);
        if (due == null) {
            due = LocalDate.now().plusDays(7).atTime(23, 59);
        }
        a.setDueDate(due);

        a.setStatus(status != null ? status : AssignmentStatus.PENDING);
        return assignmentRepository.save(a);
    }

    /** 수정 */
    @Transactional
    public Assignment update(Long projectId, Long id, String title, String dueDateIso, AssignmentStatus status) {
        var a = assignmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + id));
        if (!a.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Assignment does not belong to project: " + projectId);
        }
        if (title != null) a.setTitle(title);

        if (dueDateIso != null) {
            LocalDateTime parsed = parseDateTime(dueDateIso);
            // 빈 문자열 등으로 null이 나오면 변경하지 않고 유지 (DB 제약 보호)
            if (parsed != null) {
                a.setDueDate(parsed);
            }
        }

        if (status != null) a.setStatus(status);
        return a; // dirty checking
    }

    /** 상태 변경 */
    @Transactional
    public Assignment changeStatus(Long projectId, Long assignmentId, AssignmentStatus status) {
        var a = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));
        if (!a.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Assignment does not belong to project: " + projectId);
        }
        a.setStatus(status);
        return a;
    }

    /** 삭제 */
    @Transactional
    public void delete(Long projectId, Long id) {
        var a = assignmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + id));
        if (!a.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Assignment does not belong to project: " + projectId);
        }
        assignmentRepository.delete(a);
    }

    /** ====== 학생 '검토 요청' (ONGOING → PENDING) ====== */
    @Transactional
    public Assignment requestReview(Long projectId, Long assignmentId, Long userId, String message) {
        var a = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));

        Project p = a.getProject();
        if (p == null || !Objects.equals(p.getId(), projectId)) {
            throw new IllegalArgumentException("Assignment does not belong to project: " + projectId);
        }

        // (선택적) 권한검사: userId가 주어지면 '해당 프로젝트 팀의 멤버'인지 확인
        if (userId != null) {
            if (p.getTeam() == null || !teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), userId)) {
                throw new IllegalArgumentException("User is not a member of the project team");
            }
        }

        // 이미 완료된 과제는 재검토 요청 금지(원하면 정책 변경 가능)
        if (a.getStatus() == AssignmentStatus.COMPLETED) {
            throw new IllegalStateException("Completed assignment cannot be requested for review");
        }

        // 상태 변경: ONGOING(또는 PENDING) -> PENDING
        a.setStatus(AssignmentStatus.PENDING);

        // message 는 현재 저장 로직 없음(향후 ReviewLog 등과 연동 가능)
        return a; // dirty checking
    }

    /* ===== 유틸 ===== */

    /** "yyyy-MM-ddTHH:mm:ss" | Offset | Instant | "yyyy-MM-dd" 지원
     *  - 날짜만 오면 23:59로 보정
     */
    private static LocalDateTime parseDateTime(String v) {
        if (v == null || v.isBlank()) return null;
        try { return LocalDateTime.ofInstant(Instant.parse(v), ZoneId.systemDefault()); } catch (DateTimeException ignore) {}
        try { return OffsetDateTime.parse(v).toLocalDateTime(); } catch (DateTimeException ignore) {}
        try { return LocalDateTime.parse(v); } catch (DateTimeException ignore) {}
        // date-only
        var d = LocalDate.parse(v);
        return d.atTime(23, 59);
    }
}
