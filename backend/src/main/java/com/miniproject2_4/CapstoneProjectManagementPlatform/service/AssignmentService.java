package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final ProjectRepository projectRepository;

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
        a.setDueDate(parseDateTime(dueDateIso));
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
        if (dueDateIso != null) a.setDueDate(parseDateTime(dueDateIso));
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

    /* ===== 유틸 ===== */

    /** "yyyy-MM-ddTHH:mm:ss" | Offset | Instant | "yyyy-MM-dd" 지원 */
    private static LocalDateTime parseDateTime(String v) {
        if (v == null || v.isBlank()) return null;
        try { return LocalDateTime.ofInstant(Instant.parse(v), ZoneId.systemDefault()); } catch (DateTimeException ignore) {}
        try { return OffsetDateTime.parse(v).toLocalDateTime(); } catch (DateTimeException ignore) {}
        try { return LocalDateTime.parse(v); } catch (DateTimeException ignore) {}
        var d = LocalDate.parse(v);
        return d.atStartOfDay();
    }
}
