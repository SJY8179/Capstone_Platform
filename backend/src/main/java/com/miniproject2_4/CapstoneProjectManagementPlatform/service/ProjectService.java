package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.CreateProjectRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectDetailDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventService eventService;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** /api/projects → FE ProjectListDto */
    public List<ProjectListDto> listProjects() {
        return projectRepository.findAllWithTeam().stream()
                .map(this::toListDto)
                .toList();
    }

    /**
     * 새 프로젝트 생성
     * 권한:
     *  - ADMIN || 해당 팀의 멤버
     * 교수 배정:
     *  - 요청에 professorId가 있으면 그것을 사용(역할 검증)
     *  - 없으면 팀 멤버 중 Role.PROFESSOR 1명 자동 선택
     *  - 그래도 없으면 400(PROFESSOR_REQUIRED)
     */
    @Transactional
    public ProjectListDto createProject(CreateProjectRequest request, UserAccount creator) {
        if (creator == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }

        // 1) 팀 확인
        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "선택한 팀이 존재하지 않습니다."));

        // 2) 권한 확인
        boolean allowed = (creator.getRole() == Role.ADMIN)
                || teamMemberRepository.existsByTeam_IdAndUser_Id(team.getId(), creator.getId());
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "선택한 팀의 멤버가 아닙니다.");
        }

        // 3) 담당 교수 결정 (필수)
        UserAccount professor = resolveProfessorForTeam(team, request.getProfessorId());
        if (professor == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PROFESSOR_REQUIRED");
        }

        // 4) 생성
        Project project = Project.builder()
                .title(normalizeTitle(request.getTitle()))
                .team(team)
                .professor(professor)
                .status(Project.Status.ACTIVE)
                .archived(false)
                .build();

        project = projectRepository.save(project);

        // 5) 시스템 활동 로깅
        eventService.logSystemActivity(
                "프로젝트 생성: " + project.getTitle() + " (생성자: " + creator.getName() + ")",
                project.getId()
        );

        return toListDto(project);
    }

    /** 내가 볼 수 있는 프로젝트 목록 (교수는 멤버십 ∪ 담당교수 합집합) */
    public List<ProjectListDto> listProjectsForUser(UserAccount ua) {
        if (ua == null) return List.of();
        if (ua.getRole() == Role.ADMIN) return listProjects();

        if (ua.getRole() == Role.PROFESSOR) {
            // 멤버십 + 담당교수(archived=false) 합집합
            List<Project> asMember = projectRepository.findAllByMemberUserId(ua.getId());
            List<Project> asProfessor = projectRepository.findAllByProfessorUserId(ua.getId());
            List<Project> union = unionById(asMember, asProfessor);
            return union.stream().map(this::toListDto).toList();
        }

        // 학생 등: 멤버십만
        return projectRepository.findAllByMemberUserId(ua.getId()).stream()
                .map(this::toListDto)
                .toList();
    }

    /** Archive 필터 목록 (교수는 멤버십 ∪ 담당교수 합집합) */
    public List<ProjectListDto> listProjectsForUser(UserAccount ua, String status) {
        if (ua == null) return List.of();
        boolean archived = "archived".equals(status);

        if (ua.getRole() == Role.ADMIN) {
            return projectRepository.findAllWithTeamByArchived(archived).stream()
                    .map(this::toListDto)
                    .toList();
        }

        if (ua.getRole() == Role.PROFESSOR) {
            List<Project> asMember = projectRepository.findAllByMemberUserIdAndArchived(ua.getId(), archived);
            List<Project> asProfessor = projectRepository.findAllByProfessorUserIdAndArchived(ua.getId(), archived);
            List<Project> union = unionById(asMember, asProfessor);
            return union.stream().map(this::toListDto).toList();
        }

        return projectRepository.findAllByMemberUserIdAndArchived(ua.getId(), archived).stream()
                .map(this::toListDto)
                .toList();
    }

    /** 상세 + 권한 */
    public ProjectDetailDto getProjectDetail(Long projectId, UserAccount viewer) {
        Project p = projectRepository.findByIdWithTeamAndProfessor(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));

        boolean allowed;
        if (viewer.getRole() == Role.ADMIN) {
            allowed = true;
        } else if (viewer.getRole() == Role.PROFESSOR) {
            boolean isProfessor = (p.getProfessor() != null && Objects.equals(p.getProfessor().getId(), viewer.getId()));
            boolean isMember = (p.getTeam() != null) && teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), viewer.getId());
            allowed = isProfessor || isMember;
        } else {
            allowed = (p.getTeam() != null) && teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), viewer.getId());
        }
        if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 프로젝트를 열람할 권한이 없습니다.");

        // 멤버 목록 (참고용)
        List<ProjectListDto.Member> members = (p.getTeam() == null)
                ? List.of()
                : teamMemberRepository.findWithUserByTeamId(p.getTeam().getId()).stream()
                .map(tm -> new ProjectListDto.Member(
                        tm.getUser() != null ? tm.getUser().getId() : null,
                        tm.getUser() != null
                                ? (tm.getUser().getName() != null ? tm.getUser().getName() : tm.getUser().getEmail())
                                : "이름없음",
                        tm.getUser() != null && tm.getUser().getRole() != null ? tm.getUser().getRole().name() : null
                )).toList();

        // 작업 요약
        List<Assignment> assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(p.getId());
        int total = assigns.size();
        int done = 0, ongo = 0, pend = 0;
        for (Assignment a : assigns) {
            AssignmentStatus st = a.getStatus();
            if (st == AssignmentStatus.COMPLETED) done++;
            else if (st == AssignmentStatus.ONGOING) ongo++;
            else pend++;
        }
        int progress = total == 0 ? 0 : (int) Math.round(done * 100.0 / total);

        List<ProjectDetailDto.TaskItem> taskItems = assigns.stream()
                .map(a -> new ProjectDetailDto.TaskItem(
                        a.getId(),
                        a.getTitle(),
                        mapStatus(a.getStatus()),
                        a.getDueDate() != null ? a.getDueDate().format(ISO) : null
                )).toList();

        // 일정
        LocalDateTime now = LocalDateTime.now();
        List<Event> events = eventRepository.findByProject_IdOrderByStartAtAsc(p.getId());
        List<ProjectDetailDto.EventItem> upcoming = events.stream()
                .filter(e -> e.getStartAt() != null && !e.getStartAt().isBefore(now))
                .map(e -> new ProjectDetailDto.EventItem(
                        e.getId(), e.getTitle(),
                        e.getType() != null ? e.getType().name() : "ETC",
                        e.getStartAt() != null ? e.getStartAt().format(ISO) : null,
                        e.getEndAt() != null ? e.getEndAt().format(ISO) : null,
                        e.getLocation()
                )).toList();

        // 마지막 활동 시간
        LocalDateTime luAssign = assigns.stream().map(Assignment::getDueDate).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime luEvent = events.stream().map(Event::getStartAt).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime latest = latestOf(luAssign, luEvent);
        if (latest == null) latest = (p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt());

        // 링크
        List<ProjectDetailDto.ResourceLink> links = new ArrayList<>();
        if (p.getRepoOwner() != null && p.getGithubRepo() != null) {
            String url = "https://github.com/" + p.getRepoOwner() + "/" + p.getGithubRepo();
            links.add(new ProjectDetailDto.ResourceLink("GitHub 저장소", url));
        }

        return new ProjectDetailDto(
                p.getId(),
                p.getTitle() != null ? p.getTitle() : ("프로젝트 #" + p.getId()),
                mapProjectStatus(p.getStatus()),
                new ProjectDetailDto.BasicTeam(
                        p.getTeam() != null ? p.getTeam().getId() : null,
                        p.getTeam() != null ? p.getTeam().getName() : "미지정 팀"
                ),
                (p.getProfessor() != null)
                        ? new ProjectDetailDto.BasicUser(p.getProfessor().getId(), p.getProfessor().getName(), p.getProfessor().getEmail())
                        : null,
                (p.getRepoOwner() != null || p.getGithubRepo() != null)
                        ? new ProjectDetailDto.RepoInfo(p.getRepoOwner(), p.getGithubRepo(),
                        (p.getRepoOwner() != null && p.getGithubRepo() != null)
                                ? "https://github.com/" + p.getRepoOwner() + "/" + p.getGithubRepo()
                                : null)
                        : null,
                p.getCreatedAt() != null ? p.getCreatedAt().format(ISO) : null,
                latest != null ? latest.format(ISO) : null,
                progress,
                new ProjectDetailDto.TaskSummary(total, done, ongo, pend),
                taskItems,
                upcoming,
                links
        );
    }

    /* ===== 깃허브 링크 업데이트 ===== */
    @Transactional
    public ProjectDetailDto updateGithubUrl(Long projectId, String githubUrl, UserAccount actor) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }

        // 권한 규칙:
        // - ADMIN/PROFESSOR: 제한 없이 허용
        // - STUDENT: 해당 프로젝트 팀 멤버일 때만 허용
        if (actor.getRole() == Role.STUDENT) {
            Project p0 = projectRepository.findByIdWithTeamAndProfessor(projectId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));
            boolean isMember = (p0.getTeam() != null)
                    && teamMemberRepository.existsByTeam_IdAndUser_Id(p0.getTeam().getId(), actor.getId());
            if (!isMember) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
            }
        }

        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));

        if (githubUrl == null || githubUrl.trim().isEmpty()) {
            // 링크 제거
            p.setRepoOwner(null);
            p.setGithubRepo(null);
        } else {
            String[] parsed = parseGithubOwnerRepo(githubUrl);
            String owner = parsed[0];
            String repo  = parsed[1];

            // 길이 제한: 엔티티 컬럼 길이에 맞춤
            if (owner.length() > 50 || repo.length() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_GITHUB_URL");
            }

            p.setRepoOwner(owner);
            p.setGithubRepo(repo);
        }

        projectRepository.flush(); // DB 반영
        return getProjectDetail(projectId, actor);
    }

    /* ===== 내부 유틸 ===== */

    /** GitHub URL/owner/repo 문자열을 owner/repo 튜플로 파싱 */
    private String[] parseGithubOwnerRepo(String raw) {
        String s = raw == null ? "" : raw.trim();
        if (s.startsWith("http://") || s.startsWith("https://")) {
            try {
                URI u = URI.create(s);
                String host = Optional.ofNullable(u.getHost()).orElse("");
                if (!host.equalsIgnoreCase("github.com") && !host.toLowerCase().endsWith(".github.com")) {
                    throw new IllegalArgumentException("not github host");
                }
                s = Optional.ofNullable(u.getPath()).orElse("");
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_GITHUB_URL");
            }
        }
        s = s.replaceAll("^/+", "").replaceAll("/+$", "");
        if (s.endsWith(".git")) s = s.substring(0, s.length() - 4);
        String[] parts = s.split("/");
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_GITHUB_URL");
        }
        String owner = parts[0], repo = parts[1];
        if (!owner.matches("[A-Za-z0-9-_.]+") || !repo.matches("[A-Za-z0-9-_.]+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_GITHUB_URL");
        }
        return new String[]{owner, repo};
    }

    /**
     * 교수 결정:
     *  - explicitProfessorId가 있으면 해당 사용자 조회(교수 역할 검증)
     *  - 없으면 팀 멤버 중 Role.PROFESSOR 1명 자동 선택
     *  - 없으면 null
     */
    private UserAccount resolveProfessorForTeam(Team team, Long explicitProfessorId) {
        if (explicitProfessorId != null) {
            UserAccount prof = userRepository.findById(explicitProfessorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "교수 계정을 찾을 수 없습니다."));
            if (prof.getRole() != Role.PROFESSOR) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PROFESSOR_ID_INVALID");
            }
            return prof;
        }
        // 팀 멤버 중 교수 자동 선택
        return teamMemberRepository.findWithUserByTeamId(team.getId()).stream()
                .map(TeamMember::getUser)
                .filter(Objects::nonNull)
                .filter(u -> u.getRole() == Role.PROFESSOR)
                .findFirst()
                .orElse(null);
    }

    /** 두 리스트를 프로젝트 ID 기준으로 합치되, 앞쪽 리스트의 순서를 보존 */
    private List<Project> unionById(List<Project> a, List<Project> b) {
        if ((a == null || a.isEmpty()) && (b == null || b.isEmpty())) return List.of();
        Map<Long, Project> map = new LinkedHashMap<>();
        if (a != null) for (Project p : a) map.put(p.getId(), p);
        if (b != null) for (Project p : b) map.putIfAbsent(p.getId(), p);
        return new ArrayList<>(map.values());
    }

    public ProjectListDto toListDto(Project p) {
        String teamName = (p.getTeam() != null && p.getTeam().getName() != null)
                ? p.getTeam().getName()
                : "미지정 팀";

        var members = (p.getTeam() == null)
                ? List.<ProjectListDto.Member>of()
                : teamMemberRepository.findWithUserByTeamId(p.getTeam().getId()).stream()
                .map(tm -> new ProjectListDto.Member(
                        tm.getUser() != null ? tm.getUser().getId() : null,
                        tm.getUser() != null ? (tm.getUser().getName() != null ? tm.getUser().getName() : tm.getUser().getEmail()) : "이름없음",
                        tm.getUser() != null && tm.getUser().getRole() != null ? tm.getUser().getRole().name() : null
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

        LocalDateTime luAssign = assigns.stream()
                .map(Assignment::getDueDate).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime luEvent = eventRepository.findByProject_IdOrderByStartAtAsc(p.getId()).stream()
                .map(Event::getStartAt).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime latest = latestOf(luAssign, luEvent);
        if (latest == null) latest = (p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt());
        String lastUpdate = (latest != null) ? latest.format(ISO) : null;

        return new ProjectListDto(
                p.getId(),
                p.getTitle() != null ? p.getTitle() : ("프로젝트 #" + p.getId()),
                null,
                mapProjectStatus(p.getStatus()),
                teamName,
                lastUpdate,
                progress,
                members,
                new ProjectListDto.Milestones(completed, total),
                (next == null ? null : new ProjectListDto.NextDeadline(next.getTitle(), next.getDueDate().format(ISO)))
        );
    }

    private String mapProjectStatus(Object raw) {
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

    private String mapStatus(Object raw) {
        if (raw == null) return "pending";
        String s = (raw instanceof Enum<?> e) ? e.name() : String.valueOf(raw);
        s = s.replace('_','-').toUpperCase();
        return switch (s) {
            case "COMPLETED", "DONE" -> "completed";
            case "ONGOING", "IN-PROGRESS", "INPROGRESS", "ACTIVE" -> "ongoing";
            default -> "pending";
        };
    }

    private static LocalDateTime latestOf(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }

    /* ===== Archive/Restore/Purge ===== */

    @Transactional
    public void archiveProject(Long projectId, UserAccount actor) {
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));
        checkArchivePermission(project, actor);
        if (Boolean.TRUE.equals(project.getArchived())) return;
        eventService.logSystemActivity("프로젝트 아카이브: " + project.getTitle() + " (처리자: " + actor.getName() + ")", project.getId());
        project.setArchived(true);
        projectRepository.save(project);
    }

    @Transactional
    public void restoreProject(Long projectId, UserAccount actor) {
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));
        checkArchivePermission(project, actor);
        if (!Boolean.TRUE.equals(project.getArchived())) return;
        eventService.logSystemActivity("프로젝트 복원: " + project.getTitle() + " (처리자: " + actor.getName() + ")", project.getId());
        project.setArchived(false);
        projectRepository.save(project);
    }

    @Transactional
    public void purgeProject(Long projectId, UserAccount actor) {
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));
        checkPurgePermission(project, actor);
        if (!Boolean.TRUE.equals(project.getArchived())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아카이브된 프로젝트만 영구 삭제할 수 있습니다.");
        }

        // 같은 트랜잭션에서 Project를 삭제할 것이므로, 해당 Project에 묶인 Event를 새로 쓰지 않는다.
        //    (FK/플러시 순서/지연 저장 이슈 예방) — 전역 로그로 남기되 projectId는 null
        eventService.logSystemActivity("프로젝트 영구 삭제: " + project.getTitle() + " (처리자: " + actor.getName() + ")", null);

        projectRepository.delete(project);
    }

    private void checkArchivePermission(Project project, UserAccount actor) {
        if (actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() == Role.PROFESSOR) {
            if (project.getProfessor() != null && project.getProfessor().getId().equals(actor.getId())) return;
        }
        if (project.getTeam() != null) {
            boolean isMember = teamMemberRepository.existsByTeam_IdAndUser_Id(project.getTeam().getId(), actor.getId());
            if (isMember) return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "프로젝트를 아카이브할 권한이 없습니다.");
    }

    private void checkPurgePermission(Project project, UserAccount actor) {
        if (actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() == Role.PROFESSOR) {
            if (project.getProfessor() != null && project.getProfessor().getId().equals(actor.getId())) return;
        }
        if (project.getTeam() != null) {
            boolean isMember = teamMemberRepository.existsByTeam_IdAndUser_Id(project.getTeam().getId(), actor.getId());
            if (isMember) return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "프로젝트를 영구 삭제할 권한이 없습니다.");
    }

    private String normalizeTitle(String t) {
        if (t == null || t.isBlank()) return "새 프로젝트";
        return t.trim();
    }
}
