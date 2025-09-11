package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectCreateReq;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectUpdateReq;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** /api/projects → FE ProjectListDto */
    public List<ProjectListDto> listProjects() {
        return projectRepository.findAllWithTeam().stream()
                .map(this::toListDto)
                .toList();
    }

    @Transactional
    public ProjectListDto createProject(UserAccount ua, ProjectCreateReq req) {
        if (req.getTitle() == null || req.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }

        Team team = null;
        if (req.getTeamId() != null) {
            team = teamRepository.findById(req.getTeamId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팀을 찾을 수 없습니다."));
            boolean isMember = safeIsMember(req.getTeamId(), ua.getId());
            if (!isMember) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "팀 멤버만 프로젝트를 생성할 수 있습니다.");
            }
        }

        Project p = new Project();
        p.setTitle(req.getTitle());
        // description, startDate, endDate는 현재 Project 엔티티에 없으므로 주석 처리
        // p.setDescription(req.getDescription());
        p.setTeam(team);
        // p.setStartDate(req.getStartDate());
        // p.setEndDate(req.getEndDate());
        p.setStatus(Project.Status.ACTIVE);

        Project saved = projectRepository.save(p);
        return toListDto(saved);
    }

    @Transactional
    public ProjectListDto updateProject(UserAccount ua, Long id, ProjectUpdateReq req) {
        Project p = projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));

        // 권한: 팀 프로젝트면 팀 멤버만 수정 가능(초기 스펙)
        if (p.getTeam() != null) {
            boolean isMember = safeIsMember(p.getTeam().getId(), ua.getId());
            if (!isMember) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "팀 멤버만 수정할 수 있습니다.");
            }
        } else {
            // 개인 프로젝트 정책을 쓸거면 여기에 소유자 체크 등 추가
        }

        if (req.getTitle() != null) p.setTitle(req.getTitle());
        // description, startDate, endDate는 현재 Project 엔티티에 없으므로 주석 처리
        // if (req.getDescription() != null) p.setDescription(req.getDescription());
        // if (req.getStartDate() != null) p.setStartDate(req.getStartDate());
        // if (req.getEndDate() != null) p.setEndDate(req.getEndDate());

        Project saved = projectRepository.save(p);
        return toListDto(saved);
    }

    @Transactional
    public void deleteProject(UserAccount ua, Long id) {
        Project p = projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));

        if (p.getTeam() != null) {
            boolean isMember = safeIsMember(p.getTeam().getId(), ua.getId());
            if (!isMember) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "팀 멤버만 삭제할 수 있습니다.");
            }
            // 팀장만 삭제 등 추가 정책이 필요하면 TeamRole 체크 로직 추가
        }
        projectRepository.delete(p);
    }

    private boolean safeIsMember(Long teamId, Long userId) {
        try {
            return teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, userId);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "팀 멤버십 확인 중 오류", e);
        }
    }

    private ProjectListDto toListDto(Project p) {
        String teamName = (p.getTeam() != null && p.getTeam().getName() != null)
                ? p.getTeam().getName()
                : "미지정 팀";

        var members = (p.getTeam() == null)
                ? List.<ProjectListDto.Member>of()
                : teamMemberRepository.findWithUserByTeamId(p.getTeam().getId()).stream()
                .map(tm -> new ProjectListDto.Member(
                        tm.getUser() != null ? tm.getUser().getId() : null,
                        tm.getUser() != null ? (tm.getUser().getName() != null ? tm.getUser().getName() : tm.getUser().getEmail()) : "이름없음"
                ))
                .toList();

        var assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(p.getId());
        int total = assigns.size();
        int completed = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
        int progress = total == 0 ? 0 : (int) Math.round(completed * 100.0 / total);

        var now = LocalDateTime.now();
        var next = assigns.stream()
                .filter(a -> a.getDueDate() != null && !a.getDueDate().isBefore(now))
                .min(Comparator.comparing(Assignment::getDueDate))
                .orElse(null);

        // 최근 업데이트 = 과제 dueDate, 이벤트 startAt 중 최댓값 → 없으면 엔티티 updatedAt/createdAt
        LocalDateTime luAssign = assigns.stream()
                .map(Assignment::getDueDate).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime luEvent = eventRepository.findByProject_IdOrderByStartAtAsc(p.getId()).stream()
                .map(Event::getStartAt).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime latest = latestOf(
                latestOf(luAssign, luEvent),
                p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt()
        );
        String lastUpdate = (latest != null) ? latest.format(ISO) : null;

        return new ProjectListDto(
                p.getId(),
                p.getTitle() != null ? p.getTitle() : ("프로젝트 #" + p.getId()),
                null, // 별도 설명 필드가 없으면 null
                mapStatus(p.getStatus()),
                teamName,
                lastUpdate,
                progress,
                members,
                new ProjectListDto.Milestones(completed, total),
                (next == null ? null : new ProjectListDto.NextDeadline(
                        next.getTitle(), next.getDueDate().format(ISO)))
        );
    }

    /** Project.getStatus()가 enum이든 문자열이든 대응 */
    private String mapStatus(Object raw) {
        if (raw == null) return "in-progress";
        String s = (raw instanceof Enum<?> e) ? e.name() : String.valueOf(raw);
        s = s.replace('_','-').toUpperCase();
        return switch (s) {
            case "ACTIVE", "IN-PROGRESS", "INPROGRESS" -> "in-progress";
            case "REVIEW", "REVIEWING" -> "review";
            case "COMPLETED", "DONE" -> "completed";
            case "PLANNING", "PLAN" -> "planning";
            default -> "in-progress";
        };
    }

    private static LocalDateTime latestOf(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }
}
