package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ScheduleDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.EventRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService {

    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final ProjectRepository projectRepository;

    private static final DateTimeFormatter D = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter T = DateTimeFormatter.ofPattern("HH:mm");

    /** (deprecated) — 더미 제거: 빈 배열 반환 */
    public List<ScheduleDto> list() { return List.of(); }
    public List<ScheduleDto> listSchedules() { return List.of(); }

    /** 기간 기반: onlyEvents=true면 Event만, 아니면 Assignment + Event (projectId 필수) */
    public List<ScheduleDto> listSchedulesInRange(
            Long projectId, Long teamId, LocalDate from, LocalDate to, boolean onlyEvents
    ) {
        if (projectId == null) return List.of();

        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toExclusive = to.plusDays(1).atStartOfDay();

        List<ScheduleDto> out = new ArrayList<>();

        // Events: [from, to) 겹침 조회
        var evs = eventRepository.findInRange(projectId, fromTs, toExclusive);
        String projectTitle = projectRepository.findById(projectId).map(Project::getTitle).orElse(null);
        for (var e : evs) {
            String type = switch (e.getType() == null ? EventType.MEETING : e.getType()) {
                case MEETING -> "meeting";
                case DEADLINE -> "deadline";
                case PRESENTATION -> "presentation";
                case ETC -> "task";
            };
            out.add(new ScheduleDto(
                    "E-" + e.getId(),
                    e.getTitle(),
                    null,
                    type,
                    "scheduled",
                    type.equals("deadline") ? "high" : (type.equals("meeting") ? "medium" : "low"),
                    e.getStartAt() != null ? e.getStartAt().toLocalDate().format(D) : null,
                    e.getStartAt() != null ? e.getStartAt().toLocalTime().format(T) : null,
                    e.getEndAt()   != null ? e.getEndAt().toLocalTime().format(T)   : null,
                    null,
                    e.getLocation(),
                    projectTitle
            ));
        }

        // Assignments: 옵션
        if (!onlyEvents) {
            var assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId);
            for (var a : assigns) {
                var due = a.getDueDate();
                if (due == null) continue;
                if (due.isBefore(fromTs) || !due.isBefore(toExclusive)) continue;

                String status = switch (a.getStatus() == null ? AssignmentStatus.PENDING : a.getStatus()) {
                    case COMPLETED -> "completed";
                    case ONGOING   -> "in-progress";
                    case PENDING   -> "pending";
                };
                out.add(new ScheduleDto(
                        "A-" + a.getId(),
                        a.getTitle(),
                        null,
                        "deadline",
                        status,
                        "medium",
                        due.toLocalDate().format(D),
                        due.toLocalTime().format(T),
                        null,
                        null,
                        "온라인 제출",
                        projectTitle
                ));
            }
        }

        out.sort(Comparator
                .comparing((ScheduleDto s) -> s.date() == null ? "9999-12-31" : s.date())
                .thenComparing(s -> s.time() == null ? "99:99" : s.time())
                .thenComparing(ScheduleDto::id));
        return out;
    }
}